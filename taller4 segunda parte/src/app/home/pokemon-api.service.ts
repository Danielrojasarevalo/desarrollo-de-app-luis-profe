import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Pokemon, PokemonDraft } from './pokemon.model';

@Injectable({ providedIn: 'root' })
export class PokemonApiService {
  private pokemons: Pokemon[] = [
    {
      id: 1,
      name: 'Bulbasaur',
      type: 'Planta',
      secondaryType: 'Veneno',
      height: 0.7,
      weight: 6.9,
      description: 'Una semilla extraña fue plantada en su espalda al nacer.',
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
    },
    {
      id: 4,
      name: 'Charmander',
      type: 'Fuego',
      height: 0.6,
      weight: 8.5,
      description: 'La llama de su cola indica su estado de salud y sus emociones.',
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
    },
    {
      id: 7,
      name: 'Squirtle',
      type: 'Agua',
      height: 0.5,
      weight: 9,
      description: 'Se protege con su caparazon y lanza potentes chorros de agua.',
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
    },
    {
      id: 25,
      name: 'Pikachu',
      type: 'Electrico',
      height: 0.4,
      weight: 6,
      description: 'Almacena electricidad en las bolsas de sus mejillas.',
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    },
    {
      id: 39,
      name: 'Jigglypuff',
      type: 'Hada',
      secondaryType: 'Normal',
      height: 0.5,
      weight: 5.5,
      description: 'Su canto melodioso puede dormir a cualquiera que lo escuche.',
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png',
    },
    {
      id: 94,
      name: 'Gengar',
      type: 'Fantasma',
      secondaryType: 'Veneno',
      height: 1.5,
      weight: 40.5,
      description: 'Se esconde en la oscuridad y disfruta asustando a las personas.',
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png',
    },
  ];

  getAll(): Observable<Pokemon[]> {
    return of([...this.pokemons]);
  }

  create(draft: PokemonDraft): Observable<Pokemon> {
    const pokemon: Pokemon = {
      ...draft,
      id: Math.max(...this.pokemons.map((item) => item.id), 0) + 1,
      image: draft.image || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/132.png',
    };
    this.pokemons = [...this.pokemons, pokemon];
    return of(pokemon);
  }

  update(id: number, draft: PokemonDraft): Observable<Pokemon> {
    const current = this.pokemons.find((item) => item.id === id);
    if (!current) {
      throw new Error('Pokemon no encontrado');
    }

    const updated = { ...current, ...draft, image: draft.image || current.image };
    this.pokemons = this.pokemons.map((item) => item.id === id ? updated : item);
    return of(updated);
  }
}
