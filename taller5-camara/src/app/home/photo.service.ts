import { Injectable, computed, inject, signal } from '@angular/core';
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular/lazy';
import { UserPhoto } from './user-photo.model';

// Errores propios para que la pagina muestre un mensaje distinto segun lo que paso.
export class PhotoCancelledError extends Error {
  constructor() {
    super('El usuario cancelo la operacion');
  }
}

export class PermissionDeniedError extends Error {
  constructor(readonly permission: 'camera' | 'photos') {
    super(`Permiso denegado: ${permission}`);
  }
}

// Basado en la guia "Your First Ionic App: Angular" de la documentacion de Ionic.
@Injectable({ providedIn: 'root' })
export class PhotoService {
  private readonly PHOTO_STORAGE = 'photos';
  private readonly platform = inject(Platform);

  // Estado reactivo: solo el servicio escribe en _photos; los demas leen photos() y se actualizan solos.
  private readonly _photos = signal<UserPhoto[]>([]);
  readonly photos = this._photos.asReadonly();
  readonly favorites = computed(() => this._photos().filter((photo) => photo.favorite));

  async takePhoto(direction: CameraDirection = CameraDirection.Rear): Promise<UserPhoto> {
    await this.ensurePermission('camera');
    const capturedPhoto = await this.capture(() => Camera.getPhoto({
      // Uri (recomendado): devuelve la ruta del archivo en vez de cargar toda la imagen en memoria como Base64.
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      direction,
      quality: 90,
      allowEditing: false,
      correctOrientation: true,
    }));
    return this.addPhoto(capturedPhoto.path, capturedPhoto.webPath);
  }

  async chooseFromGallery(): Promise<UserPhoto[]> {
    await this.ensurePermission('photos');
    const { results } = await this.capture(() => Camera.chooseFromGallery({ allowMultipleSelection: true, quality: 90 }));
    if (!results.length) {
      throw new PhotoCancelledError();
    }
    const added: UserPhoto[] = [];
    for (const result of results) {
      added.push(await this.addPhoto(result.uri, result.webPath));
    }
    return added;
  }

  async loadSaved(): Promise<void> {
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    const photos = (value ? JSON.parse(value) : []) as UserPhoto[];

    // En web se lee cada archivo y se convierte a base64 para poder mostrarlo.
    if (!this.platform.is('hybrid')) {
      for (const photo of photos) {
        try {
          const readFile = await Filesystem.readFile({ path: photo.filepath, directory: Directory.Data });
          photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
        } catch {
          // Si un archivo ya no existe, esa foto queda sin imagen en vez de romper toda la galeria.
          photo.webviewPath = undefined;
        }
      }
    }
    this._photos.set(photos);
  }

  async deletePhoto(photo: UserPhoto): Promise<void> {
    this._photos.update((photos) => photos.filter((item) => item.filepath !== photo.filepath));
    await this.persist();
    const filename = photo.filepath.substring(photo.filepath.lastIndexOf('/') + 1);
    await Filesystem.deleteFile({ path: filename, directory: Directory.Data });
  }

  async toggleFavorite(photo: UserPhoto): Promise<void> {
    // Se crea un objeto nuevo en vez de modificar el existente para que el signal detecte el cambio.
    this._photos.update((photos) =>
      photos.map((item) => (item.filepath === photo.filepath ? { ...item, favorite: !item.favorite } : item)));
    await this.persist();
  }

  // checkPermissions consulta el estado; requestPermissions muestra el dialogo del sistema si aun no se ha pedido.
  private async ensurePermission(permission: 'camera' | 'photos'): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // En web la galeria usa un selector de archivos, que no necesita permiso.
      if (permission === 'camera') {
        await this.ensureWebCamera();
      }
      return;
    }
    let status = await Camera.checkPermissions();
    if (status[permission] === 'prompt' || status[permission] === 'prompt-with-rationale') {
      status = await Camera.requestPermissions({ permissions: [permission] });
    }
    if (status[permission] !== 'granted' && status[permission] !== 'limited') {
      throw new PermissionDeniedError(permission);
    }
  }

  // En el navegador, el modal de PWA Elements se queda cargando si no puede abrir la camara.
  // Por eso se pide acceso a la camara ANTES de abrirlo y se traduce cada error a un mensaje claro.
  private async ensureWebCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Este navegador no permite usar la camara. Abre la app en localhost o con https.');
    }
    try {
      const status = await Camera.checkPermissions();
      if (status.camera === 'denied') {
        throw new PermissionDeniedError('camera');
      }
    } catch (error) {
      if (error instanceof PermissionDeniedError) {
        throw error;
      }
      // Algunos navegadores (Firefox, Safari) no permiten consultar el permiso; se sigue con getUserMedia.
    }
    try {
      // Si el permiso esta en "preguntar", aqui el navegador muestra su dialogo.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      // Solo se queria comprobar el acceso: se apaga la camara para que el modal la pueda usar.
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new PermissionDeniedError('camera');
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        throw new Error('No se encontro ninguna camara en este equipo.');
      }
      if (name === 'NotReadableError' || name === 'AbortError') {
        throw new Error('La camara esta siendo usada por otra aplicacion o pestaña. Cierrala e intenta de nuevo.');
      }
      throw error;
    }
  }

  // Ejecuta la llamada al plugin y convierte el error de "cancelar" en PhotoCancelledError.
  private async capture<T>(action: () => Promise<T>): Promise<T> {
    try {
      if (Capacitor.isNativePlatform()) {
        return await action();
      }
      const failure = this.webCameraFailure();
      try {
        return await Promise.race([action(), failure.promise]);
      } finally {
        failure.stop();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/cancel/i.test(message)) {
        throw new PhotoCancelledError();
      }
      throw error;
    }
  }

  // Respaldo: si aun asi el modal no logra abrir la camara, emite "noDeviceError" y Capacitor nunca responde.
  // Esta promesa escucha ese evento, cierra el modal y falla, para que el boton no quede cargando para siempre.
  private webCameraFailure(): { promise: Promise<never>; stop: () => void } {
    const listener = new AbortController();
    const promise = new Promise<never>((_, reject) => {
      document.addEventListener('noDeviceError', () => {
        document.querySelector('pwa-camera-modal')?.remove();
        reject(new Error('No se pudo iniciar la camara del navegador.'));
      }, { once: true, signal: listener.signal });
    });
    // stop() quita el listener cuando la foto ya termino, para no dejarlo colgado.
    return { promise, stop: () => listener.abort() };
  }

  private async addPhoto(path: string | undefined, webPath: string | undefined): Promise<UserPhoto> {
    const savedImageFile = await this.savePicture(path, webPath);
    this._photos.update((photos) => [savedImageFile, ...photos]);
    await this.persist();
    return savedImageFile;
  }

  private async savePicture(path: string | undefined, webPath: string | undefined): Promise<UserPhoto> {
    const base64Data = await this.readAsBase64(path, webPath);
    const fileName = `${Date.now()}.jpeg`;
    const savedFile = await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Data });
    const createdAt = new Date().toISOString();

    if (this.platform.is('hybrid')) {
      // En dispositivo se usa la ruta nativa convertida a una URL que entiende el WebView.
      return { filepath: savedFile.uri, webviewPath: Capacitor.convertFileSrc(savedFile.uri), createdAt, favorite: false };
    }
    return { filepath: fileName, webviewPath: webPath, createdAt, favorite: false };
  }

  // Con CameraResultType.Uri el plugin entrega una ruta; aqui se lee ese archivo para copiarlo al almacenamiento de la app.
  private async readAsBase64(path: string | undefined, webPath: string | undefined): Promise<string> {
    if (this.platform.is('hybrid') && path) {
      const file = await Filesystem.readFile({ path });
      return file.data as string;
    }
    if (!webPath) {
      throw new Error('La camara no devolvio ninguna imagen');
    }
    const response = await fetch(webPath);
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
    const data = this._photos().map(({ filepath, createdAt, favorite, webviewPath }) =>
      ({ filepath, createdAt, favorite, webviewPath: this.platform.is('hybrid') ? webviewPath : undefined }));
    return Preferences.set({ key: this.PHOTO_STORAGE, value: JSON.stringify(data) });
  }
}
