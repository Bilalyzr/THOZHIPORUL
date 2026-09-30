// ============================================================
// xlsx.js — REAL XLSX writer, zero dependencies (node:zlib only).
//
// Produces a valid Office Open XML workbook (.xlsx): a ZIP
// archive containing [Content_Types].xml, _rels/.rels,
// xl/workbook.xml, xl/_rels/workbook.xml.rels and one worksheet
// per table. Values are typed (number/string) — not CSV bytes
// renamed to .xlsx.
//
// API: buildXlsx({ sheetName, title, headers, rows, meta })
//      → Buffer
//   or buildXlsxWorkbook([{...}, {...}]) for multiple sheets.
// ============================================================

const zlib = require('zlib');

// ---------- Minimal ZIP writer ----------
function crc32(buf) {
    let table = crc32.table;
    if (!table) {
        table = crc32.table = new Int32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[n] = c;
        }
    }
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    return (crc ^ -1) >>> 0;
}

function zipSync(files) {
    // files: [{ name, data:Buffer }]
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    for (const f of files) {
        const nameBuf = Buffer.from(f.name, 'utf8');
        const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, 'utf8');
        const crc = crc32(data);
        const compressed = zlib.deflateRawSync(data, { level: 9 });

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);        // local file header sig
        local.writeUInt16LE(20, 4);                // version needed
        local.writeUInt16LE(0, 6);                 // flags
        local.writeUInt16LE(8, 8);                 // method: deflate
        local.writeUInt16LE(0, 10);                // mod time
        local.writeUInt16LE(0x21, 12);             // mod date (1996-02-01, DOS)
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);                // extra len
        localParts.push(local, nameBuf, compressed);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);      // central dir sig
        central.writeUInt16LE(20, 4);              // version made by
        central.writeUInt16LE(20, 6);              // version needed
        central.writeUInt16LE(0, 8);
        central.writeUInt16LE(8, 10);
        central.writeUInt16LE(0, 12);
        central.writeUInt16LE(0x21, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBuf.length, 28);
        central.writeUInt16LE(0, 30);              // extra
        central.writeUInt16LE(0, 32);              // comment
        central.writeUInt16LE(0, 34);              // disk
        central.writeUInt16LE(0, 36);              // internal attrs
        central.writeUInt32LE(0, 38);              // external attrs
        central.writeUInt32LE(offset, 42);
        centralParts.push(central, nameBuf);

        offset += 30 + nameBuf.length + compressed.length;
    }
    const centralSize = centralParts.reduce((s, b) => s + b.length, 0);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(offset, 16);
    return Buffer.concat([...localParts, ...centralParts, eocd]);
}

// ---------- SpreadsheetML ----------
function xmlEscape(s) {
    return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function colLetter(i) {
    let s = '';
    let n = i + 1;
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
}

function cellXml(value, rowIdx, colIdx) {
    const ref = `${colLetter(colIdx)}${rowIdx}`;
    if (value === null || value === undefined || value === '') return `<c r="${ref}"/>`;
    if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${ref}"><v>${value}</v></c>`;
    }
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function sheetXml({ title, meta, headers, rows }) {
    const all = [];
    // Title + meta block (rows 1..n), then a blank row, then the table.
    all.push([{ v: title, bold: true }]);
    if (meta && meta.length) {
        for (const [k, v] of meta) all.push([{ v: `${k}: ${v}` }]);
    }
    all.push([]);
    all.push(headers.map(h => ({ v: h, bold: true })));
    for (const r of rows) all.push(r.map(c => ({ v: c })));

    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>`;
    all.forEach((row, ri) => {
        if (!row.length) return;
        xml += `<row r="${ri + 1}">`;
        row.forEach((c, ci) => { xml += cellXml(c.v, ri + 1, ci); });
        xml += `</row>`;
    });
    xml += `</sheetData></worksheet>`;
    return xml;
}

function buildXlsxWorkbook(sheets) {
    const safe = sheets.map((s, i) => ({ ...s, sheetName: (s.sheetName || `Sheet${i + 1}`).slice(0, 31) }));
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${safe.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`;

    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${safe.map((s, i) => `<sheet name="${xmlEscape(s.sheetName)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`;

    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${safe.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
</Relationships>`;

    const files = [
        { name: '[Content_Types].xml', data: contentTypes },
        { name: '_rels/.rels', data: rootRels },
        { name: 'xl/workbook.xml', data: workbook },
        { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
        ...safe.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }))
    ];
    return zipSync(files);
}

function buildXlsx(sheet) { return buildXlsxWorkbook([sheet]); }

module.exports = { buildXlsx, buildXlsxWorkbook };
