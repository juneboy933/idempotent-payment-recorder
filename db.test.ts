import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert';
import { pool } from './db.ts';

test('Connect to PostreSQL and returns the name', async () => {
    try {
        const result = await pool.query('SELECT current_database() AS name');

        assert.equal(result.rows[0].name, 'payment_recorder');
    } finally {
        await pool.end();
    }
})