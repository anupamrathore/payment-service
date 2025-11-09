// src/controllers/paymentController.js
const pool = require('../db/config');

// Helper to round to 2 decimal places
const money = (n) => Number(Number(n).toFixed(2));

/**
 * 💳 POST /v1/payments/charge
 * Creates a new payment with idempotency support
 */
async function chargePayment(req, res) {
  const client = await pool.connect();
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Missing Idempotency-Key header' });
  }

  try {
    const { order_id, amount, currency = 'INR', payment_method = 'CARD' } = req.body || {};

    if (!order_id || !amount) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'order_id and amount are required' });
    }

    // Check for existing payment with the same Idempotency-Key
    const existing = await client.query(
      'SELECT * FROM payments WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    if (existing.rowCount > 0) {
      return res.status(200).json({
        idempotent: true,
        message: 'Duplicate request - returning existing charge',
        payment: existing.rows[0]
      });
    }

    await client.query('BEGIN');

    // Simulate successful payment
    const status = 'SUCCESS';
    const createdAt = new Date();

    const result = await client.query(
      `INSERT INTO payments (order_id, amount, currency, status, payment_method, idempotency_key, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [order_id, money(amount), currency, status, payment_method, idempotencyKey, createdAt]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Payment successful', payment: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Charge Error:', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message });
  } finally {
    client.release();
  }
}

/**
 * 💸 POST /v1/payments/refund
 * Refunds an existing successful payment
 */
async function refundPayment(req, res) {
  const client = await pool.connect();
  try {
    const { payment_id, amount } = req.body || {};

    if (!payment_id || !amount) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'payment_id and amount are required' });
    }

    const pay = await client.query('SELECT * FROM payments WHERE payment_id = $1', [payment_id]);
    if (pay.rowCount === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Payment not found' });
    }

    const payment = pay.rows[0];
    if (payment.status !== 'SUCCESS') {
      return res.status(400).json({ code: 'BUSINESS_RULE', message: 'Only successful payments can be refunded' });
    }

    await client.query('BEGIN');
    const refundResult = await client.query(
      `INSERT INTO refunds (payment_id, amount, created_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [payment_id, money(amount)]
    );
    await client.query('COMMIT');

    res.status(201).json({ message: 'Refund processed', refund: refundResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Refund Error:', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message });
  } finally {
    client.release();
  }
}

/**
 * 🔍 GET /v1/payments/:payment_id
 * Fetch a payment by its ID
 */
async function getPayment(req, res) {
  try {
    const { payment_id } = req.params;
    const { rows } = await pool.query('SELECT * FROM payments WHERE payment_id = $1', [payment_id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Payment not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get Payment Error:', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message });
  }
}

/**
 * 📄 GET /v1/payments
 * List payments with pagination
 */
async function listPayments(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const totalResult = await pool.query('SELECT COUNT(*) FROM payments');
    const total = parseInt(totalResult.rows[0].count);

    const paymentsResult = await pool.query(
      'SELECT * FROM payments ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      page,
      limit,
      total,
      data: paymentsResult.rows
    });
  } catch (err) {
    console.error('List Payments Error:', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch payments' });
  }
}

module.exports = {
  chargePayment,
  refundPayment,
  getPayment,
  listPayments
};
