import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  alertCircle, carSport, cash, checkmarkCircle, closeCircle, document, flag, locate, location,
  logOut, navigate, pause, people, person, play, pricetag, receipt, refresh, server, shieldCheckmark,
  speedometer, star, starOutline, time, trailSign,
} from 'ionicons/icons';

// Componente raíz: solo contiene <ion-app> y el <ion-router-outlet> donde se cargan las páginas.
// addIcons registra los íconos para que <ion-icon name="..."> no tenga que descargarlos.
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: false,
})
export class AppComponent {
  constructor() {
    addIcons({
      alertCircle, carSport, cash, checkmarkCircle, closeCircle, document, flag, locate, location,
      logOut, navigate, pause, people, person, play, pricetag, receipt, refresh, server, shieldCheckmark,
      speedometer, star, starOutline, time, trailSign,
    });
  }
}
