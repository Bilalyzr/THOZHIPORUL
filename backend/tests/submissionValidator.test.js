// Unit tests for the server-side submission validator (Phase 1).
// Run: npm test   (node --test). Uses the live dev DB for the cached
// intelligence_rules — seeded defaults, no test data is written.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const test = require('node:test');
const assert = require('node:assert');
const { validateSubmission, toNumber, currentPeriod } = require('../validators/submissionValidator');

const BASE = { periodYear: 2025, periodQuarter: 4 };

test('TEST 1 — negative employees are rejected with a field error', async () => {
    const v = await validateSubmission({ ...BASE, permanentEmployees: -50, investmentAmount: 50000000, annualTurnover: 90000000 });
    assert.strictEqual(v.ok, false);
    const e = v.errors.find(x => x.field === 'permanentEmployees');
    assert.ok(e, 'field error present');
    assert.match(e.message, /minimum/i);
    assert.strictEqual(e.code, 'OUT_OF_RANGE');
});

test('TEST 2 — negative water consumption is rejected', async () => {
    const v = await validateSubmission({ ...BASE, waterConsumption: -9999, investmentAmount: 1, annualTurnover: 1, permanentEmployees: 1 });
    assert.strictEqual(v.ok, false);
    assert.ok(v.errors.some(x => x.field === 'waterConsumption' && x.code === 'OUT_OF_RANGE'));
});

test('TEST 3 — absurd investment is rejected by the configurable range', async () => {
    const v = await validateSubmission({ ...BASE, investmentAmount: 99999999999999, annualTurnover: 90000000, permanentEmployees: 10 });
    assert.strictEqual(v.ok, false);
    assert.ok(v.errors.some(x => x.field === 'investmentAmount' && x.code === 'OUT_OF_RANGE'));
});

test('missing required fields produce REQUIRED errors — never coerced to 0', async () => {
    const v = await validateSubmission({ ...BASE, waterConsumption: 100 });
    assert.strictEqual(v.ok, false);
    for (const f of ['investmentAmount', 'annualTurnover', 'permanentEmployees']) {
        assert.ok(v.errors.some(x => x.field === f && x.code === 'REQUIRED'), f);
    }
    // Explicit nulls stay null in the normalized payload.
    assert.strictEqual(v.normalized.investmentAmount, null);
});

test('valid payload passes and preserves explicit nulls', async () => {
    const v = await validateSubmission({
        ...BASE, investmentAmount: 150000000, annualTurnover: 320000000,
        permanentEmployees: 300, contractEmployees: 150, exportRevenue: null
    });
    assert.strictEqual(v.ok, true, JSON.stringify(v.errors));
    assert.strictEqual(v.normalized.exportRevenue, null);
    assert.strictEqual(v.normalized.permanentEmployees, 300);
});

test('non-numeric strings are rejected (no silent 500 from a DB cast)', async () => {
    const v = await validateSubmission({ ...BASE, annualTurnover: 'abc', investmentAmount: 1, permanentEmployees: 1 });
    assert.strictEqual(v.ok, false);
    assert.ok(v.errors.some(x => x.field === 'annualTurnover' && x.code === 'NOT_NUMERIC'));
});

test('numeric strings are coerced (form-friendly)', async () => {
    const v = await validateSubmission({ ...BASE, investmentAmount: '150000000', annualTurnover: '320000000', permanentEmployees: '300' });
    assert.strictEqual(v.ok, true, JSON.stringify(v.errors));
    assert.strictEqual(v.normalized.investmentAmount, 150000000);
});

test('future periods cannot be filed', async () => {
    const cur = currentPeriod();
    const nextQ = cur.quarter === 4 ? { y: cur.year + 1, q: 1 } : { y: cur.year, q: cur.quarter + 1 };
    const v = await validateSubmission({ periodYear: nextQ.y, periodQuarter: nextQ.q, investmentAmount: 1, annualTurnover: 1, permanentEmployees: 1 });
    assert.strictEqual(v.ok, false);
    assert.ok(v.errors.some(x => x.code === 'FUTURE_PERIOD'));
});

test('workforce split cannot exceed total (cross-field rule)', async () => {
    const v = await validateSubmission({ ...BASE, investmentAmount: 1, annualTurnover: 1, permanentEmployees: 10, contractEmployees: 5, womenEmployees: 20 });
    assert.strictEqual(v.ok, false);
    assert.ok(v.errors.some(x => x.code === 'SPLIT_EXCEEDS_TOTAL'));
});

test('operational status is validated against the enum', async () => {
    const bad = await validateSubmission({ ...BASE, operationalStatus: 'SOMETHING', investmentAmount: 1, annualTurnover: 1, permanentEmployees: 1 });
    assert.ok(bad.errors.some(x => x.field === 'operationalStatus'));
    const good = await validateSubmission({ ...BASE, operationalStatus: 'TEMPORARILY_CLOSED', investmentAmount: 1, annualTurnover: 1, permanentEmployees: 1 });
    assert.strictEqual(good.normalized.operationalStatus, 'TEMPORARILY_CLOSED');
});

test('production items: unit allowlist, negatives, duplicates', async () => {
    const v = await validateSubmission({
        ...BASE, investmentAmount: 1, annualTurnover: 1, permanentEmployees: 1,
        productionItems: [
            { productName: 'Bearings', quantity: 1200, unit: 'NOS', productionValue: 45000000 },
            { productName: 'Bearings', quantity: 10, unit: 'NOS', productionValue: 1 },     // duplicate
            { productName: 'Acid', quantity: -5, unit: 'MT', productionValue: 100 },        // negative
            { productName: 'Paint', quantity: 5, unit: 'GALLON', productionValue: 100 },    // bad unit
        ]
    });
    assert.strictEqual(v.ok, false);
    assert.ok(v.errors.some(x => x.code === 'DUPLICATE'));
    assert.ok(v.errors.some(x => x.code === 'NEGATIVE'));
    assert.ok(v.errors.some(x => x.field.endsWith('.unit')));
});

test('amendment reason enforced only in amendment context', async () => {
    const p = { ...BASE, investmentAmount: 1, annualTurnover: 1, permanentEmployees: 1 };
    const noCtx = await validateSubmission(p);
    assert.strictEqual(noCtx.ok, true);
    const asAmendment = await validateSubmission(p, { isAmendment: true });
    assert.strictEqual(asAmendment.ok, false);
    assert.ok(asAmendment.errors.some(x => x.field === 'amendmentReason' && x.code === 'REQUIRED'));
    const withReason = await validateSubmission({ ...p, amendmentReason: 'Corrected employment after payroll audit' }, { isAmendment: true });
    assert.strictEqual(withReason.ok, true);
});

test('empty filings are rejected outright', async () => {
    const v = await validateSubmission({ periodYear: 2025, periodQuarter: 4 });
    assert.strictEqual(v.ok, false);
    // With the seeded required list, emptiness surfaces as REQUIRED field
    // errors (the EMPTY_SUBMISSION guard covers configs with no required
    // fields). Either way: rejected, nothing normalized to zero.
    assert.ok(v.errors.some(x => x.code === 'REQUIRED' || x.code === 'EMPTY_SUBMISSION'));
    assert.strictEqual(v.normalized.investmentAmount, null);
});

test('toNumber never confuses missing with 0', () => {
    assert.strictEqual(toNumber(null).value, null);
    assert.strictEqual(toNumber(undefined).value, null);
    assert.strictEqual(toNumber('').value, null);
    assert.strictEqual(toNumber(0).value, 0);
    assert.strictEqual(toNumber('42').value, 42);
    assert.strictEqual(toNumber('x').ok, false);
});

test('filing-proof attachments: count, size, name, base64 validated', async () => {
    const tinyPdf = Buffer.from('%PDF-1.4 test').toString('base64');
    const base = { ...BASE, investmentAmount: 1, annualTurnover: 1, permanentEmployees: 1 };
    const ok = await validateSubmission({ ...base, attachments: [{ fileName: 'audit proof.pdf', fileBase64: tinyPdf }] });
    assert.strictEqual(ok.ok, true, JSON.stringify(ok.errors));
    assert.strictEqual(ok.normalized.attachments.length, 1);
    assert.strictEqual(ok.normalized.attachments[0].fileName, 'audit_proof.pdf'); // sanitized

    const tooMany = await validateSubmission({ ...base, attachments: Array.from({ length: 6 }, () => ({ fileName: 'a.pdf', fileBase64: tinyPdf })) });
    assert.ok(tooMany.errors.some(e => e.field === 'attachments' && e.code === 'TOO_MANY'));

    const tooBig = await validateSubmission({ ...base, attachments: [{ fileName: 'big.pdf', fileBase64: 'A'.repeat(7 * 1024 * 1024) }] });
    assert.ok(tooBig.errors.some(e => e.code === 'TOO_LARGE'));

    const badB64 = await validateSubmission({ ...base, attachments: [{ fileName: 'x.pdf', fileBase64: '!!!' }] });
    assert.ok(badB64.errors.some(e => e.code === 'INVALID'));

    const noName = await validateSubmission({ ...base, attachments: [{ fileBase64: tinyPdf }] });
    assert.ok(noName.errors.some(e => e.code === 'REQUIRED' && e.field.endsWith('.fileName')));
});
