import { NextResponse } from 'next/server';
import { coreApi } from '@/lib/midtrans';
import { db } from '@/lib/db';

export async function GET() {
  const internalRecords = db.all();

  const results = [];

  for (const record of internalRecords) {
    try {
      // Ambil status resmi langsung dari Midtrans
      const providerStatus =
        await coreApi.transaction.status(record.orderId);

      const internalStatus = record.status;
      const providerTransactionStatus =
        providerStatus.transaction_status;

      // settlement dan capture sama-sama dianggap sukses
      const matches =
        (internalStatus === 'settlement' &&
          ['settlement', 'capture'].includes(
            providerTransactionStatus
          )) ||
        internalStatus === providerTransactionStatus;

      results.push({
        orderId: record.orderId,

        internalStatus,

        providerStatus: providerTransactionStatus,

        grossAmountInternal: record.grossAmount,

        grossAmountProvider:
          providerStatus.gross_amount,

        matches,
      });
    } catch (error) {
      results.push({
        orderId: record.orderId,

        internalStatus: record.status,

        providerStatus: 'TIDAK DITEMUKAN',

        matches: false,

        error: String(error),
      });
    }
  }

  const mismatches = results.filter(
    (result) => !result.matches
  );

  return NextResponse.json({
    checkedAt: new Date().toISOString(),

    totalTransactions: results.length,

    totalMismatches: mismatches.length,

    mismatches,

    allResults: results,
  });
}