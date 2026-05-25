import { Types } from "mongoose";
import { PostEditHistory } from "../../models/post/post-edit-history.model";
import {
  IPostDocument,
  IPostEditHistoryDocument,
  IPostMediaDocument,
  PostEditHistoryReason,
} from "../../types/post/post.types";

export class PostEditHistoryRepository {
  async snapshot(input: {
    post: Pick<IPostDocument, "_id" | "author_id" | "body">;
    media: IPostMediaDocument[];
    reason: PostEditHistoryReason;
    reportId?: string | Types.ObjectId | null;
  }): Promise<IPostEditHistoryDocument> {
    const postId =
      input.post._id instanceof Types.ObjectId
        ? input.post._id
        : new Types.ObjectId(String(input.post._id));

    const authorRaw = input.post.author_id as unknown;
    let authorId: Types.ObjectId;
    if (authorRaw instanceof Types.ObjectId) {
      authorId = authorRaw;
    } else if (
      authorRaw &&
      typeof authorRaw === "object" &&
      "_id" in authorRaw
    ) {
      const id = (authorRaw as { _id: Types.ObjectId | string })._id;
      authorId =
        id instanceof Types.ObjectId ? id : new Types.ObjectId(String(id));
    } else {
      authorId = new Types.ObjectId(String(authorRaw));
    }

    const reportObjectId = input.reportId
      ? input.reportId instanceof Types.ObjectId
        ? input.reportId
        : new Types.ObjectId(String(input.reportId))
      : null;

    return PostEditHistory.create({
      post_id: postId,
      author_id: authorId,
      body_snapshot: input.post.body,
      media_snapshot: input.media.map((m) => ({
        type: m.type,
        url: m.url,
        sort_order: m.sort_order ?? 0,
        mime_type: m.mime_type ?? null,
        byte_size: m.byte_size ?? null,
        duration_seconds: m.duration_seconds ?? null,
      })),
      reason: input.reason,
      report_id: reportObjectId,
      snapshot_at: new Date(),
    });
  }

  async hasSnapshotForPost(postId: string | Types.ObjectId): Promise<boolean> {
    const id = typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    const existing = await PostEditHistory.exists({ post_id: id });
    return Boolean(existing);
  }
}

export const postEditHistoryRepository = new PostEditHistoryRepository();
