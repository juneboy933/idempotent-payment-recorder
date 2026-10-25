import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert';
import { testPool } from './test.db.ts';

test('Connect to the test database', async () => {
    try {
        const result = await testPool.query('SELECT current_database() AS name');

        assert.equal(result.rows[0].name, 'payment_recorder_test');
    } finally {
        await testPool.end();
    }
})
