import { Injectable, signal } from '@angular/core';

import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'uber.apiUrl';

/*
 * URL BASE DE LA API
 * El backend Laravel corre en http://IP_Servidor:8000/api y la IP cambia según
 * el computador del salón. Por eso la URL se puede editar desde el login y se
 * guarda en localStorage; si no hay nada guardado se usa la del environment.
 */
@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  readonly baseUrl = signal(readStored() ?? environment.apiUrl);

  setBaseUrl(url: string): void {
    const clean = url.trim().replace(/\/+$/, '');
    this.baseUrl.set(clean || environment.apiUrl);
    try {
      localStorage.setItem(STORAGE_KEY, this.baseUrl());
    } catch {
      // Sin localStorage (modo privado) la URL solo dura esta sesión.
    }
  }

  url(path: string): string {
    return `${this.baseUrl()}${path}`;
  }
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
