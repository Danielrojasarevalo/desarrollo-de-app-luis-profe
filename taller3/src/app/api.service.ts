import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';

export interface ApiProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
}

interface ProductsResponse {
  products: ApiProduct[];
}

interface QuoteResponse {
  quote: string;
  author: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly productsUrl = 'https://dummyjson.com/products/category/groceries?limit=3';
  private readonly quoteUrl = 'https://dummyjson.com/quotes/random';

  getProducts() {
    const fallback: ApiProduct[] = [
      {
        id: 1,
        title: 'Selección de finca',
        description: 'Granos seleccionados para disfrutar en casa.',
        price: 18.5,
        thumbnail: '/assets/images/WhatsApp Image 2026-08-11 at 12.06.06 PM.jpeg'
      },
      {
        id: 2,
        title: 'Café de temporada',
        description: 'Una experiencia de origen con notas únicas.',
        price: 22,
        thumbnail: '/assets/images/WhatsApp Image 2026-08-11 at 12.06.10 PM.jpeg'
      },
      {
        id: 3,
        title: 'Reserva especial',
        description: 'Perfil equilibrado para los paladares curiosos.',
        price: 28.5,
        thumbnail: '/assets/images/WhatsApp Image 2026-08-11 at 12.06.15 PM.jpeg'
      }
    ];

    return this.http.get<ProductsResponse>(this.productsUrl).pipe(
      map((response) => response.products),
      catchError(() => of(fallback))
    );
  }

  getQuote() {
    return this.http.get<QuoteResponse>(this.quoteUrl).pipe(
      catchError(() => of({ quote: 'Cada taza cuenta una historia.', author: 'Cafés de Origen' }))
    );
  }
}