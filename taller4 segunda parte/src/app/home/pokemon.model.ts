export interface Pokemon {
  id: number;
  name: string;
  type: string;
  secondaryType?: string;
  height: number;
  weight: number;
  description: string;
  image: string;
}

export type PokemonDraft = Omit<Pokemon, 'id' | 'image'> & {
  image?: string;
};
