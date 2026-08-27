import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiProduct, ApiService, ApiUser, RickCharacter } from './api.service';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly apiService = inject(ApiService);
  menuOpen = false;
  favorites = [false, false, false];
  apiProducts: ApiProduct[] = [];
  apiQuote = 'Cada taza cuenta una historia.';
  apiQuoteAuthor = 'Cafés de Origen';
  apiLoading = true;
  apiCategories: string[] = [];
  apiUsers: ApiUser[] = [];
  rickCharacters: RickCharacter[] = [];

  ngOnInit(): void {
    this.apiService.getProducts().subscribe((products) => {
      this.apiProducts = products;
      this.apiLoading = false;
    });

    this.apiService.getQuote().subscribe((quote) => {
      this.apiQuote = quote.quote;
      this.apiQuoteAuthor = quote.author;
    });

    this.apiService.getCategories().subscribe((categories) => {
      this.apiCategories = categories.slice(0, 4);
    });

    this.apiService.getUsers().subscribe((users) => {
      this.apiUsers = users;
    });

    this.apiService.getRickCharacters().subscribe((characters) => {
      this.rickCharacters = characters;
    });
  }

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
