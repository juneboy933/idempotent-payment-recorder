import test from 'node:test';
import assert from 'node:assert';
import { beforeEach } from 'node:test';
import { payments, recordPayment } from './payments';

beforeEach(() => {
    payments.length = 0; // Clear the payments array before each test
})

test('Records a valid payment', () => {
    const result1 = recordPayment('abc123', 100);
    const result2 = recordPayment('abc123', 100);

    assert.equal(result1.idempotencyKey, 'abc123');
    assert.equal(result1.amount, 100);

    assert.equal(result1.id, result2.id);

    assert.equal(result2.idempotencyKey, 'abc123');
    assert.equal(result2.amount, 100);

    assert.equal(payments.length, 1);
})

test('Rejects a conflicting payment amount with the same idempotency key', () => {
    const result = recordPayment('abc123', 100);

    assert.equal(result.amount, 100);
    assert.throws(
        () => recordPayment('abc123', 200),
        /different amount/
    )
    assert.equal(payments.length, 1);
})

test('Rejects an invalid payment amount', () => {
    assert.throws(
        () => recordPayment('abc123', -100),
        /invalid amount/
    )

    assert.throws(
        () => recordPayment('abc123', 10.5),
        /invalid amount/
    )
    assert.equal(payments.length, 0);
})

test('Rejects an empty or a whitespace-only idempotency key', () => {
    assert.throws(
        () => recordPayment('', 100),
        /Missing idempotency key/
    )
    assert.throws(
        () => recordPayment(' ', 100),
        /Missing idempotency key/
    )
    assert.equal(payments.length, 0);
})

test('Rejects a NaN as a payment amount', () => {
    assert.throws(
        () => recordPayment('abc123', NaN),
        /invalid amount/
    )
    assert.equal(payments.length, 0);
})

test('Rejects an undefined payment amount', () => {
    assert.throws(
        () => recordPayment('abc123', undefined as unknown as number),
        /invalid amount/
    )
    assert.equal(payments.length, 0)
})

test('Creates only one payment after multiple identical requests', () => {
    const result1 = recordPayment('abc123', 100);
    const result2 = recordPayment('abc123', 100);
    const result3 = recordPayment('abc123', 100);
    const result4 = recordPayment('abc123', 100);
    const result5 = recordPayment('abc123', 100);

    assert.equal(result1.id, result2.id);
    assert.equal(result1.id, result3.id);
    assert.equal(result1.id, result4.id);
    assert.equal(result1.id, result5.id);

    assert.equal(payments.length, 1);
})

test('The original payment remains unchanged after a conflicting request', () => {
    const originalPayment = recordPayment('abc123', 100);

    assert.throws(
        () => recordPayment('abc123', 200),
        /different amount/
    )

    assert.equal(payments[0].id, originalPayment.id);
    assert.equal(payments[0].amount, 100);
    assert.equal(payments[0].idempotencyKey, 'abc123');
    assert.equal(payments.length, 1);
})