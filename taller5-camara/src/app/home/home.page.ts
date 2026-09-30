import { Component, OnInit } from '@angular/core';
import { CameraDirection } from '@capacitor/camera';
import { ActionSheetController, ToastController } from '@ionic/angular/lazy';
import { PhotoService } from './photo.service';
import { UserPhoto } from './user-photo.model';

type Filter = 'todas' | 'favoritas';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  filter: Filter = 'todas';
  useFrontCamera = false;
  isBusy = false;
  selectedPhoto: UserPhoto | null = null;

  constructor(
    readonly photoService: PhotoService,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly toastCtrl: ToastController,
  ) {}

  get visiblePhotos(): UserPhoto[] {
    const photos = this.photoService.photos;
    return this.filter === 'favoritas' ? photos.filter((photo) => photo.favorite) : photos;
  }

  get favoritesCount(): number {
    return this.photoService.photos.filter((photo) => photo.favorite).length;
  }

  get lastPhoto(): UserPhoto | undefined {
    return this.photoService.photos[0];
  }

  async ngOnInit(): Promise<void> {
    await this.photoService.loadSaved();
  }

  async takePhoto(): Promise<void> {
    const direction = this.useFrontCamera ? CameraDirection.Front : CameraDirection.Rear;
    await this.run(() => this.photoService.takePhoto(direction), 'Foto guardada en tu galeria');
  }

  async chooseFromGallery(): Promise<void> {
    await this.run(() => this.photoService.chooseFromGallery(), 'Fotos importadas');
  }

  toggleCamera(): void {
    this.useFrontCamera = !this.useFrontCamera;
  }

  openPhoto(photo: UserPhoto): void {
    this.selectedPhoto = photo;
  }

  closePhoto(): void {
    this.selectedPhoto = null;
  }

  async toggleFavorite(photo: UserPhoto): Promise<void> {
    await this.photoService.toggleFavorite(photo);
  }

  async showActions(photo: UserPhoto): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Opciones de la foto',
      buttons: [
        { text: photo.favorite ? 'Quitar de favoritas' : 'Marcar como favorita', icon: 'heart', handler: () => { this.toggleFavorite(photo); } },
        { text: 'Eliminar', role: 'destructive', icon: 'trash', handler: () => { this.deletePhoto(photo); } },
        { text: 'Cancelar', role: 'cancel', icon: 'close' },
      ],
    });
    await actionSheet.present();
  }

  async deletePhoto(photo: UserPhoto): Promise<void> {
    this.selectedPhoto = null;
    await this.photoService.deletePhoto(photo);
    await this.showToast('Foto eliminada', 'medium');
  }

  private async run(action: () => Promise<unknown>, successMessage: string): Promise<void> {
    this.isBusy = true;
    try {
      await action();
      await this.showToast(successMessage, 'success');
    } catch (error) {
      // Cerrar la camara sin tomar foto tambien lanza error; solo se avisa si es otro problema.
      const message = error instanceof Error ? error.message : String(error);
      if (!/cancel/i.test(message)) {
        await this.showToast('No se pudo acceder a la camara', 'danger');
      }
    } finally {
      this.isBusy = false;
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, color, duration: 1800, position: 'top' });
    await toast.present();
  }
}
