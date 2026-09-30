// Unit tests for the machine-readable diff engine (Phase 5), the
// dependency-free XLSX writer (Phase 20), and secret encryption
// (Phase 22). Pure functions — no DB access.

const test = require('node:test');
const assert = require('node:assert');
const zlib = require('zlib');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// computeDiff lives in submissionService which requires db — module-level
// require only creates the pool, no connection is made until a query.
const { computeDiff } = require('../services/submissionService');

test('computeDiff produces the audited example: 740 → 1250 = +68.9%', () => {
    const prev = { periodYear: 2026, periodQuarter: 3, permanentEmployees: 740, waterConsumption: 800, productionItems: [] };
    const cur = { periodYear: 2026, periodQuarter: 3, permanentEmployees: 1250, waterConsumption: 800, productionItems: [] };
    const diff = computeDiff(prev, cur);
    const emp = diff.find(d => d.field === 'permanentEmployees');
    assert.ok(emp, 'employment diff exists');
    assert.strictEqual(emp.old, 740);
    assert.strictEqual(emp.new, 1250);
    assert.strictEqual(emp.change_pct, 68.9);
    // unchanged fields are not in the diff
    assert.strictEqual(diff.find(d => d.field === 'waterConsumption'), undefined);
});

test('computeDiff flags added and removed production items', () => {
    const prev = { productionItems: [{ productName: 'A', quantity: 10, unit: 'MT', productionValue: 5 }] };
    const cur = { productionItems: [{ productName: 'A', quantity: 20, unit: 'MT', productionValue: 5 }, { productName: 'B', quantity: 1, unit: 'NOS', productionValue: 1 }] };
    const diff = computeDiff(prev, cur);
    const a = diff.find(d => d.field === 'production:A');
    const b = diff.find(d => d.field === 'production:B');
    assert.ok(a && a.change_pct === 100);
    assert.ok(b && b.old === null);
});

test('computeDiff returns [] for identical payloads (no noise)', () => {
    const p = { investmentAmount: 100, productionItems: [{ productName: 'A', quantity: 1, unit: 'MT', productionValue: 2 }] };
    assert.deepStrictEqual(computeDiff(p, { ...p, productionItems: [...p.productionItems] }), []);
});

// ---------------- XLSX writer ----------------
const { buildXlsx } = require('../utils/xlsx');

function unzipEntries(buf) {
    // Minimal ZIP central-directory reader for test verification.
    assert.strictEqual(buf.slice(0, 2).toString('binary'), 'PK', 'ZIP magic');
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    assert.ok(eocd > 0, 'EOCD present');
    const count = buf.readUInt16LE(eocd + 10);
    const cdOffset = buf.readUInt32LE(eocd + 16);
    const entries = [];
    let p = cdOffset;
    for (let i = 0; i < count; i++) {
        assert.strictEqual(buf.readUInt32LE(p), 0x02014b50, 'central header');
        const method = buf.readUInt16LE(p + 10);
        const compSize = buf.readUInt32LE(p + 20);
        const nameLen = buf.readUInt16LE(p + 28);
        const extraLen = buf.readUInt16LE(p + 30);
        const commentLen = buf.readUInt16LE(p + 32);
        const localOffset = buf.readUInt32LE(p + 42);
        const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
        // local header: 30 bytes + name + extra
        const lNameLen = buf.readUInt16LE(localOffset + 26);
        const lExtraLen = buf.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + lNameLen + lExtraLen;
        const raw = buf.slice(dataStart, dataStart + compSize);
        const data = method === 8 ? zlib.inflateRawSync(raw) : raw;
        entries.push({ name, data: data.toString('utf8') });
        p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
}

test('TEST 9 (unit) — XLSX writer produces a VALID zip/xlsx structure', () => {
    const buf = buildXlsx({
        sheetName: 'Growth',
        title: 'THOZHIRPORUL — Growth Report',
        meta: [['Generated (UTC)', '2026-09-30T00:00:00Z'], ['Caveat', 'insufficient history']],
        headers: ['Quarter', 'Value', 'QoQ %'],
        rows: [['2026-Q3', 1250, 68.9], ['2026-Q4', null, null]]
    });
    assert.ok(Buffer.isBuffer(buf) && buf.length > 500);
    const entries = unzipEntries(buf);
    const names = entries.map(e => e.name);
    for (const expected of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml']) {
        assert.ok(names.includes(expected), `contains ${expected}`);
    }
    const sheet = entries.find(e => e.name === 'xl/worksheets/sheet1.xml').data;
    assert.ok(sheet.includes('Growth Report'), 'title present');
    assert.ok(sheet.includes('Quarter'), 'header present');
    assert.ok(/<v>1250<\/v>/.test(sheet), 'numeric cell is typed');
    assert.ok(sheet.includes('68.9'), 'decimal value present');
    assert.ok(sheet.includes('t="inlineStr"'), 'string cells are inlineStr');
});

// ---------------- secret encryption ----------------
const { encryptString, decryptString, isEncrypted } = require('../services/cryptoUtil');

test('TOTP-secret encryption round-trips and never stores plaintext', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const enc = encryptString(secret);
    assert.ok(isEncrypted(enc), 'enc:v1: prefix');
    assert.ok(!enc.includes(secret), 'ciphertext hides plaintext');
    assert.strictEqual(decryptString(enc), secret);
    // legacy plaintext passes through as-is for migration
    assert.strictEqual(decryptString(secret), null);
    assert.strictEqual(isEncrypted(secret), false);
});
