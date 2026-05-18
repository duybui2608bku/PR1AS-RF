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
    value: number,
    updatedBy: string | null
  ): Promise<IReputationConfigDocument> {
    const doc = await ReputationConfig.findOneAndUpdate(
      { key },
      {
        $set: {
          value,
          updated_by: updatedBy ?? null,
          updated_at: new Date(),
        },
      },
      { new: true, upsert: true, lean: true }
    );
    return doc as IReputationConfigDocument;
  }

  async seedDefaults(): Promise<void> {
    const entries = Object.entries(REPUTATION_CONFIG_DEFAULTS) as [
      ReputationConfigKey,
      { value: number; description: string }
    ][];

    const ops = entries.map(([key, { value, description }]) => ({
      updateOne: {
        filter: { key },
        update: { $setOnInsert: { key, value, description, updated_by: null, updated_at: new Date() } },
        upsert: true,
      },
    }));

    await ReputationConfig.bulkWrite(ops);
  }
}

export const reputationConfigRepository = new ReputationConfigRepository();
