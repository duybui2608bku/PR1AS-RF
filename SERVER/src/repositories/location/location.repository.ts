import { Location } from "../../models/location/location.model";
import {
  ILocationDocument,
  LocationLocalizedName,
  LocationSuggestionItem,
  LocationType,
} from "../../types";

export interface UpsertLocationPayload {
  name: LocationLocalizedName;
  slug_vi: string;
  slug_en: string;
  type: LocationType;
  country_code: string;
  admin_level_1: string;
  admin_level_2?: string | null;
  admin_level_3?: string | null;
  lat: number;
  lng: number;
  is_active?: boolean;
  priority?: number;
}

class LocationRepository {
  async findSuggestions(
    q: string,
    limit: number,
    locale: "vi" | "en",
    adminLevel1: string = "TP.HCM"
  ): Promise<LocationSuggestionItem[]> {
    const normalized = q.trim().toLowerCase();
    const tokens = normalized
      .split(/[^a-z0-9]+/g)
      .map((token) => token.trim())
      .filter(Boolean);
    const escapedTokens = tokens.map((token) =>
      token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const regex = new RegExp(escapedTokens.join(".*"), "i");

    const suggestions = await Location.find({
      is_active: true,
      admin_level_1: adminLevel1,
      $or: [
        { "name.vi": regex },
        { "name.en": regex },
        { slug_vi: regex },
        { slug_en: regex },
      ],
    })
      .select("name lat lng priority")
      .sort({ priority: -1, "name.vi": 1 })
      .limit(limit)
      .lean();

    return suggestions.map((item) => ({
      name: locale === "vi" ? item.name.vi : item.name.en,
      names: item.name,
      lat: item.lat,
      lng: item.lng,
    }));
  }

  async upsertMany(payloads: UpsertLocationPayload[]): Promise<number> {
    if (!payloads.length) {
      return 0;
    }

    const now = new Date();
    const operations: Parameters<typeof Location.bulkWrite>[0] = payloads.map(
      (item) => ({
        updateOne: {
          filter: {
            slug_vi: item.slug_vi,
            admin_level_1: item.admin_level_1,
            type: item.type,
          },
          update: {
            $set: {
              name: item.name,
              slug_vi: item.slug_vi,
              slug_en: item.slug_en,
              type: item.type,
              country_code: item.country_code,
              admin_level_1: item.admin_level_1,
              admin_level_2: item.admin_level_2 ?? null,
              admin_level_3: item.admin_level_3 ?? null,
              lat: item.lat,
              lng: item.lng,
              is_active: item.is_active ?? true,
              priority: item.priority ?? 0,
              updated_at: now,
            },
            $setOnInsert: {
              created_at: now,
            },
          },
          upsert: true,
        },
      })
    );

    const result = await Location.bulkWrite(operations, { ordered: false });
    return result.upsertedCount + result.modifiedCount;
  }

  async countByAdminLevel(adminLevel1: string = "TP.HCM"): Promise<number> {
    return Location.countDocuments({
      admin_level_1: adminLevel1,
      is_active: true,
    });
  }

  async getBySlug(
    slug: string,
    adminLevel1: string,
    type: LocationType
  ): Promise<ILocationDocument | null> {
    return Location.findOne({
      $or: [{ slug_vi: slug }, { slug_en: slug }],
      admin_level_1: adminLevel1,
      type,
    });
  }
}

export const locationRepository = new LocationRepository();
