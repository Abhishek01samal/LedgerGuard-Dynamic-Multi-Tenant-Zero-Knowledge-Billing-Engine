# Analytics API

All routes require JWT auth. `tenantId` is taken from the token. Query `tenantId` is ignored.

Reporting timezone is UTC. Expenditure sums **COMPLETED** rows of **one currency**.

## GET /api/v1/analytics/summary

Query: `from`, `to` (`YYYY-MM-DD`), `currency` (default INR).

## GET /api/v1/analytics/expenditure

Query: `period=daily|weekly|monthly`, optional `year`, `from`, `to`, `currency`.

## GET /api/v1/analytics/usage

Transaction counts by bucket (all statuses, split successful/failed).

## GET /api/v1/analytics/transactions

Success/failure rates for the selected range.

## GET /api/v1/usage/limits

Current UTC month consumption vs configured limit (default 500000 minor units).
