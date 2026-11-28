import { z } from 'zod';

export const receiptParamSchema = z.object({
  transactionId: z.string().regex(/^txn_[A-Za-z0-9-]{3,64}$/, 'Invalid transaction id'),
});
