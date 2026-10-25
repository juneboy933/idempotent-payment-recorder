import 'dotenv/config';
import { Pool } from 'pg';

const testPool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    database: 'payment_recorder_test',
    user: 'payment_app',
    password: process.env.TEST_DB_PASSWORD,
});

export { testPool };
