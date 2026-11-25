const pino = require('pino');
const { logLevel } = require('../helpers/configuration');

module.exports = pino({ level: logLevel, base: { service: 'rag' } });
