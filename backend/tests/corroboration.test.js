// Unit tests for cross-metric corroboration (F2 fix — Yes.docx's
// expansion-coherence question). Pure functions, no DB.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const test = require('node:test');
const assert = require('node:assert');
const { correlationSummary } = require('../services/anomalyService');

test('unbalanced expansion: employment +68.9% with nothing else moving is NOT corroborated', () => {
    const diff = [
        { field: 'permanentEmployees', old: 740, new: 1250, change_pct: 68.9 },
        { field: 'waterConsumption', old: 800, new: 800, change_pct: 0 }
    ];
    const corr = correlationSummary(diff, 'permanentEmployees', 10);
    assert.strictEqual(corr.corroborated, false);
    assert.deepStrictEqual(corr.related, {
        investmentAmount: null,
        powerUsage: null,
        waterConsumption: { pct: 0 }
    });
});

test('coherent expansion: employment +68.9% with power +40% IS corroborated', () => {
    const diff = [
        { field: 'permanentEmployees', old: 740, new: 1250, change_pct: 68.9 },
        { field: 'powerUsage', old: 30000, new: 42000, change_pct: 40 },
        { field: 'investmentAmount', old: 50000000, new: 50500000, change_pct: 1 }
    ];
    const corr = correlationSummary(diff, 'permanentEmployees', 10);
    assert.strictEqual(corr.corroborated, true);
    assert.deepStrictEqual(corr.related.powerUsage, { pct: 40 });
    assert.deepStrictEqual(corr.related.investmentAmount, { pct: 1 }); // moved but below threshold
});

test('production line items corroborate a power-demand change', () => {
    const diff = [
        { field: 'powerUsage', old: 30000, new: 55000, change_pct: 83.3 },
        { field: 'production: Bearings', old: { quantity: 1000 }, new: { quantity: 1600 }, change_pct: 60 },
        { field: 'production: Axles', old: { quantity: 500 }, new: { quantity: 620 }, change_pct: 24 }
    ];
    const corr = correlationSummary(diff, 'powerUsage', 10);
    assert.strictEqual(corr.corroborated, true);
    assert.strictEqual(corr.related.production.count, 2);
});

test('unrelated metric changes do not corroborate', () => {
    const diff = [
        { field: 'waterConsumption', old: 800, new: 1400, change_pct: 75 },
        { field: 'csrSpent', old: 1000000, new: 2000000, change_pct: 100 } // not a related domain
    ];
    const corr = correlationSummary(diff, 'waterConsumption', 10);
    assert.strictEqual(corr.corroborated, false);
    assert.strictEqual(corr.related['production'], null);
});

test('metrics with no declared relations never raise corroboration expectations', () => {
    const corr = correlationSummary([{ field: 'wasteRecycledPct', old: 60, new: 90, change_pct: 50 }], 'wasteRecycledPct', 10);
    assert.strictEqual(corr.corroborated, false);
    assert.deepStrictEqual(corr.related, {});
});
