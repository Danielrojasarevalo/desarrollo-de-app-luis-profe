import { Component, OnInit } from '@angular/core';
import { Pokemon, PokemonDraft } from './pokemon.model';
import { PokemonApiService } from './pokemon-api.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  pokemons: Pokemon[] = [];
  filteredPokemons: Pokemon[] = [];
  selectedPokemon: Pokemon | null = null;
  searchTerm = '';
  isFormOpen = false;
  isEditing = false;
  feedback = '';
  form: PokemonDraft = this.emptyDraft();

  constructor(private readonly pokemonApi: PokemonApiService) {}

  ngOnInit(): void {
    this.pokemonApi.getAll().subscribe((pokemons) => {
      this.pokemons = pokemons;
      this.filteredPokemons = pokemons;
      this.selectPokemon(pokemons[0]);
    });
  }

  filterPokemons(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredPokemons = this.pokemons.filter((pokemon) =>
      pokemon.name.toLowerCase().includes(term) || pokemon.type.toLowerCase().includes(term) || String(pokemon.id).includes(term),
    );
  }

  selectPokemon(pokemon: Pokemon): void {
    this.selectedPokemon = pokemon;
    this.isFormOpen = false;
  }

  openCreate(): void {
    this.isEditing = false;
    this.form = this.emptyDraft();
    this.isFormOpen = true;
    this.feedback = '';
  }

  openEdit(): void {
    if (!this.selectedPokemon) return;
    this.isEditing = true;
    this.form = { ...this.selectedPokemon };
    this.isFormOpen = true;
    this.feedback = '';
  }

  cancelForm(): void {
    this.isFormOpen = false;
  }

  savePokemon(): void {
    const request = this.isEditing && this.selectedPokemon
      ? this.pokemonApi.update(this.selectedPokemon.id, this.form)
      : this.pokemonApi.create(this.form);

    request.subscribe((pokemon) => {
      this.pokemons = this.isEditing
        ? this.pokemons.map((item) => item.id === pokemon.id ? pokemon : item)
        : [...this.pokemons, pokemon];
      this.selectedPokemon = pokemon;
      this.isFormOpen = false;
      this.filteredPokemons = this.pokemons;
      this.feedback = `${pokemon.name} se guardo correctamente.`;
    });
  }

  private emptyDraft(): PokemonDraft {
    return { name: '', type: 'Normal', secondaryType: '', height: 0.5, weight: 5, description: '', image: '' };
  }
}
