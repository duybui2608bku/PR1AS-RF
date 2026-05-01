import { Router } from "express";
import { workerController } from "../../controllers/worker/worker.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateObjectId } from "../../middleware";

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
