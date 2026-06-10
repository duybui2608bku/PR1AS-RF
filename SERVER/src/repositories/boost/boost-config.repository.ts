import { BoostConfig } from "../../models/boost/boost-config.model";
import { DEFAULT_BOOST_CONFIG } from "../../constants/boost";
import { IBoostConfigDocument, UpdateBoostConfigInput } from "../../types/boost/boost.types";

class BoostConfigRepository {
  async get(): Promise<IBoostConfigDocument> {
    let config = await BoostConfig.findOne();
    if (!config) {
      config = await BoostConfig.create({ ...DEFAULT_BOOST_CONFIG });
    }
    return config;
  }

  async update(input: UpdateBoostConfigInput, adminId: string): Promise<IBoostConfigDocument> {
    const config = await this.get();
    Object.assign(config, input);
    config.updated_by = adminId as unknown as IBoostConfigDocument["updated_by"];
    config.updated_at = new Date();
    return config.save();
  }
}

export const boostConfigRepository = new BoostConfigRepository();
