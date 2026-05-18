import { reputationConfigRepository } from "../../repositories/reputation/reputation-config.repository";
import {
  IReputationConfigDocument,
  ReputationConfigKey,
  REPUTATION_CONFIG_DEFAULTS,
} from "../../types/reputation/reputation-config.types";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: number;
  expiresAt: number;
}

export class ReputationConfigService {
  private cache = new Map<ReputationConfigKey, CacheEntry>();

  private isCacheValid(entry: CacheEntry | undefined): boolean {
    return !!entry && entry.expiresAt > Date.now();
  }

  private setCacheEntry(key: ReputationConfigKey, value: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  invalidateCache(key?: ReputationConfigKey): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  async getValue(key: ReputationConfigKey): Promise<number> {
    const cached = this.cache.get(key);
    if (this.isCacheValid(cached)) {
      return cached!.value;
    }

    const doc = await reputationConfigRepository.findByKey(key);
    const value = doc?.value ?? REPUTATION_CONFIG_DEFAULTS[key].value;

    this.setCacheEntry(key, value);
    return value;
  }

  async getAllConfigs(): Promise<IReputationConfigDocument[]> {
    return reputationConfigRepository.findAll();
  }

  async updateConfig(
    key: ReputationConfigKey,
    value: number,
    adminId: string
  ): Promise<IReputationConfigDocument> {
    if (!Object.values(ReputationConfigKey).includes(key)) {
      throw AppError.badRequest(`Invalid reputation config key: ${key}`);
    }

    const updated = await reputationConfigRepository.upsert(key, value, adminId);
    this.invalidateCache(key);

    logger.info(`Reputation config updated: ${key} = ${value} by admin ${adminId}`);
    return updated;
  }

  async seedDefaults(): Promise<void> {
    await reputationConfigRepository.seedDefaults();
    logger.info("Reputation config defaults seeded");
  }
}

export const reputationConfigService = new ReputationConfigService();
