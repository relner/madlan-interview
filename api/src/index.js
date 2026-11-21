const app = require('./app');
const { port } = require('./helpers/configuration');
const { connectDb } = require('./helpers/db');
const logger = require('./utils/logger');

const startServer = () => {
    app.listen(port, () => logger.info(`Server started on port ${port}`));
}

connectDb()
    .on('error', (error) => logger.error(error))
    .once('open', startServer);
