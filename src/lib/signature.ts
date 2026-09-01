import crypto from 'crypto';

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const {
    orderId,
    statusCode,
    grossAmount,
    signatureKey,
  } = params;

  const serverKey = process.env.MIDTRANS_SERVER_KEY!;

  const raw =
    orderId +
    statusCode +
    grossAmount +
    serverKey;

  const computed = crypto
    .createHash('sha512')
    .update(raw)
    .digest('hex');

  const a = Buffer.from(computed);
  const b = Buffer.from(signatureKey);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}