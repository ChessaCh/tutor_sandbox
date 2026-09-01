import { NextRequest, NextResponse } from 'next/server';
import { coreApi } from '@/lib/midtrans';
import { db } from '@/lib/db';
import {
  getCachedResponse,
  setCachedResponse,
} from '@/lib/idempotency';

export async function POST(req: NextRequest) {
  // 1. Ambil Idempotency-Key dari request
  const idempotencyKey = req.headers.get('Idempotency-Key');

  if (!idempotencyKey) {
    return NextResponse.json(
      {
        error: 'Header Idempotency-Key wajib disertakan',
      },
      {
        status: 400,
      }
    );
  }

  // 2. Cek apakah request dengan key ini sudah pernah diproses
  const cached = getCachedResponse(idempotencyKey);

  if (cached) {
    console.log(
      `Idempotency hit: ${idempotencyKey} - transaksi tidak dibuat ulang`
    );

    return NextResponse.json(cached.body, {
      status: cached.status,
    });
  }

  // 3. Baca nominal
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

  // 4. Buat Order ID baru
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
    // 5. Buat transaksi ke Midtrans
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

    const responseBody = {
      orderId,
      transactionStatus:
        chargeResponse.transaction_status,
      qrCodeUrl: qrAction?.url ?? null,
      expiryTime: chargeResponse.expiry_time,
    };

    // 6. Simpan response berdasarkan Idempotency-Key
    setCachedResponse(
      idempotencyKey,
      200,
      responseBody
    );

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error(
      'Gagal membuat transaksi:',
      error
    );

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