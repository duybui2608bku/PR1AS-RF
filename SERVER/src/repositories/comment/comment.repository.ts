import { Types } from "mongoose";
import { Comment } from "../../models/comment/comment.model";
import {
  CommentFeedQuery,
  ICommentDocument,
} from "../../types/comment/comment.types";
import { CursorValue, buildCursorFilter } from "../../utils/cursorPagination";

const AUTHOR_PUBLIC_FIELDS = "full_name avatar";

export class CommentRepository {
  async create(input: {
    post_id: Types.ObjectId;
    author_id: Types.ObjectId;
    parent_comment_id: Types.ObjectId | null;
    body: string;
  }): Promise<ICommentDocument> {
    const comment = new Comment({
      ...input,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });
    return comment.save();
  }

  async findActiveById(id: string): Promise<ICommentDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Comment.findOne({ _id: id, deleted_at: null }).populate(
      "author_id",
      AUTHOR_PUBLIC_FIELDS
    );
  }

  /**
   * List top-level comments of a post via cursor pagination ordered by
   * `(created_at desc, _id desc)`. Replies are fetched in a separate call so
   * the API can choose between flat / 2-tier rendering.
   */
  async findTopLevelByPostCursor(
    postId: string | Types.ObjectId,
    query: CommentFeedQuery,
    decodedCursor: CursorValue | null
  ): Promise<ICommentDocument[]> {
    const postObjectId =
      typeof postId === "string" ? new Types.ObjectId(postId) : postId;

    const filter: Record<string, unknown> = {
      post_id: postObjectId,
      parent_comment_id: null,
      deleted_at: null,
    };
    if (decodedCursor) {
      Object.assign(filter, buildCursorFilter(decodedCursor));
    }

    return Comment.find(filter)
      .sort({ created_at: -1, _id: -1 })
      .limit(query.limit + 1)
      .populate("author_id", AUTHOR_PUBLIC_FIELDS)
      .lean<ICommentDocument[]>();
  }

  async findRepliesByParentIds(
    parentIds: Types.ObjectId[]
  ): Promise<Map<string, ICommentDocument[]>> {
    if (parentIds.length === 0) return new Map();
    const replies = await Comment.find({
      parent_comment_id: { $in: parentIds },
      deleted_at: null,
    })
      .sort({ created_at: 1 })
      .populate("author_id", AUTHOR_PUBLIC_FIELDS)
      .lean<ICommentDocument[]>();

    const map = new Map<string, ICommentDocument[]>();
    for (const reply of replies) {
      if (!reply.parent_comment_id) continue;
      const key = reply.parent_comment_id.toString();
      const list = map.get(key) ?? [];
      list.push(reply);
      map.set(key, list);
    }
    return map;
  }

  async update(id: string, body: string): Promise<ICommentDocument | null> {
    return Comment.findOneAndUpdate(
      { _id: id, deleted_at: null },
      { body: body.trim(), updated_at: new Date() },
      { new: true }
    ).populate("author_id", AUTHOR_PUBLIC_FIELDS);
  }

  async softDelete(id: string): Promise<ICommentDocument | null> {
    return Comment.findOneAndUpdate(
      { _id: id, deleted_at: null },
      { deleted_at: new Date(), updated_at: new Date() },
      { new: true }
    );
  }

  async softDeleteByPostId(postId: string | Types.ObjectId): Promise<void> {
    const postObjectId =
      typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    await Comment.updateMany(
      { post_id: postObjectId, deleted_at: null },
      { deleted_at: new Date(), updated_at: new Date() }
    );
  }
}

export const commentRepository = new CommentRepository();
