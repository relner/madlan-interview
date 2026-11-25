const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');
const indexService = require('./services/index.service');
const { load } = require('./services/embedding.service');
const { port, mongoURI, reloadIntervalMs } = require('./helpers/configuration');

async function start() {
    await mongoose.connect(mongoURI);
    // The model is loaded before listening: the first buyer request must not pay for it
    await load();
    logger.info(await indexService.reload(), 'concepts loaded');

    if (reloadIntervalMs > 0) {
        setInterval(() => {
            indexService.reload().catch((error) => logger.warn({ err: error.message }, 'concept reload failed'));
        }, reloadIntervalMs).unref();
    }

    app.listen(port, () => logger.info({ port }, 'rag listening'));
}

start().catch((error) => {
    logger.error({ err: error.message }, 'rag failed to start');
    process.exit(1);
});
