import { Types } from "mongoose";
import { WorkerFavorite } from "../../models/worker/worker-favorite.model";
import { IWorkerFavoriteDocument } from "../../types/worker/worker-favorite.types";

export class WorkerFavoriteRepository {
  async findByClient(clientId: string): Promise<IWorkerFavoriteDocument[]> {
    return WorkerFavorite.find({
      client_id: new Types.ObjectId(clientId),
    })
      .sort({ created_at: -1 })
      .lean<IWorkerFavoriteDocument[]>();
  }

  async findWorkerIdsByClient(clientId: string): Promise<string[]> {
    const favorites = await WorkerFavorite.find({
      client_id: new Types.ObjectId(clientId),
    })
      .select("worker_id")
      .lean<IWorkerFavoriteDocument[]>();

    return favorites.map((favorite) => favorite.worker_id.toString());
  }

  async add(clientId: string, workerId: string): Promise<void> {
    const now = new Date();
    await WorkerFavorite.updateOne(
      {
        client_id: new Types.ObjectId(clientId),
        worker_id: new Types.ObjectId(workerId),
      },
      {
        $setOnInsert: {
          client_id: new Types.ObjectId(clientId),
          worker_id: new Types.ObjectId(workerId),
          created_at: now,
        },
      },
      { upsert: true }
    );
  }

  async remove(clientId: string, workerId: string): Promise<boolean> {
    const result = await WorkerFavorite.deleteOne({
      client_id: new Types.ObjectId(clientId),
      worker_id: new Types.ObjectId(workerId),
    });

    return result.deletedCount === 1;
  }
}

export const workerFavoriteRepository = new WorkerFavoriteRepository();
