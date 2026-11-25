// Loads data/concepts.js into the `concepts` collection.
// Upsert by id: the file overwrites title / examples / meaning / filters / basis, but `enabled` and
// concepts added only in the database are left alone.
// At the end it asks the running service to reload, so the changes are live at once. If the service is not
// running, that is fine: it reads the table at startup.
// Learned rows (source 'llm') are never touched by the seed.
const mongoose = require('mongoose');
const Concept = require('../src/models/Concept');
const concepts = require('../data/concepts');
const { mongoURI, serviceUrl } = require('../src/helpers/configuration');

async function notifyService() {
    try {
        const response = await fetch(`${serviceUrl}/concepts/reload`, { method: 'POST', signal: AbortSignal.timeout(60000) });
        console.log(`service reloaded: ${JSON.stringify(await response.json())}`);
    } catch (error) {
        console.log(`service not reloaded (${error.message}): it will read the table at startup`);
    }
}

async function seed() {
    await mongoose.connect(mongoURI);
    for (const { id, title, examples, meaning, filters, basis } of concepts) {
        await Concept.updateOne(
            { conceptId: id },
            { $set: { title, examples, meaning, filters, basis, source: 'seed' }, $setOnInsert: { enabled: true } },
            { upsert: true }
        );
    }
    console.log(`concepts seeded: ${concepts.length}, in collection: ${await Concept.countDocuments()}`);
    await mongoose.disconnect();
    await notifyService();
}

seed().catch((error) => { console.error(error); process.exit(1); });
