import { Types } from "mongoose";
import { commentRepository } from "../../repositories/comment/comment.repository";
import { postRepository } from "../../repositories/post/post.repository";
import {
  CommentFeedQuery,
  CommentPublic,
  CreateCommentInput,
  ICommentDocument,
  UpdateCommentInput,
} from "../../types/comment/comment.types";
import { IUserDocument } from "../../types/auth/user.types";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { COMMENT_MESSAGES } from "../../constants/messages";
import {
  CursorPaginatedResponse,
  decodeCursor,
  formatCursorResponse,
} from "../../utils/cursorPagination";

type LeanCommentWithAuthor = ICommentDocument & {
  author_id:
    | Pick<
        IUserDocument,
        "_id" | "full_name" | "avatar" | "worker_profile"
      >
    | null;
};

/** Raw ObjectId vs populated author ref from `findActiveById` / list queries. */
const commentAuthorIdToString = (authorId: unknown): string => {
  if (!authorId) return "";
  if (authorId instanceof Types.ObjectId) return authorId.toString();
  if (
    typeof authorId === "object" &&
    authorId !== null &&
    "_id" in authorId
  ) {
    const id = (authorId as { _id: Types.ObjectId })._id;
    if (id instanceof Types.ObjectId) return id.toString();
  }
  return "";
};

const toAuthorPublic = (comment: LeanCommentWithAuthor) => {
  const populated = comment.author_id;
  if (populated && typeof populated === "object" && "_id" in populated) {
    return {
      id: populated._id.toString(),
      full_name: populated.full_name ?? null,
      avatar: populated.avatar ?? null,
      has_worker_profile: !!populated.worker_profile,
    };
  }
  return {
    id: (comment.author_id as unknown as Types.ObjectId).toString(),
    full_name: null,
    avatar: null,
    has_worker_profile: false,
  };
};

const toCommentPublic = (comment: LeanCommentWithAuthor): CommentPublic => ({
  id: (comment._id as Types.ObjectId).toString(),
  post_id: comment.post_id.toString(),
  parent_comment_id: comment.parent_comment_id
    ? comment.parent_comment_id.toString()
    : null,
  author: toAuthorPublic(comment),
  body: comment.body,
  created_at: comment.created_at,
  updated_at: comment.updated_at,
});

export class CommentService {
  async createComment(
    postId: string,
    userId: string,
    input: CreateCommentInput
  ): Promise<CommentPublic & { replies: CommentPublic[] }> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new AppError(
        COMMENT_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    const post = await postRepository.findActiveById(postId);
    if (!post) {
      throw new AppError(
        COMMENT_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    let parentObjectId: Types.ObjectId | null = null;
    if (input.parent_comment_id) {
      const parent = await commentRepository.findActiveById(
        input.parent_comment_id
      );
      if (!parent) {
        throw new AppError(
          COMMENT_MESSAGES.COMMENT_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.COMMENT_NOT_FOUND
        );
      }
      // 1-level reply rule: a reply must point to a top-level comment so the
      // thread stays flat (Facebook-classic style). This guard is the single
      // source of truth — the model accepts any parent for flexibility.
      if (parent.parent_comment_id) {
        throw new AppError(
          COMMENT_MESSAGES.NESTED_REPLY_NOT_ALLOWED,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.COMMENT_NESTED_REPLY_NOT_ALLOWED
        );
      }
      if (parent.post_id.toString() !== postId) {
        throw new AppError(
          COMMENT_MESSAGES.PARENT_POST_MISMATCH,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.COMMENT_PARENT_POST_MISMATCH
        );
      }
      parentObjectId = parent._id as Types.ObjectId;
    }

    const created = await commentRepository.create({
      post_id: post._id as Types.ObjectId,
      author_id: new Types.ObjectId(userId),
      parent_comment_id: parentObjectId,
      body: input.body,
    });

    const populated = await commentRepository.findActiveById(
      (created._id as Types.ObjectId).toString()
    );
    const finalComment = (populated ??
      created) as unknown as LeanCommentWithAuthor;
    return { ...toCommentPublic(finalComment), replies: [] };
  }

  async listByPost(
    postId: string,
    query: CommentFeedQuery
  ): Promise<
    CursorPaginatedResponse<CommentPublic & { replies: CommentPublic[] }>
  > {
    if (!Types.ObjectId.isValid(postId)) {
      throw new AppError(
        COMMENT_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    const post = await postRepository.findActiveById(postId);
    if (!post) {
      throw new AppError(
        COMMENT_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    const decodedCursor = query.cursor ? decodeCursor(query.cursor) : null;
    const items = await commentRepository.findTopLevelByPostCursor(
      postId,
      query,
      decodedCursor
    );
    if (items.length === 0) {
      return { data: [], next_cursor: null, has_more: false };
    }

    const visible = items.slice(0, query.limit);
    const parentIds = visible.map((c) => c._id as Types.ObjectId);
    const replyMap = await commentRepository.findRepliesByParentIds(parentIds);

    const enriched = items.map((comment) => {
      const id = (comment._id as Types.ObjectId).toString();
      const replies = (replyMap.get(id) ?? []).map((reply) =>
        toCommentPublic(reply as unknown as LeanCommentWithAuthor)
      );
      return {
        ...toCommentPublic(comment as unknown as LeanCommentWithAuthor),
        replies,
      };
    });

    return formatCursorResponse(enriched, query.limit, (item) => ({
      createdAt: item.created_at,
      id: item.id,
    }));
  }

  async updateComment(
    commentId: string,
    userId: string,
    input: UpdateCommentInput
  ): Promise<CommentPublic> {
    const existing = await commentRepository.findActiveById(commentId);
    if (!existing) {
      throw new AppError(
        COMMENT_MESSAGES.COMMENT_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.COMMENT_NOT_FOUND
      );
    }
    if (commentAuthorIdToString(existing.author_id) !== userId) {
      throw new AppError(
        COMMENT_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.COMMENT_UNAUTHORIZED_ACCESS
      );
    }

    const updated = await commentRepository.update(commentId, input.body);
    if (!updated) {
      throw new AppError(
        COMMENT_MESSAGES.COMMENT_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.COMMENT_NOT_FOUND
      );
    }
    return toCommentPublic(updated as unknown as LeanCommentWithAuthor);
  }

  async softDeleteComment(commentId: string, userId: string): Promise<void> {
    const existing = await commentRepository.findActiveById(commentId);
    if (!existing) {
      throw new AppError(
        COMMENT_MESSAGES.COMMENT_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.COMMENT_NOT_FOUND
      );
    }
    if (commentAuthorIdToString(existing.author_id) !== userId) {
      throw new AppError(
        COMMENT_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.COMMENT_UNAUTHORIZED_ACCESS
      );
    }

    const deleted = await commentRepository.softDelete(commentId);
    if (!deleted) {
      throw new AppError(
        COMMENT_MESSAGES.COMMENT_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.COMMENT_NOT_FOUND
      );
    }
  }
}

export const commentService = new CommentService();
