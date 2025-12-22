import { Router } from "express";
import {
  getUsers,
  updateUserStatus,
} from "../../controllers/user/user.controller";
import { authenticate, adminOnly } from "../../middleware/auth";
import { pagination } from "../../middleware/pagination";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Áp dụng middleware xác thực và phân quyền admin cho toàn bộ route quản lý user
router.use(authenticate);
router.use(adminOnly);

/**
 * @route   GET /api/users
 * @desc    Lấy danh sách người dùng với filter & pagination
 * @query   page - Số trang (mặc định: 1)
 * @query   limit - Số lượng items mỗi trang (mặc định: 10, min: 0, max: 100)
 * @query   search - Tìm kiếm theo tên, email, phone
 * @query   role - Lọc theo role
 * @query   status - Lọc theo status
 * @query   startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @query   endDate - Ngày kết thúc (YYYY-MM-DD)
 * @access  Private/Admin
 */
router.get("/", pagination(), asyncHandler(getUsers.bind(getUsers)));

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Cập nhật trạng thái hoạt động của user
 * @access  Private/Admin
 */
router.patch(
  "/:id/status",
  asyncHandler(updateUserStatus.bind(updateUserStatus))
);

export default router;
