const { embeddingModel, modelCacheDir } = require('../helpers/configuration');

// e5 models expect a prefix. "query: " on both sides is the recommended form for symmetric matching
// (a short wish against short example phrases).
const PREFIX = 'query: ';

let extractorPromise = null;

// Loads the model once. allowRemote is true only for the build-time download; at runtime the model
// must already be in the image, so a missing model fails at startup instead of on a buyer's request.
function load({ allowRemote = false } = {}) {
    if (!extractorPromise) {
        extractorPromise = import('@huggingface/transformers').then(({ pipeline, env }) => {
            env.cacheDir = modelCacheDir;
            env.allowRemoteModels = allowRemote;
            return pipeline('feature-extraction', embeddingModel, { dtype: 'q8' });
        });
    }
    return extractorPromise;
}

// texts → unit vectors (mean pooling, normalized: cosine similarity = dot product)
async function embed(texts) {
    const extractor = await load();
    const output = await extractor(texts.map((t) => PREFIX + t), { pooling: 'mean', normalize: true });
    return output.tolist();
}

module.exports = { load, embed };
