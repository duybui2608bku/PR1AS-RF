import { locationRepository } from "../../repositories/location/location.repository";
import { LocationSuggestionItem } from "../../types";
import { getLocaleFromHeader } from "../../utils/i18n";

const normalizeForSearch = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

class LocationService {
  async getLocationSuggestions(
    q: string,
    limit: number,
    acceptLanguage?: string
  ): Promise<LocationSuggestionItem[]> {
    const normalized = normalizeForSearch(q);
    const locale = getLocaleFromHeader(acceptLanguage) === "vi" ? "vi" : "en";
    return locationRepository.findSuggestions(normalized, limit, locale);
  }
}

export const locationService = new LocationService();
