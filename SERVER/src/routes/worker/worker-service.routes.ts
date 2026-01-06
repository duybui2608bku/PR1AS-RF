import { Router } from "express";
import { workerServiceController } from "../../controllers/worker/worker-service.controller";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(
    workerServiceController.getWorkerServices.bind(workerServiceController)
  )
);

router.post(
  "/",
  ...csrfProtection,
  asyncHandler(
    workerServiceController.createWorkerServices.bind(workerServiceController)
  )
);

router.patch(
  "/:serviceId",
  ...csrfProtection,
  asyncHandler(
    workerServiceController.updateWorkerService.bind(workerServiceController)
  )
);

router.delete(
  "/:serviceId",
  ...csrfProtection,
  asyncHandler(
    workerServiceController.deleteWorkerService.bind(workerServiceController)
  )
);

export default router;
