export interface Track {
  id: string;
  title: string;
  duration: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: string;
  price: number;
  gradient: string;
  coverAlt: string;
  tracks: Track[];
}

export declare const albums: Album[];
export declare const genres: string[];
