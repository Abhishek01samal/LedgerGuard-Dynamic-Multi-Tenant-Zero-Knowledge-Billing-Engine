// backend/src/modules/analytics/analytics.types.ts
// Day 1 – Person 1. Shared types for the analytics module.
import type { Request } from "express";
import type { Connection } from "mongoose";

/** Name of the Week 2 ledger collection. Confirmed against ledger.model.ts. */
export const TRANSACTION_COLLECTION = "ledger_transactions";

/** Field / status names from the Week 2 ledger. ADAPT if yours differ. */
export const TX_FIELDS = {
  tenantId: "tenantId",
  status: "status",
  amountMinor: "amountMinor",
  currency: "currency",
  createdAt: "createdAt",
} as const;

export const TX_STATUS = {
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
} as const;

export const PERIODS = ["daily", "weekly", "monthly"] as const;
export type Period = (typeof PERIODS)[number];

export const DEFAULT_CURRENCY = "INR";

/** Reporting timezone is UTC everywhere (decision to freeze with Person 2). */
export interface DateRange {
  /** inclusive start (UTC 00:00) */
  from: Date;
  /** EXCLUSIVE end (UTC 00:00 of the day after the requested `to`) */
  to: Date;
}

/** Request after authentication + tenant middleware from Week 1. ADAPT property names. */
export interface TenantRequest extends Request {
  tenantId: string;
  tenantConnection: Connection;
}

// ---------- API 1: summary ----------
export interface AnalyticsSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalExpenditure: number; // minor units
  currency: string;
  successRate: number; // percent, 2 dp
}

// ---------- API 2: expenditure ----------
export interface ExpenditurePoint {
  label: string;
  /** period start, YYYY-MM-DD (UTC) */
  date: string;
  amountMinor: number;
}
export interface ExpenditureData {
  currency: string;
  period: Period;
  points: ExpenditurePoint[];
}

// ---------- API 3: usage ----------
export interface UsagePoint {
  /** period start, YYYY-MM-DD (UTC) */
  date: string;
  transactions: number;
  successful: number;
  failed: number;
}
export interface UsageStatsData {
  period: Period;
  points: UsagePoint[];
}

// ---------- API 5: transaction performance ----------
export interface TransactionStatsData {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  successRate: number;
  failureRate: number;
}

/** Raw shapes returned by the pipelines */
export interface SummaryRow {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  expenditure: number;
}
export interface ExpenditureRow {
  _id: Date;
  amountMinor: number;
}
export interface UsageRow {
  _id: Date;
  transactions: number;
  successful: number;
  failed: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}
