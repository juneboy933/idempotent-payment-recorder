import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { recordPayment } from './db-payment.ts';
import { testPool } from './test.db.ts';

beforeEach( async () => {
    await testPool.query('DELETE FROM payments');
});

after( async () => {
    await testPool.end();
});

test('Record a payment', async () => {
    const payment = await recordPayment('test-001', 10000);

    assert.ok(payment.id);
    assert.equal(payment.idempotency_key, 'test-001');
    assert.equal(payment.amount, 10000);

    const result = await testPool.query(
        `
            SELECT * FROM payments 
            WHERE idempotency_key = $1
        `, ['test-001']
    );

    assert.equal(result.rows.length, 1);
})

test('Return the same payment for repeated identical requests', async () => {
    const first = await recordPayment('test-002', 10000);
    const second = await recordPayment('test-002', 10000);

    assert.equal(first.id, second.id);
    assert.equal(first.amount, second.amount);

    const result = await testPool.query(
        `
            SELECT COUNT(*) AS count FROM payments
            WHERE idempotency_key = $1
        `, ['test-002']
    )
    assert.equal(Number(result.rows[0].count), 1);
})

test('Reject a different amount for the same idempotency key', async () => {
    await recordPayment('test-003', 10000);

    await assert.rejects(
        recordPayment('test-003', 20000),
        /different amount/
    );

    const result = await testPool.query(
        `
            SELECT amount FROM payments
            WHERE idempotency_key = $1
        `, ['test-003']
    );

    assert.equal(result.rows.length, 1);
    assert.equal(Number(result.rows[0].amount), 10000);
})

test('Handle concurrent requests with the same idempotency key', async () => {
    const requests = Array.from(
        { length: 10 },
        () => recordPayment('test-004', 10000)
    );
    const results = await Promise.all(requests);
    const ids = results.map(r => r.id);

    assert.equal(new Set(ids).size, 1);

    const result = await testPool.query(
        `
            SELECT COUNT(*) AS count FROM payments
            WHERE idempotency_key = $1
        `, ['test-004']
    )

    assert.equal(Number(result.rows[0].count), 1);
})

test('Reject concurrent requests with different amounts for the same idempotency key', async () => {
    const requests = [
        recordPayment('test-005', 10000),
        recordPayment('test-005', 20000),
    ];

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length,1);

    const result = await testPool.query(
        `
            SELECT id, idempotency_key, amount
            FROM payments
            WHERE idempotency_key = $1
        `, ['test-005']
    )

    assert.equal(result.rows.length, 1);
    assert.ok(
        [10000, 20000].includes(Number(result.rows[0].amount))
    )
})

test('Reject empty or white-space idempotency key', async () => {
    await assert.rejects(
        recordPayment('', 10000),
        /Missing idempotency/
    );

    await assert.rejects(
        recordPayment(' ', 10000),
        /Missing idempotency/
    );

    const result = await testPool.query(`SELECT COUNT(*) FROM payments`)

    assert.equal(Number(result.rows[0].count), 0);
})

test('Reject invalid amount', async () => {
    const invalidAmounts = [
        0,
        -100,
        10.5,
        NaN,
        Infinity,
        Number.MAX_SAFE_INTEGER + 1,
    ];

    for (const amount of invalidAmounts) {
        await assert.rejects(
            recordPayment(`invalid-${String(amount)}`, amount),
            /invalid amount/
        )
    }

    const result = await testPool.query(`SELECT COUNT(*) FROM payments`);

    assert.equal(Number(result.rows[0].count), 0);
})