import { ReputationConfig } from "../../models/reputation-config/reputation-config.model";
import {
  IReputationConfigDocument,
  ReputationConfigKey,
  REPUTATION_CONFIG_DEFAULTS,
} from "../../types/reputation/reputation-config.types";

export class ReputationConfigRepository {
  async findAll(): Promise<IReputationConfigDocument[]> {
    return ReputationConfig.find().lean() as Promise<IReputationConfigDocument[]>;
  }

  async findByKey(key: ReputationConfigKey): Promise<IReputationConfigDocument | null> {
    return ReputationConfig.findOne({ key }).lean() as Promise<IReputationConfigDocument | null>;
  }

  async upsert(
    key: ReputationConfigKey,
    changes: { value?: number; active?: boolean },
    updatedBy: string | null
  ): Promise<IReputationConfigDocument> {
    const set: Record<string, unknown> = {
      updated_by: updatedBy ?? null,
      updated_at: new Date(),
    };
    if (changes.value !== undefined) set.value = changes.value;
    if (changes.active !== undefined) set.active = changes.active;

    const doc = await ReputationConfig.findOneAndUpdate(
      { key },
      {
        $set: set,
        $setOnInsert: { key, description: REPUTATION_CONFIG_DEFAULTS[key].description },
      },
      { new: true, upsert: true, lean: true }
    );
    return doc as IReputationConfigDocument;
  }

  async seedDefaults(): Promise<void> {
    const entries = Object.entries(REPUTATION_CONFIG_DEFAULTS) as [
      ReputationConfigKey,
      { value: number; active: boolean; description: string }
    ][];

    const ops = entries.map(([key, { value, active, description }]) => ({
      updateOne: {
        filter: { key },
        update: {
          $setOnInsert: {
            key,
            value,
            active,
            description,
            updated_by: null,
            updated_at: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await ReputationConfig.bulkWrite(ops);

    // Backfill `active` on legacy documents created before the flag existed.
    // `$setOnInsert` above never touches already-existing docs, so without
    // this they'd report `active: undefined` to the admin UI.
    await ReputationConfig.updateMany(
      { active: { $exists: false } },
      { $set: { active: true } }
    );
  }
}

export const reputationConfigRepository = new ReputationConfigRepository();
