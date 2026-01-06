import { Router } from "express";
import { serviceController } from "../../controllers/service/service.controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(serviceController.searchServices.bind(serviceController))
);

router.get(
  "/:id",
  asyncHandler(serviceController.getServiceById.bind(serviceController))
);

router.get(
  "/code/:code",
  asyncHandler(serviceController.getServiceByCode.bind(serviceController))
);

export default router;
