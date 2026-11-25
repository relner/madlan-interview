// Build step: downloads the embedding model into the image, so the service never needs the network at runtime
const { load } = require('../src/services/embedding.service');

load({ allowRemote: true })
    .then(() => { console.log('model ready'); process.exit(0); })
    .catch((error) => { console.error(error); process.exit(1); });
