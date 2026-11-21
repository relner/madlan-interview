const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const dealRoutes = require('./routes/deal');
const searchRoutes = require('./routes/search');
const assistantRoutes = require('./routes/assistant');
const leadRoutes = require('./routes/lead');

const app = express();

// Behind nginx: take the client IP from X-Forwarded-For (used by the rate limiter)
app.set('trust proxy', 1);

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (req, res) => res.status(200).json({ ok: true }));

app.use('/api/deal', dealRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/lead', leadRoutes);

module.exports = app;
