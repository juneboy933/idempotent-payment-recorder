import { randomUUID } from 'node:crypto';
import { testPool } from './test.db.ts';

type Payment = {
    id: string;
    idempotency_key: string;
    amount: number;
};

const recordPayment = async (
    idempotencyKey: string,
    amount: number
): Promise<Payment> => {
    // 1. Validate the idempotency key.
    if (idempotencyKey.trim().length === 0) {
        throw new Error(
            'Missing idempotency key, please provide a valid idempotency key'
        );
    }

    // 2. Validate the amount.
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error(
            'Amount must be a positive integer, invalid amount'
        );
    }

    // 3. Attempt to insert the payment.
    const id = randomUUID();

    const newPayment = await testPool.query<{
        id: string;
        idempotency_key: string;
        amount: string;
    }>(
        `
            INSERT INTO payments (id, idempotency_key, amount)
            VALUES ($1, $2, $3)
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING id, idempotency_key, amount
        `,
        [id, idempotencyKey, amount]
    );

    // 4. If inserted, return the new payment.
    if (newPayment.rows.length > 0) {
        const row = newPayment.rows[0];

        return {
            id: row.id,
            idempotency_key: row.idempotency_key,
            amount: Number(row.amount),
        };
    }

    // 5. The key already exists. Fetch the original payment.
    const existingPayment = await testPool.query<{
        id: string;
        idempotency_key: string;
        amount: string;
    }>(
        `
            SELECT id, idempotency_key, amount
            FROM payments
            WHERE idempotency_key = $1
        `,
        [idempotencyKey]
    );

    const existingRow = existingPayment.rows[0];

    // 6. Guard against an unexpected database state.
    if (!existingRow) {
        throw new Error('Unable to retrieve the existing payment');
    }

    // 7. Reject a different amount for the same key.
    if (Number(existingRow.amount) !== amount) {
        throw new Error(
            'Idempotency key already used with a different amount'
        );
    }

    // 8. Return the original payment.
    return {
        id: existingRow.id,
        idempotency_key: existingRow.idempotency_key,
        amount: Number(existingRow.amount),
    };
};

export { recordPayment };