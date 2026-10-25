# Idempotent Payment Recorder — Design Notes

## 1. Problem Statement

A client submits a request to record a payment. The request may time out before the client receives a response.

The client retries, but the original request may already have been processed.

Multiple copies of the same logical request can also reach the application concurrently.

The system must prevent duplicate payment records while ensuring that retries do not silently change the original payment details.

## 2. Core Requirements

The payment recorder must:

1. Accept an idempotency key and a payment amount.
2. Reject invalid inputs.
3. Generate a unique payment ID for a new payment.
4. Persist valid payment records.
5. Return the original record for an identical retry.
6. Reject reuse of an idempotency key with a different amount.
7. Prevent concurrent requests from creating duplicate records.
8. Preserve existing payment data when a conflicting request arrives.

## 3. Payment States

The recorder uses three conceptual outcomes:

- **Not recorded:** No payment record exists for the idempotency key.
- **Recorded:** A payment record has been successfully stored.
- **Conflict:** The idempotency key already exists, but the requested amount differs from the stored amount.

These are conceptual outcomes rather than a complete payment lifecycle state machine.

## 4. Failure Scenarios

### 4.1 Duplicate requests

**Scenario:** A client submits the same request multiple times.

**Risk:** Multiple records could represent one logical operation.

**Design decision:** Use an idempotency key and enforce its uniqueness in PostgreSQL.

### 4.2 Lost response

**Scenario:** The database stores the payment, but the response never reaches the client.

**Risk:** The client may retry an operation that has already succeeded.

**Design decision:** An identical retry returns the existing payment instead of creating another record.

### 4.3 Conflicting request

**Scenario:** A client reuses an existing idempotency key with a different amount.

**Risk:** The original payment could be overwritten or the new request could be incorrectly accepted.

**Design decision:** Compare the requested amount with the existing record and reject the conflicting request.

### 4.4 Concurrent requests

**Scenario:** Multiple requests with the same idempotency key arrive at approximately the same time.

**Risk:** Application-level checks alone may allow duplicate records.

**Design decision:** Enforce uniqueness using a PostgreSQL constraint. The database is the final authority for whether a key can be inserted.

### 4.5 Process restart

**Scenario:** The Node.js process stops and starts again.

**Risk:** In-memory payment records disappear.

**Design decision:** Use PostgreSQL for persistent storage.

## 5. Database Design

The `payments` table contains:

- `id UUID PRIMARY KEY`
- `idempotency_key TEXT NOT NULL UNIQUE`
- `amount BIGINT NOT NULL CHECK (amount > 0)`

### Why use a unique constraint?

The application must not be the only component responsible for preventing duplicate keys.

A PostgreSQL unique constraint protects the data even when concurrent requests attempt to insert the same key.

### Why use a positive-amount constraint?

Application validation provides useful error messages, while the database constraint protects data integrity if another code path attempts an invalid insert.

### Why use UUIDs?

UUIDs provide unique payment identifiers without requiring the application to coordinate a sequential identifier across requests.

## 6. Idempotent Insert Strategy

The database-backed implementation uses:

```sql
INSERT INTO payments (id, idempotency_key, amount)
VALUES ($1, $2, $3)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id, idempotency_key, amount;
```

The operation has two possible outcomes.

**A new row is inserted:** The application returns the newly stored payment.

**No row is returned:** The application queries the existing record using the idempotency key, compares the stored amount with the requested amount, and either returns the original payment or rejects the conflicting request.

Database errors unrelated to the expected uniqueness conflict should not be treated as successful retries.

## 7. Parameterized SQL

The implementation uses PostgreSQL parameters such as `$1`, `$2`, and `$3` instead of constructing SQL by concatenating input strings.

This separates SQL instructions from supplied values and helps prevent SQL injection.

Parameterized queries should be used for database operations involving client-provided values.

## 8. Input Validation

The application checks that:

- The idempotency key is not empty or whitespace-only.
- The amount is a positive JavaScript safe integer.
- A repeated key is associated with the same amount as the original record.

Validation occurs before attempting to insert a new payment.

The database also enforces its own constraints. Application validation and database constraints serve complementary purposes.

## 9. Concurrency and Consistency

The unique constraint ensures that two concurrent inserts cannot both create rows with the same idempotency key.

The `ON CONFLICT` clause allows a request that loses the insert race to retrieve and evaluate the existing record.

The current tests cover:

- Multiple concurrent requests with the same key and amount.
- Concurrent requests with the same key but different amounts.

The expected outcomes are one stored record for an identical group of requests, and one accepted request with one rejected request when the competing amounts differ.

More complex transaction isolation levels, transient database failures, and retry policies would require additional design and testing.

## 10. Testing Strategy

The project contains tests for both the in-memory and PostgreSQL implementations.

The tests cover:

- Successful payment recording.
- Database persistence.
- Identical retries.
- Conflicting amounts.
- Empty and whitespace-only keys.
- Invalid amounts, including `NaN`.
- Concurrent identical requests.
- Concurrent requests with conflicting amounts.
- Database connectivity.

Database integration tests use a dedicated test database.

Tests should never clear or modify a production database.

## 11. Current Limitations

The current implementation is intentionally small.

It does not yet provide:

- An HTTP API.
- Payment-provider integration or callback verification.
- Authentication or authorization.
- A double-entry ledger.
- Payment settlement or reconciliation.
- Idempotency-key expiration or retention policies.
- Comprehensive handling of transient database errors.
- Production monitoring and operational recovery procedures.

The implementation records payment data; it does not prove that money has actually moved.

## 12. Future Improvements

Potential improvements include:

1. Expose the recorder through an HTTP API.
2. Add API-level validation and consistent error responses.
3. Add integration tests for HTTP requests.
4. Define a formal error model.
5. Improve environment configuration and deployment practices.
6. Add database migration management.
7. Introduce transaction and retry strategies where required.
8. Explore a ledger-based design before integrating real payment flows.

These improvements should be introduced incrementally, with tests protecting existing behavior.