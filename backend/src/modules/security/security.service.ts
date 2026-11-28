import { AppError } from '../../middleware/error.middleware';
import { getLedgerModels } from '../ledger/ledger.model';
import type { TenantContext } from '../ledger/ledger.types';
import { signTransactionReceipt, verifyTransactionReceipt } from './signature.service';
import type { TransactionReceipt } from './security.types';

export async function getTransactionReceipt(ctx: TenantContext, transactionId: string): Promise<TransactionReceipt> {
  const { Transaction } = getLedgerModels(ctx.connection);
  const doc = await Transaction.findOne({ tenantId: ctx.tenantId, transactionId }).lean();
  if (!doc) throw new AppError(404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');

  const receipt = signTransactionReceipt({
    tenantId: ctx.tenantId,
    transactionId: doc.transactionId,
    eventId: doc.eventId,
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    status: doc.status,
  });

  if (!verifyTransactionReceipt(receipt)) {
    throw new AppError(500, 'Receipt signature could not be verified', 'SIGNATURE_INVALID');
  }
  return receipt;
}
