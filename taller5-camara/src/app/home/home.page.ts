import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular/lazy';
import { PermissionDeniedError, PhotoCancelledError, PhotoService } from './photo.service';
import { UserPhoto } from './user-photo.model';

type Filter = 'todas' | 'favoritas';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  readonly photoService = inject(PhotoService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  // Estado de la pantalla con signals: al cambiar un valor, la vista se actualiza sola.
  readonly filter = signal<Filter>('todas');
  readonly useFrontCamera = signal(false);
  readonly isBusy = signal(false);
  readonly isLoading = signal(true);
  // Se guarda la ruta y no el objeto, para que el visor siempre muestre la version actual de la foto.
  private readonly selectedPath = signal<string | null>(null);

  // computed: valores derivados que se recalculan cuando cambian los signals que leen.
  readonly visiblePhotos = computed(() =>
    this.filter() === 'favoritas' ? this.photoService.favorites() : this.photoService.photos());
  readonly favoritesCount = computed(() => this.photoService.favorites().length);
  readonly lastPhoto = computed<UserPhoto | undefined>(() => this.photoService.photos()[0]);
  readonly selectedPhoto = computed(() =>
    this.photoService.photos().find((photo) => photo.filepath === this.selectedPath()) ?? null);

  async ngOnInit(): Promise<void> {
    try {
      await this.photoService.loadSaved();
    } catch (error) {
      await this.showError('No se pudo cargar la galeria', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async takePhoto(): Promise<void> {
    const direction = this.useFrontCamera() ? CameraDirection.Front : CameraDirection.Rear;
    await this.run(() => this.photoService.takePhoto(direction), 'Foto guardada en tu galeria');
  }

  async chooseFromGallery(): Promise<void> {
    await this.run(() => this.photoService.chooseFromGallery(), 'Fotos importadas');
  }

  setFilter(value: unknown): void {
    this.filter.set(value === 'favoritas' ? 'favoritas' : 'todas');
  }

  toggleCamera(): void {
    this.useFrontCamera.update((front) => !front);
  }

  openPhoto(photo: UserPhoto): void {
    this.selectedPath.set(photo.filepath);
  }

  closePhoto(): void {
    this.selectedPath.set(null);
  }

  async toggleFavorite(photo: UserPhoto): Promise<void> {
    try {
      await this.photoService.toggleFavorite(photo);
    } catch (error) {
      await this.showError('No se pudo actualizar la foto', error);
    }
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
    this.closePhoto();
    try {
      await this.photoService.deletePhoto(photo);
      await this.showToast('Foto eliminada', 'medium', 'trash-outline');
    } catch (error) {
      await this.showError('No se pudo eliminar la foto', error);
    }
  }

  // Centraliza el estado "ocupado" y el manejo de excepciones de la camara y la galeria.
  private async run(action: () => Promise<unknown>, successMessage: string): Promise<void> {
    this.isBusy.set(true);
    try {
      await action();
      await this.showToast(successMessage, 'success', 'checkmark-circle');
    } catch (error) {
      if (error instanceof PhotoCancelledError) {
        await this.showToast('Cancelaste la captura: no se guardo ninguna foto', 'warning', 'alert-circle');
      } else if (error instanceof PermissionDeniedError) {
        await this.showPermissionAlert(error.permission);
      } else {
        // Los errores del servicio ya traen un mensaje en espanol que explica la causa.
        await this.showError(error instanceof Error ? error.message : 'No se pudo acceder a la camara', error);
      }
    } finally {
      this.isBusy.set(false);
    }
  }

  private async showPermissionAlert(permission: 'camera' | 'photos'): Promise<void> {
    const what = permission === 'camera' ? 'usar la camara' : 'ver tus fotos';
    // En el celular el permiso se cambia en Ajustes; en el navegador, en el candado de la barra de direcciones.
    const where = Capacitor.isNativePlatform()
      ? 'Activalo en Ajustes > Aplicaciones > Lente > Permisos.'
      : 'Toca el candado junto a la direccion de la pagina, permite la camara y recarga.';
    const alert = await this.alertCtrl.create({
      header: 'Permiso necesario',
      message: `Lente no tiene permiso para ${what}. ${where}`,
      buttons: ['Entendido'],
    });
    await alert.present();
  }

  private async showError(message: string, error: unknown): Promise<void> {
    console.error(message, error);
    await this.showToast(message, 'danger', 'close-circle');
  }

  private async showToast(message: string, color: string, icon: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, color, icon, duration: 2200, position: 'top' });
    await toast.present();
  }
}
