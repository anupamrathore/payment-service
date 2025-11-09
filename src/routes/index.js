// src/routes/index.js
const express = require('express');
const router = express.Router();
const {
  chargePayment,
  refundPayment,
  getPayment,
  listPayments
} = require('../controllers/paymentController');

// Health check endpoint
router.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Payment Service',
    time: new Date().toISOString()
  });
});

// 💳 Payment charge
router.post('/payments/charge', chargePayment);

// 💸 Refund a payment
router.post('/payments/refund', refundPayment);

// List payments with pagination
router.get('/payments', listPayments);

// Get payment by ID
router.get('/payments/:payment_id', getPayment);

module.exports = router;
