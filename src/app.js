const express = require('express');
require('dotenv').config();
const routes = require('./routes');

const app = express();
app.use(express.json());

// Base route
app.use('/v1', routes);

app.use((req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Endpoint not found' });
});

app.get('/v1/healthz', (req, res) => {
  res.json({ status: 'ok', service: 'Payment Service', time: new Date() });
});

const port = Number(process.env.PORT || 3004);
app.listen(port, '0.0.0.0', () => {
  console.log(`💳 Payment Service running on port ${port}`);
});
