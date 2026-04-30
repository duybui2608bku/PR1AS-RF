export interface LocationSuggestion {
  name: string;
  names?: {
    vi?: string;
    en?: string;
  };
  lat: number;
  lng: number;
}

