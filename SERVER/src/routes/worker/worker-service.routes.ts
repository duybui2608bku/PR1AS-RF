import { Router } from "express";
import { workerServiceController } from "../../controllers/worker/worker-service.controller";
import { authenticate, workerOnly } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Chỉ cho phép worker đã đăng nhập cấu hình dịch vụ
router.use(authenticate);
router.use(workerOnly);

/**
 * @route   POST /api/worker/services
 * @desc    Tạo/cập nhật danh sách dịch vụ worker cung cấp
 * @access  Private/Worker
 */
router.post(
  "/",
  asyncHandler(
    workerServiceController.createWorkerServices.bind(workerServiceController)
  )
);

/**
 * @route   PATCH /api/worker/services/:serviceId
 * @desc    Cập nhật dịch vụ (pricing / is_active) cho worker
 * @access  Private/Worker
 */
router.patch(
  "/:serviceId",
  asyncHandler(
    workerServiceController.updateWorkerService.bind(workerServiceController)
  )
);

/**
 * @route   DELETE /api/worker/services/:serviceId
 * @desc    Xóa một dịch vụ khỏi danh sách dịch vụ của worker
 * @access  Private/Worker
 */
router.delete(
  "/:serviceId",
  asyncHandler(
    workerServiceController.deleteWorkerService.bind(workerServiceController)
  )
);

export default router;
