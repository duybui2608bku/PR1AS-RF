import { Response } from "express";
import { postService } from "../../services/post/post.service";
import {
  createPostSchema,
  getPostsQuerySchema,
  setCommentsLockSchema,
  updatePostSchema,
} from "../../validations/post/post.validation";
import {
  COMMENT_MESSAGES,
  COMMON_MESSAGES,
  POST_MESSAGES,
} from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class PostController {
  async createPost(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      createPostSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const post = await postService.createPost(data, userId);
    R.created(res, post, POST_MESSAGES.POST_CREATED, req);
  }

  async getPostById(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const post = await postService.getPostById(id, userId);
    R.success(res, post, POST_MESSAGES.POST_FETCHED, req);
  }

  async listFeed(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      getPostsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await postService.listFeed(query, userId);
    R.success(res, result, POST_MESSAGES.POSTS_FETCHED, req);
  }

  async updatePost(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      updatePostSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const post = await postService.updatePost(id, data, userId);
    R.success(res, post, POST_MESSAGES.POST_UPDATED, req);
  }

  async deletePost(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    await postService.softDeletePost(id, userId);
    R.success(res, null, POST_MESSAGES.POST_DELETED, req);
  }

  async setCommentsLock(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      setCommentsLockSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const post = await postService.setCommentsLocked(id, userId, data.locked);
    R.success(res, post, COMMENT_MESSAGES.COMMENTS_LOCK_UPDATED, req);
  }
}

export const postController = new PostController();
