import { create } from "zustand";

interface SearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;

  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  setIsSearching: (isSearching: boolean) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  results: [],
  isSearching: false,

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setIsSearching: (isSearching) => set({ isSearching }),
}));
