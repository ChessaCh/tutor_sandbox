import { NextRequest, NextResponse } from 'next/server';
import { verifyMidtransSignature } from '@/lib/signature';
import { db } from '@/lib/db';

const successLikeStatuses = [
  'settlement',
  'capture',
];

const failureLikeStatuses = [
  'deny',
  'cancel',
  'expire',
  'failure',
];

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
    transaction_status: transactionStatus,
    fraud_status: fraudStatus,
  } = body;

  // 1. Verifikasi signature terlebih dahulu
  const isValid = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount,
    signatureKey,
  });

  if (!isValid) {
    console.warn(
      `Signature tidak valid untuk order ${orderId}`
    );

    return NextResponse.json(
      {
        error: 'invalid signature',
      },
      {
        status: 401,
      }
    );
  }

  // 2. Pastikan transaksi memang milik kita
  const existing = db.get(orderId);

  if (!existing) {
    console.warn(
      `Order ${orderId} tidak ditemukan`
    );

    return NextResponse.json(
      {
        error: 'order not found',
      },
      {
        status: 404,
      }
    );
  }

  // 3. Tentukan status baru
  let newStatus = existing.status;

if (successLikeStatuses.includes(transactionStatus)) {
  if (!fraudStatus || fraudStatus === 'accept') {
    newStatus = 'settlement';
  }
} else if (
  failureLikeStatuses.includes(transactionStatus)
) {
  newStatus = transactionStatus as typeof newStatus;
} else if (transactionStatus === 'pending') {
  newStatus = 'pending';
}

// CEK DUPLIKAT
if (existing.status === newStatus) {
  console.log(
    `Order ${orderId} sudah berstatus ${newStatus}, notifikasi diabaikan sebagai duplikat.`
  );

  return NextResponse.json(
    {
      received: true,
      duplicate: true,
    },
    {
      status: 200,
    }
  );
}

// BARU UPDATE DATABASE
db.update(orderId, {
  status: newStatus,
  rawNotification: body,
});

console.log(
  `Order ${orderId} diperbarui menjadi ${newStatus}`
);

return NextResponse.json(
  {
    received: true,
  },
  {
    status: 200,
  }
);
}