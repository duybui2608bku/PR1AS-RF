import { Request, Response } from "express";
import { pricingService } from "../../services/pricing";
import { COMMON_MESSAGES, PRICING_MESSAGES } from "../../constants/messages";
import { R, validateWithSchema } from "../../utils";
import {
  createPricingPackageSchema,
  pricingPackageIdParamSchema,
  upgradePricingSchema,
  updatePricingPackageSchema,
} from "../../validations/pricing";
import { AuthRequest } from "../../middleware/auth";
import { extractUserIdFromRequest } from "../../utils";

export class PricingController {
  async getMyPricing(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const pricing = await pricingService.getMyPricing(userId);
    R.success(res, pricing, PRICING_MESSAGES.PRICING_ME_FETCHED, req);
  }

  async upgradePricing(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const payload = validateWithSchema(
      upgradePricingSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const pricing = await pricingService.upgradePricing(userId, payload);
    R.success(res, pricing, PRICING_MESSAGES.PRICING_UPGRADED, req);
  }

  async getPublicPackages(req: Request, res: Response): Promise<void> {
    const packages = await pricingService.getPublicPackages();
    R.success(res, packages, PRICING_MESSAGES.PRICING_PACKAGES_FETCHED, req);
  }

  async getAllPackages(req: Request, res: Response): Promise<void> {
    const packages = await pricingService.getAllPackages();
    R.success(res, packages, PRICING_MESSAGES.PRICING_PACKAGES_FETCHED, req);
  }

  async getPackageById(req: Request, res: Response): Promise<void> {
    const { id } = validateWithSchema(pricingPackageIdParamSchema, req.params);
    const pkg = await pricingService.getPackageById(id);
    R.success(res, pkg, PRICING_MESSAGES.PRICING_PACKAGE_FETCHED, req);
  }

  async createPackage(req: Request, res: Response): Promise<void> {
    const payload = validateWithSchema(
      createPricingPackageSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const pkg = await pricingService.createPackage(payload);
    R.created(res, pkg, PRICING_MESSAGES.PRICING_PACKAGE_CREATED, req);
  }

  async updatePackage(req: Request, res: Response): Promise<void> {
    const { id } = validateWithSchema(pricingPackageIdParamSchema, req.params);
    const payload = validateWithSchema(
      updatePricingPackageSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const pkg = await pricingService.updatePackage(id, payload);
    R.success(res, pkg, PRICING_MESSAGES.PRICING_PACKAGE_UPDATED, req);
  }

  async deletePackage(req: Request, res: Response): Promise<void> {
    const { id } = validateWithSchema(pricingPackageIdParamSchema, req.params);
    await pricingService.deletePackage(id);
    R.success(res, null, PRICING_MESSAGES.PRICING_PACKAGE_DELETED, req);
  }
}

export const pricingController = new PricingController();
