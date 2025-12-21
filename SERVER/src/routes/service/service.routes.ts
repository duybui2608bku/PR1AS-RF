import { Router } from "express";
import { serviceController } from "../../controllers/service/service.controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

/**
 * @route   GET /api/services
 * @desc    Tìm kiếm dịch vụ theo category (query parameter)
 * @query   category - Category của dịch vụ (ASSISTANCE hoặc COMPANIONSHIP)
 * @query   is_active - Lọc theo trạng thái active (true/false, mặc định: true)
 * @access  Public
 */
router.get(
  "/",
  asyncHandler(serviceController.searchServices.bind(serviceController))
);

/**
 * @route   GET /api/services/:id
 * @desc    Lấy thông tin dịch vụ theo ID
 * @access  Public
 */
router.get(
  "/:id",
  asyncHandler(serviceController.getServiceById.bind(serviceController))
);

/**
 * @route   GET /api/services/code/:code
 * @desc    Lấy thông tin dịch vụ theo code
 * @access  Public
 */
router.get(
  "/code/:code",
  asyncHandler(serviceController.getServiceByCode.bind(serviceController))
);

export default router;
