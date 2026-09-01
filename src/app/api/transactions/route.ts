import { NextRequest, NextResponse } from 'next/server';
import { coreApi } from '@/lib/midtrans';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { grossAmount } = body;

  if (
    !grossAmount ||
    typeof grossAmount !== 'number' ||
    grossAmount <= 0
  ) {
    return NextResponse.json(
      {
        error: 'grossAmount wajib berupa angka positif',
      },
      {
        status: 400,
      }
    );
  }

  const orderId = `ORDER-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const parameter = {
    payment_type: 'qris',

    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },

    qris: {
      acquirer: 'gopay',
    },
  };

  try {
    const chargeResponse = await coreApi.charge(parameter);

    db.create({
      orderId,
      grossAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerTransactionId: chargeResponse.transaction_id,
    });

    const qrAction = chargeResponse.actions?.find(
      (action: { name: string; url: string }) =>
        action.name === 'generate-qr-code'
    );

    return NextResponse.json({
      orderId,
      transactionStatus: chargeResponse.transaction_status,
      qrCodeUrl: qrAction?.url ?? null,
      expiryTime: chargeResponse.expiry_time,
    });
  } catch (error) {
    console.error('Gagal membuat transaksi:', error);

    return NextResponse.json(
      {
        error: 'Gagal menghubungi penyedia pembayaran',
      },
      {
        status: 502,
      }
    );
  }
}