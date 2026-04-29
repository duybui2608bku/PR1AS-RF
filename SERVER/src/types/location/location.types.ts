import { Document } from "mongoose";

export enum LocationType {
  CITY = "city",
  DISTRICT = "district",
  WARD = "ward",
  POI = "poi",
}

export interface LocationLocalizedName {
  vi: string;
  en: string;
}

export interface ILocationDocument extends Document {
  name: LocationLocalizedName;
  slug_vi: string;
  slug_en: string;
  type: LocationType;
  country_code: string;
  admin_level_1: string;
  admin_level_2: string | null;
  admin_level_3: string | null;
  lat: number;
  lng: number;
  is_active: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

export interface LocationSuggestionItem {
  name: string;
  names: LocationLocalizedName;
  lat: number;
  lng: number;
}

export interface LocationSuggestionQuery {
  q: string;
  limit: number;
}
