export interface CanonicalRequest {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
}

export interface SignatureHeaders {
  timestamp: string;
  nonce: string;
  signature: string;
}

export interface TransactionReceipt {
  tenantId: string;
  transactionId: string;
  eventId: string;
  amountMinor: number;
  currency: string;
  status: string;
  signedAt: string;
  signature: string;
}
