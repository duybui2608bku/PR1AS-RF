import { Types } from "mongoose";
import { Post } from "../../models/post/post.model";
import {
  IPostDocument,
  CreatePostInput,
  PostFeedQuery,
} from "../../types/post/post.types";
import { PostVisibility } from "../../constants/post";
import { CursorValue, buildCursorFilter } from "../../utils/cursorPagination";

const AUTHOR_PUBLIC_FIELDS =
  "full_name avatar worker_profile meta_data.pricing_plan_code";

export class PostRepository {
  async create(
    input: Omit<CreatePostInput, "media"> & { author_id: Types.ObjectId }
  ): Promise<IPostDocument> {
    const post = new Post({
      author_id: input.author_id,
      body: input.body.trim(),
      visibility: input.visibility ?? PostVisibility.PUBLIC,
      created_at: new Date(),
      updated_at: new Date(),
      deleted: false,
      deleted_at: null,
    });
    return post.save();
  }

  async findActiveById(id: string): Promise<IPostDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Post.findOne({
      _id: id,
      deleted_at: null,
      deleted: { $ne: true },
    }).populate("author_id", AUTHOR_PUBLIC_FIELDS);
  }

  async findActiveByIdLean(id: string): Promise<IPostDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Post.findOne({ _id: id, deleted_at: null, deleted: { $ne: true } })
      .populate("author_id", AUTHOR_PUBLIC_FIELDS)
      .lean<IPostDocument>();
  }

  /**
   * Cursor-pagination feed query.
   *
   * Strategy: keep the sort key compound `(created_at desc, _id desc)` so
   * pagination is deterministic even when many posts share the same
   * `created_at` (sub-second collisions). We fetch `limit + 1` to detect
   * `has_more` without an extra count.
   */
  async findFeed(params: {
    query: PostFeedQuery;
    decodedCursor: CursorValue | null;
    hashtagPostIds?: Types.ObjectId[] | null;
    viewerId?: string;
    excludedAuthorIds?: string[];
  }): Promise<IPostDocument[]> {
    const {
      query,
      decodedCursor,
      hashtagPostIds,
      viewerId,
      excludedAuthorIds,
    } = params;

    const filter: Record<string, unknown> = {
      deleted_at: null,
      deleted: { $ne: true },
    };
    if (excludedAuthorIds?.length) {
      filter.author_id = {
        $nin: excludedAuthorIds
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id)),
      };
    }

    if (query.author_id && Types.ObjectId.isValid(query.author_id)) {
      filter.author_id = new Types.ObjectId(query.author_id);
      // When viewing another user's profile, hide their private posts
      if (!viewerId || viewerId !== query.author_id) {
        filter.visibility = PostVisibility.PUBLIC;
      }
    } else {
      // General feed: public posts from everyone + viewer's own private posts
      if (viewerId && Types.ObjectId.isValid(viewerId)) {
        filter.$or = [
          { visibility: PostVisibility.PUBLIC },
          {
            visibility: PostVisibility.PRIVATE,
            author_id: new Types.ObjectId(viewerId),
          },
        ];
      } else {
        filter.visibility = PostVisibility.PUBLIC;
      }
    }

    if (hashtagPostIds) {
      if (hashtagPostIds.length === 0) {
        return [];
      }
      filter._id = { $in: hashtagPostIds };
    }

    if (decodedCursor) {
      Object.assign(filter, buildCursorFilter(decodedCursor));
    }

    const items = await Post.find(filter)
      .sort({ created_at: -1, _id: -1 })
      .limit(query.limit + 1)
      .populate("author_id", AUTHOR_PUBLIC_FIELDS)
      .lean<IPostDocument[]>();

    return items;
  }

  async update(
    id: string,
    updateData: Partial<Pick<IPostDocument, "body" | "visibility">>
  ): Promise<IPostDocument | null> {
    return Post.findOneAndUpdate(
      { _id: id, deleted_at: null, deleted: { $ne: true } },
      { ...updateData, updated_at: new Date() },
      { new: true }
    ).populate("author_id", AUTHOR_PUBLIC_FIELDS);
  }

  async softDelete(
    id: string,
    session?: import("mongoose").ClientSession
  ): Promise<IPostDocument | null> {
    return Post.findOneAndUpdate(
      { _id: id, deleted_at: null, deleted: { $ne: true } },
      { deleted: true, deleted_at: new Date(), updated_at: new Date() },
      { new: true, session }
    );
  }

  async countActiveByAuthor(authorId: string): Promise<number> {
    if (!Types.ObjectId.isValid(authorId)) return 0;
    return Post.countDocuments({
      author_id: new Types.ObjectId(authorId),
      deleted_at: null,
      deleted: { $ne: true },
    });
  }

  async countCreatedByAuthorBetween(
    authorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    if (!Types.ObjectId.isValid(authorId)) return 0;
    return Post.countDocuments({
      author_id: new Types.ObjectId(authorId),
      deleted_at: null,
      deleted: { $ne: true },
      created_at: { $gte: startDate, $lt: endDate },
    });
  }

  async softDeleteAsAdmin(id: string): Promise<IPostDocument | null> {
    return this.softDelete(id);
  }

  async incrementCommentsCount(
    postId: string | Types.ObjectId,
    delta: number
  ): Promise<void> {
    const id = typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    await Post.updateOne(
      { _id: id, deleted_at: null, deleted: { $ne: true } },
      { $inc: { comments_count: delta } }
    );
  }

  async incrementReactionsCount(
    postId: string | Types.ObjectId,
    delta: number,
    session?: import("mongoose").ClientSession
  ): Promise<void> {
    const id = typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    await Post.updateOne(
      { _id: id, deleted_at: null, deleted: { $ne: true } },
      { $inc: { reactions_count: delta } },
      { session }
    );
  }

  async setCommentsLocked(
    postId: string,
    locked: boolean
  ): Promise<IPostDocument | null> {
    if (!Types.ObjectId.isValid(postId)) return null;
    return Post.findOneAndUpdate(
      { _id: postId, deleted_at: null, deleted: { $ne: true } },
      { comments_locked: locked, updated_at: new Date() },
      { new: true }
    ).populate("author_id", AUTHOR_PUBLIC_FIELDS);
  }
}

export const postRepository = new PostRepository();
