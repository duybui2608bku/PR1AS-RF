import { Response } from "express";
import { commentService } from "../../services/comment/comment.service";
import {
  createCommentSchema,
  getCommentsQuerySchema,
  updateCommentSchema,
} from "../../validations/comment/comment.validation";
import { COMMENT_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class CommentController {
  async listByPost(req: AuthRequest, res: Response): Promise<void> {
    const { postId } = req.params;
    const query = validateWithSchema(
      getCommentsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await commentService.listByPost(postId, query);
    R.success(res, result, COMMENT_MESSAGES.COMMENTS_FETCHED, req);
  }

  async createComment(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { postId } = req.params;
    const data = validateWithSchema(
      createCommentSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const comment = await commentService.createComment(postId, userId, data);
    R.created(res, comment, COMMENT_MESSAGES.COMMENT_CREATED, req);
  }

  async updateComment(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      updateCommentSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const comment = await commentService.updateComment(id, userId, data);
    R.success(res, comment, COMMENT_MESSAGES.COMMENT_UPDATED, req);
  }

  async deleteComment(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    await commentService.softDeleteComment(id, userId);
    R.success(res, null, COMMENT_MESSAGES.COMMENT_DELETED, req);
  }
}

export const commentController = new CommentController();
