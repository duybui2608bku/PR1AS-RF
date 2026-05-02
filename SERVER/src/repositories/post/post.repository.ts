import { Types } from "mongoose";
import { Post } from "../../models/post/post.model";
import {
  IPostDocument,
  CreatePostInput,
  PostFeedQuery,
} from "../../types/post/post.types";
import { PostVisibility } from "../../constants/post";
import { CursorValue, buildCursorFilter } from "../../utils/cursorPagination";

const AUTHOR_PUBLIC_FIELDS = "full_name avatar";

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
      deleted_at: null,
    });
    return post.save();
  }

  async findActiveById(id: string): Promise<IPostDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Post.findOne({ _id: id, deleted_at: null }).populate(
      "author_id",
      AUTHOR_PUBLIC_FIELDS
    );
  }

  async findActiveByIdLean(id: string): Promise<IPostDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Post.findOne({ _id: id, deleted_at: null })
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
  }): Promise<IPostDocument[]> {
    const { query, decodedCursor, hashtagPostIds } = params;

    const filter: Record<string, unknown> = { deleted_at: null };

    if (query.author_id && Types.ObjectId.isValid(query.author_id)) {
      filter.author_id = new Types.ObjectId(query.author_id);
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
      { _id: id, deleted_at: null },
      { ...updateData, updated_at: new Date() },
      { new: true }
    ).populate("author_id", AUTHOR_PUBLIC_FIELDS);
  }

  async softDelete(id: string): Promise<IPostDocument | null> {
    return Post.findOneAndUpdate(
      { _id: id, deleted_at: null },
      { deleted_at: new Date(), updated_at: new Date() },
      { new: true }
    );
  }

  async countActiveByAuthor(authorId: string): Promise<number> {
    if (!Types.ObjectId.isValid(authorId)) return 0;
    return Post.countDocuments({
      author_id: new Types.ObjectId(authorId),
      deleted_at: null,
    });
  }
}

export const postRepository = new PostRepository();
