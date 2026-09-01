'use client';

import { useState } from 'react';

export default function CheckoutPage() {
  const [amount, setAmount] = useState(50000);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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