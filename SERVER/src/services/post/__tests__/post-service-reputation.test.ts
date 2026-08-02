jest.mock("../../../repositories/auth/user.repository");
jest.mock("../../../services/moderation");
jest.mock("../../../services/pricing/pricing.service");
jest.mock("../../../repositories/post/post.repository");

import { UserRole } from "../../../types/auth/user.types";
import { PostService } from "../post.service";
import { userRepository } from "../../../repositories/auth/user.repository";
import { moderationService } from "../../../services/moderation";
import { pricingService } from "../../../services/pricing/pricing.service";
import { postRepository } from "../../../repositories/post/post.repository";

describe("PostService - assertUserCanCreatePost reputation fallback", () => {
  let service: PostService;
  const validUserId = "507f1f77bcf86cd799439011"; // Valid MongoDB ObjectId

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PostService();

    // Mock moderation service
    (moderationService.assertNoActiveRestriction as jest.Mock).mockResolvedValue(undefined);

    // Mock pricing service
    (pricingService.getActivePackageForUser as jest.Mock).mockResolvedValue({
      features: {
        create_job_enabled: true,
        create_job_limit: null,
      },
    });

    // Mock post repository
    (postRepository.countCreatedByAuthorBetween as jest.Mock).mockResolvedValue(0);
  });

  it("defaults a scoreless worker's post-creation reputation check to 0, not 100", async () => {
    (userRepository.findById as jest.Mock).mockResolvedValue({
      roles: [UserRole.CLIENT, UserRole.WORKER],
      meta_data: {},
      last_active_role: UserRole.CLIENT,
    } as never);

    await expect(
      (service as never as { assertUserCanCreatePost: (id: string) => Promise<void> })
        .assertUserCanCreatePost(validUserId)
    ).rejects.toThrow();
  });

  it("defaults a scoreless client's post-creation reputation check to 100", async () => {
    (userRepository.findById as jest.Mock).mockResolvedValue({
      roles: [UserRole.CLIENT],
      meta_data: {},
      last_active_role: UserRole.CLIENT,
    } as never);

    await expect(
      (service as never as { assertUserCanCreatePost: (id: string) => Promise<void> })
        .assertUserCanCreatePost(validUserId)
    ).resolves.toBeUndefined();
  });
});
