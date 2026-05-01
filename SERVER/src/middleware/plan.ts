import { NextFunction, Response } from "express";
import { PricingPlanCode, PricingPlanFeatures } from "../constants/pricing";
import { AUTH_MESSAGES, AUTHZ_MESSAGES } from "../constants/messages";
import { HTTP_STATUS } from "../constants/httpStatus";
import { userRepository } from "../repositories/auth/user.repository";
import { ErrorCode } from "../types/common/error.types";
import { AppError, hasMinPlan, resolveUserPlanFeatures } from "../utils";
import { AuthRequest } from "./auth";

type PlanFeatureKey = keyof PricingPlanFeatures;

const getUserPlanFromRequest = async (
  req: AuthRequest
): Promise<PricingPlanCode> => {
  if (!req.user?.sub) {
    throw new AppError(
      AUTH_MESSAGES.LOGIN_REQUIRED,
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.UNAUTHORIZED
    );
  }

  const user = await userRepository.findById(req.user.sub);
  if (!user) {
    throw new AppError(
      AUTH_MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ErrorCode.NOT_FOUND
    );
  }

  return user.pricing_plan_code;
};

export const requireMinPlan = (requiredPlan: PricingPlanCode) => {
  return async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const currentPlan = await getUserPlanFromRequest(req);

      if (!hasMinPlan(currentPlan, requiredPlan)) {
        return next(
          new AppError(
            AUTHZ_MESSAGES.PLAN_REQUIRED,
            HTTP_STATUS.FORBIDDEN,
            ErrorCode.FORBIDDEN
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requirePlanFeature = (feature: PlanFeatureKey) => {
  return async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const currentPlan = await getUserPlanFromRequest(req);
      const planFeatures = resolveUserPlanFeatures(currentPlan);

      if (!planFeatures[feature]) {
        return next(
          new AppError(
            AUTHZ_MESSAGES.PLAN_FEATURE_NOT_AVAILABLE,
            HTTP_STATUS.FORBIDDEN,
            ErrorCode.FORBIDDEN
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
