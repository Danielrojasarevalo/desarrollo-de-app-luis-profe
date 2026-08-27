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

export interface ApiUser {
  id: number;
  firstName: string;
  lastName: string;
  company: { name: string };
}

interface UsersResponse {
  users: ApiUser[];
}

interface CategoriesResponse {
  categories: string[];
}

export interface RickCharacter {
  id: number;
  name: string;
  status: string;
  species: string;
  image: string;
}

interface RickCharactersResponse {
  results: RickCharacter[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly productsUrl = 'https://dummyjson.com/products/category/groceries?limit=3';
  private readonly quoteUrl = 'https://dummyjson.com/quotes/random';
  private readonly categoriesUrl = 'https://dummyjson.com/products/categories';
  private readonly usersUrl = 'https://dummyjson.com/users?limit=3';
  private readonly rickCharactersUrl = 'https://rickandmortyapi.com/api/character';

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

  getCategories() {
    return this.http.get<CategoriesResponse>(this.categoriesUrl).pipe(
      map((response) => response.categories),
      catchError(() => of(['Groceries', 'Beauty', 'Fragrances', 'Furniture']))
    );
  }

  getUsers() {
    return this.http.get<UsersResponse>(this.usersUrl).pipe(
      map((response) => response.users),
      catchError(() =>
        of([
          { id: 1, firstName: 'Laura', lastName: 'Gómez', company: { name: 'Finca La Esperanza' } },
          { id: 2, firstName: 'Carlos', lastName: 'Rojas', company: { name: 'Café del Valle' } },
          { id: 3, firstName: 'Mariana', lastName: 'Díaz', company: { name: 'Tostadores Unidos' } }
        ])
      )
    );
  }

  getRickCharacters() {
    const fallback: RickCharacter[] = [
      {
        id: 1,
        name: 'Rick Sanchez',
        status: 'Alive',
        species: 'Human',
        image: 'https://rickandmortyapi.com/api/character/avatar/1.jpeg'
      },
      {
        id: 2,
        name: 'Morty Smith',
        status: 'Alive',
        species: 'Human',
        image: 'https://rickandmortyapi.com/api/character/avatar/2.jpeg'
      },
      {
        id: 3,
        name: 'Summer Smith',
        status: 'Alive',
        species: 'Human',
        image: 'https://rickandmortyapi.com/api/character/avatar/3.jpeg'
      }
    ];

    return this.http.get<RickCharactersResponse>(this.rickCharactersUrl).pipe(
      map((response) => response.results.slice(0, 3)),
      catchError(() => of(fallback))
    );
  }
}