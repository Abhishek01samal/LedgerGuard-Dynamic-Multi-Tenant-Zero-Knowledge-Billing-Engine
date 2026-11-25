// backend/src/modules/analytics/analytics.controller.ts
// Day 3 – Person 1. HTTP layer: validate → service → { success, data }.
import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import * as service from "./analytics.service";
import type { TenantRequest } from "./analytics.types";
import {
  expenditureQuerySchema,
  summaryQuerySchema,
  transactionsQuerySchema,
  usageQuerySchema,
} from "./analytics.validation";

/**
 * Tenant identity comes ONLY from the verified auth/tenant middleware (Week 1).
 * ADAPT the two property names below if your middleware uses different ones.
 */
function tenantCtx(req: Request) {
  const { tenantId, tenantConnection } = req as TenantRequest;
  if (!tenantId || !tenantConnection) {
    const err = new Error("Tenant context missing");
    (err as any).status = 401;
    throw err;
  }
  return { tenantId, conn: tenantConnection };
}

function handler<Q, R>(
  schema: ZodType<Q, any, any>,
  fn: (conn: TenantRequest["tenantConnection"], tenantId: string, q: Q) => Promise<R>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, conn } = tenantCtx(req);
      const query = schema.parse(req.query);
      const data = await fn(conn, tenantId, query);
      res.status(200).json({ success: true, data });
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
          },
        });
        return;
      }
      next(err);
    }
  };
}

export const getSummary = handler(summaryQuerySchema, service.getSummary);
export const getExpenditure = handler(expenditureQuerySchema, service.getExpenditure);
export const getUsageStats = handler(usageQuerySchema, service.getUsageStats);
export const getTransactionStats = handler(transactionsQuerySchema, service.getTransactionStats);
