import { Pool } from 'pg';

const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    database: 'payment_recorder',
    user: 'payment_app',
    password: process.env.DB_PASSWORD,
});

export { pool };