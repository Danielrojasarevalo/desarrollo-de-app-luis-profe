import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/lazy';
import { Observable } from 'rxjs';

import { TEST_ACCOUNTS, TestAccount } from '../../core/data/places';
import { RegisterRequest, User } from '../../core/models/api.models';
import { ApiConfigService } from '../../core/services/api-config.service';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/utils/format';

type Tab = 'login' | 'register';

/*
 * PÁGINA DE ACCESO (/login)
 *  - Iniciar sesión con correo o teléfono ........... POST /auth/login
 *  - Registrarse como cliente o conductor ............ POST /auth/register
 *  - ¿Olvidaste tu contraseña? ....................... POST /auth/forgot-password
 *  - Ingreso rápido por rol (cuentas de prueba) ....... igual que en el video
 *  - URL del servidor editable (IP del backend Laravel)
 * Al entrar, cada rol se envía a su pantalla (/client, /driver o /admin).
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  private readonly alerts = inject(AlertController);
  readonly apiConfig = inject(ApiConfigService);

  readonly accounts = TEST_ACCOUNTS;
  readonly tab = signal<Tab>('login');
  readonly loading = signal(false);
  readonly showServer = signal(false);

  // Formulario de inicio de sesión
  credentials = { login: '', password: '' };

  // Formulario de registro (los campos de vehículo solo se envían si role = driver)
  form: RegisterRequest = emptyRegister();

  serverUrl = this.apiConfig.baseUrl();

  setTab(value: unknown): void {
    this.tab.set(value === 'register' ? 'register' : 'login');
  }

  submitLogin(): void {
    if (!this.credentials.login || !this.credentials.password) {
      this.notify('Escribe tu correo/teléfono y la contraseña.', 'warning');
      return;
    }
    this.run(this.auth.login(this.credentials), 'Inicio de sesión exitoso');
  }

  submitRegister(): void {
    const f = this.form;
    if (!f.name || !f.email || !f.phone || !f.password) {
      this.notify('Completa nombre, correo, teléfono y contraseña.', 'warning');
      return;
    }
    if (f.password.length < 8) {
      this.notify('La contraseña debe tener al menos 8 caracteres.', 'warning');
      return;
    }
    if (f.role === 'driver' && (!f.license_number || !f.plate || !f.brand || !f.model)) {
      this.notify('Como conductor debes registrar licencia y vehículo.', 'warning');
      return;
    }
    this.run(this.auth.register(cleanRegister(f)), 'Usuario registrado exitosamente');
  }

  // "Cargar": solo llena el formulario. "Entrar": llena y envía.
  loadAccount(account: TestAccount, enter = false): void {
    this.tab.set('login');
    this.credentials = { login: account.login, password: account.password };
    if (enter) {
      this.submitLogin();
    }
  }

  async forgotPassword(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Restablecer contraseña',
      message: 'Escribe tu correo y la nueva contraseña.',
      inputs: [
        { name: 'email', type: 'email', placeholder: 'correo@ejemplo.com', value: this.credentials.login },
        { name: 'password', type: 'password', placeholder: 'Nueva contraseña (mín. 8)' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Restablecer',
          handler: (data: { email: string; password: string }) => {
            if (!data.email || !data.password || data.password.length < 8) {
              this.notify('Correo y contraseña de mínimo 8 caracteres.', 'warning');
              return false;
            }
            this.auth.forgotPassword(data.email, data.password).subscribe({
              next: (res) => this.notify(res.message, 'success'),
              error: (err) => this.notify(apiErrorMessage(err), 'danger'),
            });
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  saveServer(): void {
    this.apiConfig.setBaseUrl(this.serverUrl);
    this.serverUrl = this.apiConfig.baseUrl();
    this.notify(`Servidor: ${this.serverUrl}`, 'success');
  }

  private run(request: Observable<User>, okMessage: string): void {
    this.loading.set(true);
    request.subscribe({
      next: (user) => {
        this.loading.set(false);
        this.notify(okMessage, 'success');
        this.form = emptyRegister();
        this.router.navigateByUrl(this.auth.homeFor(user.role), { replaceUrl: true });
      },
      error: (err) => {
        this.loading.set(false);
        this.notify(apiErrorMessage(err), 'danger');
      },
    });
  }

  private async notify(message: string, color: string): Promise<void> {
    const t = await this.toast.create({ message, color, duration: 2600, position: 'top' });
    await t.present();
  }
}

function emptyRegister(): RegisterRequest {
  return {
    name: '', email: '', phone: '', password: '', role: 'client',
    license_number: '', plate: '', brand: '', model: '', year: new Date().getFullYear(), capacity: 4, color: '',
  };
}

// Un cliente no debe mandar campos de vehículo vacíos (Laravel los validaría).
function cleanRegister(f: RegisterRequest): RegisterRequest {
  const base = { name: f.name, email: f.email, phone: f.phone, password: f.password, role: f.role };
  if (f.role === 'client') {
    return base;
  }
  return {
    ...base,
    license_number: f.license_number,
    plate: f.plate?.toUpperCase(),
    brand: f.brand,
    model: f.model,
    year: Number(f.year),
    capacity: Number(f.capacity),
    color: f.color,
  };
}
