// Cleans data/deals_raw.csv and loads it into Mongo (WORK_PLAN.md section 5).
//
//   npm run seed                       — local (MONGO_URI from env, default localhost)
//   docker compose run --rm seed       — inside docker-compose
//
// The run is repeatable: it replaces the `deals` collection, clears the LLM cache
// (cached explanations depend on the data), and writes data/seed_report.json
// with every merged, flagged or excluded record.

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');

const { mongoURI } = require('../src/helpers/configuration');
const Deal = require('../src/models/Deal');
const LlmCache = require('../src/models/LlmCache');
const { normalizeRow, resolveDeals } = require('../src/utils/dealNormalize');

const RAW_FILE = path.join(__dirname, '..', 'data', 'deals_raw.csv');
const REPORT_FILE = path.join(__dirname, '..', 'data', 'seed_report.json');

function readCsv(file) {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(file)
            .pipe(csv({ mapHeaders: ({ header }) => header.replace(/^﻿/, '').trim() }))
            .on('data', (row) => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

function buildReport(rawRows, deals, crossRow) {
    const flagCounts = {};
    for (const d of deals) {
        for (const f of d.qualityFlags) flagCounts[f] = (flagCounts[f] || 0) + 1;
    }

    const cityLabels = {};
    const neighborhoodLabels = {};
    for (const d of deals) {
        const rawCity = (d.raw.city || '').trim();
        if (rawCity && rawCity !== d.city) cityLabels[rawCity] = d.city;
        const rawNeighborhood = (d.raw.neighborhood || '').trim();
        if (rawNeighborhood && rawNeighborhood !== d.neighborhood) neighborhoodLabels[rawNeighborhood] = d.neighborhood;
    }

    return {
        generatedAt: new Date().toISOString(),
        rawRows: rawRows.length,
        documents: deals.length,
        distinctDealIds: new Set(deals.map((d) => d.dealId)).size,
        includedInPriceStats: deals.filter((d) => d.includeInPriceStats).length,
        excluded: deals
            .filter((d) => !d.includeInPriceStats)
            .map((d) => ({ dealId: d.dealId, source: d.source, reason: d.exclusionReason })),
        flagCounts,
        cityAliasesApplied: cityLabels,
        neighborhoodAliasesApplied: neighborhoodLabels,
        cities: [...new Set(deals.map((d) => d.city))].sort(),
        ...crossRow,
        flaggedDeals: {
            price_per_sqm_mismatch: deals.filter((d) => d.qualityFlags.includes('price_per_sqm_mismatch'))
                .map((d) => ({ dealId: d.dealId, priceNis: d.priceNis, sizeSqm: d.sizeSqm, reported: d.pricePerSqmReported, calculated: d.pricePerSqmCalculated })),
            new_condition_old_building: deals.filter((d) => d.qualityFlags.includes('new_condition_old_building'))
                .map((d) => ({ dealId: d.dealId, yearBuilt: d.yearBuilt, dealYear: d.dealYear })),
            invalid_date: deals.filter((d) => d.qualityFlags.includes('invalid_date'))
                .map((d) => ({ dealId: d.dealId, raw: d.raw.deal_date }))
        }
    };
}

async function main() {
    const rawRows = await readCsv(RAW_FILE);
    const normalized = rawRows.map(normalizeRow);
    const { deals, report: crossRow } = resolveDeals(normalized);
    const report = buildReport(rawRows, deals, crossRow);

    await mongoose.connect(mongoURI);
    await Deal.deleteMany({});
    await Deal.insertMany(deals);
    await LlmCache.deleteMany({});
    await Deal.syncIndexes();
    await LlmCache.syncIndexes();
    await mongoose.disconnect();

    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

    console.log(`Raw rows:                ${report.rawRows}`);
    console.log(`Documents loaded:        ${report.documents} (${report.distinctDealIds} distinct deal ids)`);
    console.log(`Exact duplicates merged: ${crossRow.exactDuplicatesMerged.length}`);
    console.log(`Sources merged (agree):  ${crossRow.sourcesMerged.length}`);
    console.log(`Price conflicts:         ${crossRow.priceConflicts.length}`);
    console.log(`Other version conflicts: ${crossRow.versionConflicts.length}`);
    console.log(`In price statistics:     ${report.includedInPriceStats}`);
    console.log('Flags:', report.flagCounts);
    console.log(`Report: ${path.relative(process.cwd(), REPORT_FILE)}`);
    console.log('Restart the api container so it reloads form options.');
}

main().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
