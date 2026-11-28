// backend/src/modules/analytics/analytics.routes.ts
// Day 4 – Person 1. Mounted in app.ts AFTER the Week 1 auth middleware.
import { Router } from "express";
import { getTenantContext } from "../../middleware/auth.middleware";
import { getTenantConnection } from "../../database/tenant.connection";
import {
  getExpenditure,
  getSummary,
  getTransactionStats,
  getUsageStats,
} from "./analytics.controller";
import type { TenantRequest } from "./analytics.types";

const router = Router();

/**
 * resolveTenant equivalent: attaches req.tenantId + req.tenantConnection so the
 * Day 3 controller's tenantCtx() sees the same shape it was written against.
 * tenantId comes only from the verified JWT; ?tenantId= in the query is ignored.
 */
router.use(async (req, _res, next) => {
  try {
    const { tenantId } = getTenantContext(req);
    const treq = req as TenantRequest;
    treq.tenantId = tenantId;
    treq.tenantConnection = await getTenantConnection(tenantId);
    next();
  } catch (err) {
    next(err);
  }
});

router.get("/summary", getSummary);                // API 1
router.get("/expenditure", getExpenditure);        // API 2
router.get("/usage", getUsageStats);               // API 3
router.get("/transactions", getTransactionStats);  // API 5
// API 4 (GET /api/v1/usage/limits) belongs to Person 2 – modules/usage

export default router;
