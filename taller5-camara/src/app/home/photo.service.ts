import { Injectable } from '@angular/core';
import { Camera, CameraDirection, MediaResult } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular/lazy';
import { UserPhoto } from './user-photo.model';

// Basado en la guia "Your First Ionic App: Angular" de la documentacion de Ionic.
@Injectable({ providedIn: 'root' })
export class PhotoService {
  photos: UserPhoto[] = [];

  private readonly PHOTO_STORAGE = 'photos';

  constructor(private readonly platform: Platform) {}

  async takePhoto(direction: CameraDirection = CameraDirection.Rear): Promise<UserPhoto> {
    const capturedPhoto = await Camera.takePhoto({ quality: 90, cameraDirection: direction });
    return this.addPhoto(capturedPhoto);
  }

  async chooseFromGallery(): Promise<UserPhoto[]> {
    const { results } = await Camera.chooseFromGallery({ allowMultipleSelection: true, quality: 90 });
    const added: UserPhoto[] = [];
    for (const result of results) {
      added.push(await this.addPhoto(result));
    }
    return added;
  }

  async loadSaved(): Promise<void> {
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = (value ? JSON.parse(value) : []) as UserPhoto[];

    // En web se lee cada archivo y se convierte a base64 para poder mostrarlo.
    if (!this.platform.is('hybrid')) {
      for (const photo of this.photos) {
        const readFile = await Filesystem.readFile({ path: photo.filepath, directory: Directory.Data });
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }

  async deletePhoto(photo: UserPhoto): Promise<void> {
    this.photos = this.photos.filter((item) => item.filepath !== photo.filepath);
    await this.persist();
    const filename = photo.filepath.substring(photo.filepath.lastIndexOf('/') + 1);
    await Filesystem.deleteFile({ path: filename, directory: Directory.Data });
  }

  async toggleFavorite(photo: UserPhoto): Promise<void> {
    photo.favorite = !photo.favorite;
    await this.persist();
  }

  private async addPhoto(media: MediaResult): Promise<UserPhoto> {
    const savedImageFile = await this.savePicture(media);
    this.photos.unshift(savedImageFile);
    await this.persist();
    return savedImageFile;
  }

  private async savePicture(media: MediaResult): Promise<UserPhoto> {
    const base64Data = await this.readAsBase64(media);
    const fileName = `${Date.now()}.jpeg`;
    const savedFile = await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Data });
    const createdAt = new Date().toISOString();

    if (this.platform.is('hybrid')) {
      // En dispositivo se usa la ruta nativa convertida a una URL que entiende el WebView.
      return { filepath: savedFile.uri, webviewPath: Capacitor.convertFileSrc(savedFile.uri), createdAt, favorite: false };
    }
    return { filepath: fileName, webviewPath: media.webPath, createdAt, favorite: false };
  }

  private async readAsBase64(media: MediaResult): Promise<string> {
    if (this.platform.is('hybrid') && media.uri) {
      const file = await Filesystem.readFile({ path: media.uri });
      return file.data as string;
    }
    const response = await fetch(media.webPath!);
    const blob = await response.blob();
    return this.convertBlobToBase64(blob);
  }

  private convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }

  private persist(): Promise<void> {
    // Solo se guardan los metadatos; en web la imagen se reconstruye desde Filesystem.
    const data = this.photos.map(({ filepath, createdAt, favorite, webviewPath }) =>
      ({ filepath, createdAt, favorite, webviewPath: this.platform.is('hybrid') ? webviewPath : undefined }));
    return Preferences.set({ key: this.PHOTO_STORAGE, value: JSON.stringify(data) });
  }
}
