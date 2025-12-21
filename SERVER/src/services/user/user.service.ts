import { User } from "../../models/auth/user.model";
import { GetUsersQuery, UserListResponse } from "../../types/user/user.dto";
import { UserStatus } from "../../types/auth/user.types";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../constants/httpStatus";

export const updateUserStatus = async (
  userId: string,
  status: UserStatus
): Promise<void> => {
  const user = await User.findByIdAndUpdate(userId, { status }, { new: true });
  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }
};

export const getAllUsers = async (
  query: GetUsersQuery
): Promise<UserListResponse> => {
  const {
    page = 1,
    limit = 10,
    search,
    role,
    status,
    startDate,
    endDate,
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const filter: Record<string, any> = {};

  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [
      { full_name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];
  }

  // 2. Filter by Role
  if (role) {
    filter.roles = role;
  }

  // 3. Filter by Status
  if (status) {
    filter.status = status;
  }

  // 4. Filter by Date Range
  if (startDate || endDate) {
    filter.created_at = {};
    if (startDate) {
      filter.created_at.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.created_at.$lte = new Date(endDate);
    }
  }

  // Execute Query
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password_hash")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};
