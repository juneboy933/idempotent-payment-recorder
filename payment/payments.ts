const payments: {
    id: string, 
    idempotencyKey: string, 
    amount: number
}[] = [];

function recordPayment(idempotencyKey: string, amount: number) {
    // Check if the idempotencyKey was provided
    if(idempotencyKey.trim().length === 0)
        throw new Error('Missing idempotency key, please provide a valid idempotency key.');

    // Check if the amount is valid (greater than 0)
    if(amount <= 0 || !Number.isSafeInteger(amount)) 
        throw new Error('Amount must be a positive integer, invalid amount.');

    // Check if idempotencyKey exists, if it doesn't the create a new payment record.
    const existingPayment = payments.find(
        payment => payment.idempotencyKey === idempotencyKey
    );

    if (existingPayment) {
        if (existingPayment.amount !== amount) {
            throw new Error('Idempotency key already used with a different amount');
        }
        return existingPayment;
    }

    const id = crypto.randomUUID();
    const newPayment = {
        id,
        idempotencyKey, 
        amount};
    payments.push(newPayment);
    return newPayment;
};

export { payments, recordPayment };