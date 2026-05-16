import { Router } from "express";
import { workerController } from "../../controllers/worker/worker.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateObjectId } from "../../middleware";
import { authenticate, clientOnly, AuthRequest } from "../../middleware/auth";

const router = Router();

router.get(
  "/location-suggestions",
  asyncHandler(workerController.getLocationSuggestions.bind(workerController))
);

router.get(
  "/grouped-by-service",
  asyncHandler(
    workerController.getWorkersGroupedByService.bind(workerController)
  )
);

router.get(
  "/favorite-ids",
  authenticate,
  clientOnly,
  asyncHandler<AuthRequest>(
    workerController.getFavoriteWorkerIds.bind(workerController)
  )
);

router.get(
  "/favorites",
  authenticate,
  clientOnly,
  asyncHandler<AuthRequest>(
    workerController.getFavoriteWorkers.bind(workerController)
  )
);

router.post(
  "/:id/favorite",
  authenticate,
  clientOnly,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(
    workerController.addFavoriteWorker.bind(workerController)
  )
);

router.delete(
  "/:id/favorite",
  authenticate,
  clientOnly,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(
    workerController.removeFavoriteWorker.bind(workerController)
  )
);

router.get(
  "/:id/suggestions",
  validateObjectId("id"),
  asyncHandler(workerController.getWorkerSuggestions.bind(workerController))
);

router.get(
  "/:id/schedule",
  validateObjectId("id"),
  asyncHandler(workerController.getWorkerSchedule.bind(workerController))
);

router.get(
  "/:id",
  validateObjectId("id"),
  asyncHandler(workerController.getWorkerById.bind(workerController))
);
export default router;
