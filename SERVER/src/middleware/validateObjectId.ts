import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../utils/AppError";
import { COMMON_MESSAGES, VALIDATION_MESSAGES } from "../constants/messages";

export const validateObjectId = (...paramNames: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const paramsToCheck = paramNames.length > 0 ? paramNames : ["id"];
    for (const paramName of paramsToCheck) {
      const paramValue = req.params[paramName];

      if (paramValue && !mongoose.Types.ObjectId.isValid(paramValue)) {
        return next(
          AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, [
            {
              field: paramName,
              message: VALIDATION_MESSAGES.INVALID(paramName),
            },
          ])
        );
      }
    }

    next();
  };
};
