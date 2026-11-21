const pino = require('pino');
const { logLevel } = require('../helpers/configuration');

const logger = pino({
  level: logLevel
});

module.exports = logger;
