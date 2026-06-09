import { reputationConfigRepository } from "../../repositories/reputation/reputation-config.repository";
import {
  IReputationConfigDocument,
  ReputationConfigKey,
  REPUTATION_CONFIG_DEFAULTS,
  TOGGLEABLE_REPUTATION_KEYS,
} from "../../types/reputation/reputation-config.types";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: number;
  active: boolean;
  expiresAt: number;
}

export class ReputationConfigService {
  private cache = new Map<ReputationConfigKey, CacheEntry>();

  private isCacheValid(entry: CacheEntry | undefined): boolean {
    return !!entry && entry.expiresAt > Date.now();
  }

  private setCacheEntry(
    key: ReputationConfigKey,
    value: number,
    active: boolean
  ): void {
    this.cache.set(key, { value, active, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  private async loadEntry(key: ReputationConfigKey): Promise<CacheEntry> {
    const cached = this.cache.get(key);
    if (this.isCacheValid(cached)) {
      return cached!;
    }

    const doc = await reputationConfigRepository.findByKey(key);
    const value = doc?.value ?? REPUTATION_CONFIG_DEFAULTS[key].value;
    // Legacy docs persisted before the `active` flag won't have the field;
    // treat anything other than an explicit `false` as active.
    const active = doc?.active !== false;

    this.setCacheEntry(key, value, active);
    return { value, active, expiresAt: Date.now() + CACHE_TTL_MS };
  }

  invalidateCache(key?: ReputationConfigKey): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  async getValue(key: ReputationConfigKey): Promise<number> {
    return (await this.loadEntry(key)).value;
  }

  async isActive(key: ReputationConfigKey): Promise<boolean> {
    return (await this.loadEntry(key)).active;
  }

  /**
   * Returns the configured point value, or `null` when the rule is disabled.
   * Callers should skip the deduction/recovery when this resolves to `null`.
   */
  async getActiveValue(key: ReputationConfigKey): Promise<number | null> {
    const entry = await this.loadEntry(key);
    return entry.active ? entry.value : null;
  }

  async getAllConfigs(): Promise<IReputationConfigDocument[]> {
    return reputationConfigRepository.findAll();
  }

  async updateConfig(
    key: ReputationConfigKey,
    changes: { value?: number; active?: boolean },
    adminId: string
  ): Promise<IReputationConfigDocument> {
    if (!Object.values(ReputationConfigKey).includes(key)) {
      throw AppError.badRequest(`Invalid reputation config key: ${key}`);
    }
    if (changes.value === undefined && changes.active === undefined) {
      throw AppError.badRequest("Nothing to update: provide value and/or active");
    }
    if (changes.active !== undefined && !TOGGLEABLE_REPUTATION_KEYS.has(key)) {
      throw AppError.badRequest(
        `Reputation config "${key}" cannot be toggled on/off`
      );
    }

    const updated = await reputationConfigRepository.upsert(key, changes, adminId);
    this.invalidateCache(key);

    logger.info(
      `Reputation config updated: ${key} = ${JSON.stringify(changes)} by admin ${adminId}`
    );
    return updated;
  }

  async seedDefaults(): Promise<void> {
    await reputationConfigRepository.seedDefaults();
    logger.info("Reputation config defaults seeded");
  }
}

export const reputationConfigService = new ReputationConfigService();
