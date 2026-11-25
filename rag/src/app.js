const express = require('express');
const concepts = require('./routes/concepts');
const { health } = require('./controllers/search');

// Not exposed through nginx: only the api container calls it, on the internal docker network
const app = express();
app.use(express.json({ limit: '10kb' }));
app.get('/health', health);
app.use('/concepts', concepts);

module.exports = app;
