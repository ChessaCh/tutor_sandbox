export type TransactionRecord = {
  orderId: string;
  grossAmount: number;
  status: 'pending' | 'settlement' | 'failure' | 'expire' | 'cancel';
  createdAt: string;
  updatedAt: string;
  providerTransactionId?: string;
  rawNotification?: unknown;
};

const store = new Map<string, TransactionRecord>();

export const db = {
  create(record: TransactionRecord) {
    store.set(record.orderId, record);
    return record;
  },

  get(orderId: string) {
    return store.get(orderId);
  },

  update(orderId: string, patch: Partial<TransactionRecord>) {
    const existing = store.get(orderId);

    if (!existing) {
      return undefined;
    }

    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    store.set(orderId, updated);

    return updated;
  },

  all() {
    return Array.from(store.values());
  },
};