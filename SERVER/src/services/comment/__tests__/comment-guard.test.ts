import { Types } from "mongoose";
import { AppError } from "../../../utils/AppError";
import { ErrorCode } from "../../../types/common/error.types";

jest.mock("../../../repositories/comment/comment.repository", () => ({
  commentRepository: {
    findActiveById: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../../repositories/post/post.repository", () => ({
  postRepository: {
    findActiveById: jest.fn(),
  },
}));

import { commentService } from "../comment.service";
import { commentRepository } from "../../../repositories/comment/comment.repository";
import { postRepository } from "../../../repositories/post/post.repository";

const repoCreate = commentRepository.create as jest.Mock;
const repoFindComment = commentRepository.findActiveById as jest.Mock;
const repoFindPost = postRepository.findActiveById as jest.Mock;

describe("CommentService.createComment - 1-level reply guard", () => {
  const POST_ID = new Types.ObjectId().toString();
  const USER_ID = new Types.ObjectId().toString();
  const TOP_LEVEL_ID = new Types.ObjectId();
  const REPLY_ID = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    repoFindPost.mockResolvedValue({
      _id: new Types.ObjectId(POST_ID),
    });
  });

  it("rejects replying to a reply (depth > 1)", async () => {
    repoFindComment.mockResolvedValue({
      _id: REPLY_ID,
      post_id: new Types.ObjectId(POST_ID),
      parent_comment_id: TOP_LEVEL_ID,
    });

    await expect(
      commentService.createComment(POST_ID, USER_ID, {
        body: "no nesting allowed",
        parent_comment_id: REPLY_ID.toString(),
      })
    ).rejects.toMatchObject({
      code: ErrorCode.COMMENT_NESTED_REPLY_NOT_ALLOWED,
    });
  });

  it("rejects when parent comment belongs to a different post", async () => {
    const otherPostId = new Types.ObjectId();
    repoFindComment.mockResolvedValue({
      _id: TOP_LEVEL_ID,
      post_id: otherPostId,
      parent_comment_id: null,
    });

    await expect(
      commentService.createComment(POST_ID, USER_ID, {
        body: "wrong post",
        parent_comment_id: TOP_LEVEL_ID.toString(),
      })
    ).rejects.toMatchObject({
      code: ErrorCode.COMMENT_PARENT_POST_MISMATCH,
    });
  });

  it("accepts replying to a top-level comment of the same post", async () => {
    repoFindComment
      // First call: looking up the parent.
      .mockResolvedValueOnce({
        _id: TOP_LEVEL_ID,
        post_id: new Types.ObjectId(POST_ID),
        parent_comment_id: null,
      })
      // Second call: re-fetch after create for population.
      .mockResolvedValueOnce({
        _id: REPLY_ID,
        post_id: new Types.ObjectId(POST_ID),
        parent_comment_id: TOP_LEVEL_ID,
        author_id: {
          _id: new Types.ObjectId(USER_ID),
          full_name: null,
          avatar: null,
        },
        body: "reply",
        created_at: new Date(),
        updated_at: new Date(),
      });
    repoCreate.mockResolvedValue({ _id: REPLY_ID });

    const result = await commentService.createComment(POST_ID, USER_ID, {
      body: "reply",
      parent_comment_id: TOP_LEVEL_ID.toString(),
    });

    expect(result.parent_comment_id).toBe(TOP_LEVEL_ID.toString());
    expect(result.replies).toEqual([]);
  });

  it("rejects when post does not exist", async () => {
    repoFindPost.mockResolvedValue(null);
    await expect(
      commentService.createComment(POST_ID, USER_ID, { body: "x" })
    ).rejects.toBeInstanceOf(AppError);
  });
});
