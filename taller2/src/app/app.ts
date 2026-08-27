import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  menuOpen = false;
  favorites = [false, false, false];

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  toggleFavorite(index: number): void {
    this.favorites[index] = !this.favorites[index];
  }

  buyCoffee(name: string): void {
    window.alert(`${name} agregado a tu pedido.`);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
