'use client';

import { useState } from 'react';

export default function CheckoutPage() {
  const [amount, setAmount] = useState(50000);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // NORMAL CHECKOUT
  // ==========================================
  async function handleCheckout() {
    setLoading(true);

    try {
      const idempotencyKey = crypto.randomUUID();

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          grossAmount: amount,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setQrCodeUrl(data.qrCodeUrl);
        setOrderId(data.orderId);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat membuat transaksi');
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // REQUEST TIMEOUT TEST
  // ==========================================
  async function handleTimeoutTest() {
    const idempotencyKey = crypto.randomUUID();

    console.log('Idempotency Key:', idempotencyKey);

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 100);

    try {
      await fetch('/api/transactions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          grossAmount: 50000,
        }),
      });

      console.log('Request pertama selesai sebelum timeout');
    } catch (error) {
      console.log(
        'Request diputus karena timeout. Akan retry dengan key yang sama:',
        idempotencyKey
      );
    } finally {
      clearTimeout(timeout);
    }

    // Tunggu supaya request pertama sempat diproses server
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('Melakukan retry...');

    try {
      const retryResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          grossAmount: 50000,
        }),
      });

      const retryData = await retryResponse.json();

      console.log('Hasil retry:', retryData);

      if (retryResponse.ok) {
        alert(
          `Retry berhasil!\nOrder ID: ${retryData.orderId}`
        );
      } else {
        alert(`Retry gagal: ${retryData.error}`);
      }
    } catch (error) {
      console.error('Retry gagal:', error);
      alert('Retry gagal');
    }
  }

  // ==========================================
  // UI
  // ==========================================
  return (
    <main
      style={{
        maxWidth: 480,
        margin: '48px auto',
        fontFamily: 'sans-serif',
      }}
    >
      <h1>Praktikum Sandbox QRIS</h1>

      <label>
        Nominal (IDR)

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={{
            display: 'block',
            margin: '8px 0',
            padding: 8,
            width: '100%',
          }}
        />
      </label>

      <button
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? 'Memproses...' : 'Buat Transaksi QRIS'}
      </button>

      <div style={{ marginTop: 16 }}>
        <button onClick={handleTimeoutTest}>
          Simulasi Request Timeout
        </button>
      </div>

      {orderId && (
        <p>
          Order ID: {orderId}
        </p>
      )}

      {qrCodeUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrCodeUrl}
          alt="QRIS code"
          style={{
            marginTop: 16,
            width: 240,
          }}
        />
      )}
    </main>
  );
}