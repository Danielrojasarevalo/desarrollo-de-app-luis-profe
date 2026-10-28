import { Component } from '@angular/core';

/*
 * PIE DE PÁGINA CON LOS AUTORES
 * Se pone al final del <ion-content> de cada página (no como <ion-footer> fijo)
 * para que no le quite espacio al mapa ni a los botones: aparece al hacer scroll.
 */
@Component({
  selector: 'app-footer',
  templateUrl: './app-footer.component.html',
  styleUrls: ['./app-footer.component.scss'],
  standalone: false,
})
export class AppFooterComponent {
  readonly authors = ['Daniel Rojas Arevalo', 'Santiago Andres Losada Perdomo'];
  readonly year = new Date().getFullYear();
}
