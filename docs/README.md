# Idempotent Payment Recorder

## 1. Project Overview

This project implements an idempotent payment recorder using TypeScript and PostgreSQL.

It demonstrates how to validate payment requests, persist payment records, prevent duplicate records, and handle repeated or concurrent requests safely.

The project contains two implementations:

- **In-memory implementation:** Stores payment records in a JavaScript array.
- **PostgreSQL implementation:** Persists payment records in a relational database.

The PostgreSQL implementation is the main focus of the database exercise.

## 2. Learning Objectives

By completing this project, I aim to understand:

- TypeScript functions, types, and asynchronous operations.
- Input validation and error handling.
- Unit and integration testing with Node.js.
- PostgreSQL database connections using the `pg` library.
- SQL queries and parameterized statements.
- Database constraints and data integrity.
- Idempotency and safe request retries.
- Concurrent requests and database-level uniqueness.
- Separation of development and test databases.

## 3. Technology Stack

- TypeScript
- Node.js
- PostgreSQL
- `pg` — PostgreSQL client for Node.js
- `tsx` — Runs TypeScript files and tests
- `node:test` — Test runner
- `node:assert/strict` — Test assertions
- `dotenv` — Loads environment variables

## 4. How Idempotency Works

Idempotency means that repeating an operation with the same idempotency key and the same request details does not create another record.

The recorder follows these rules:

1. A new idempotency key creates a payment record if the request is valid.
2. Repeating the same key with the same amount returns the original payment.
3. Reusing a key with a different amount is rejected.
4. Invalid requests must not create payment records.
5. Concurrent requests using the same key must not create duplicate records.

The idempotency key identifies the logical operation, while the payment ID identifies the stored payment record.

## 5. Project Structure

```text
17-10-2026/
├── .env
├── .gitignore
├── db-payment.ts
├── db-payment.test.ts
├── db.ts
├── db.test.ts
├── test.db.ts
├── test-db.test.ts
├── payment/
│   ├── payments.ts
│   └── payment.test.ts
└── docs/
    ├── README.md
    └── design-notes.md
```

The npm dependencies and package configuration are currently maintained in the parent directory.

### Important files

- `payment/payments.ts`: In-memory payment recorder.
- `payment/payment.test.ts`: Tests for the in-memory implementation.
- `db-payment.ts`: PostgreSQL-backed payment recorder.
- `db-payment.test.ts`: Tests for persistence, idempotency, validation, and concurrent requests.
- `db.ts`: Development database connection.
- `db.test.ts`: Development database connection test.
- `test.db.ts`: Test database connection.
- `test-db.test.ts`: Test database connection test.
- `docs/design-notes.md`: Architecture decisions, failure scenarios, and limitations.

## 6. Prerequisites

Install or configure:

- Node.js and npm.
- PostgreSQL.
- The project's npm dependencies.

The current local PostgreSQL configuration uses port `5433`.

The project uses two databases:

- `payment_recorder` for development.
- `payment_recorder_test` for automated database tests.

The test database must remain separate from the development database.

## 7. Environment Configuration

Create a `.env` file in the project directory.

Configure these variables with your local database credentials:

```dotenv
DB_PASSWORD=your_local_development_password
TEST_DB_PASSWORD=your_local_test_password
```

Replace the example values locally. Never commit real credentials to version control.

The development and test connection modules use these variables for database authentication.

## 8. Database Schema

The `payments` table contains:

| Column | Purpose |
|---|---|
| `id` | Unique payment identifier stored as a UUID |
| `idempotency_key` | Unique key identifying a logical request |
| `amount` | Positive payment amount stored as a PostgreSQL `BIGINT` |

The database enforces these constraints:

- `id` is the primary key.
- `idempotency_key` must be unique and cannot be null.
- `amount` must be greater than zero.

These constraints provide a final layer of data integrity even when multiple requests reach the application concurrently.

## 9. Running the Tests

From the project directory, run:

```bash
npx tsx --test
```

The command runs the discovered test files.

The database integration tests require PostgreSQL to be running, the environment variables to be configured, and the required databases and tables to exist.

The suite currently covers:

- Recording a valid payment.
- Persisting a payment in PostgreSQL.
- Returning the original record for an identical retry.
- Rejecting a conflicting amount for an existing key.
- Rejecting empty or whitespace-only keys.
- Rejecting invalid payment amounts.
- Handling concurrent identical requests.
- Handling concurrent requests with conflicting amounts.
- Connecting to the development and test databases.

The current verified result was **17 tests passed, 0 failed**.

## 10. Limitations

This project is a learning exercise, not a complete payment-processing system.

It does not yet include:

- An HTTP API.
- M-Pesa or another payment-provider integration.
- Payment-provider callback verification.
- Authentication and authorization.
- A double-entry accounting ledger.
- A production deployment configuration.
- Monitoring, alerting, or operational recovery procedures.
- A comprehensive strategy for database failures and retryable transactions.

The PostgreSQL implementation improves persistence and concurrency safety, but it does not by itself make the entire application production-ready.

## 11. Next Learning Stage

The next stage is to expose the payment recorder through an HTTP API.

That stage will introduce request handling, HTTP status codes, API-level validation, and integration testing of the complete request-response flow.

Frameworks such as NestJS and tools such as Prisma, Redis, and BullMQ can be introduced later, once the underlying database and idempotency concepts are understood.