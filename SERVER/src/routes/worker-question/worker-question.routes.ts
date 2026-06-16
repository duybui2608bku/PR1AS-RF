import { Router } from "express";
import { workerQuestionController } from "../../controllers/worker-question/worker-question.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateObjectId } from "../../middleware";
import {
  authenticate,
  workerOnly,
  optionalAuthenticate,
  AuthRequest,
} from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { questionCreateLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post(
  "/",
  optionalAuthenticate,
  questionCreateLimiter,
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    workerQuestionController.createQuestion.bind(workerQuestionController)
  )
);

router.get(
  "/worker/:workerId",
  optionalAuthenticate,
  validateObjectId("workerId"),
  asyncHandler<AuthRequest>(
    workerQuestionController.listForWorker.bind(workerQuestionController)
  )
);

router.post(
  "/:id/answer",
  authenticate,
  workerOnly,
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    workerQuestionController.answerQuestion.bind(workerQuestionController)
  )
);

export default router;
