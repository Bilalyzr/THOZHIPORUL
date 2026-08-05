// ============================================================
// load-schema.js — Run schema + migrations against Render Postgres.
//
// Usage (from the backend/ folder):
//   node load-schema.js "<DATABASE_URL>"
//   node load-schema.js "<DATABASE_URL>" --seed   # also load seed.sql
//
// Uses the `pg` package already in node_modules — no install needed.
//
// IMPORTANT: this splits each file into individual statements and runs
// them one at a time, so a single failure (e.g. ALTER on a missing
// table) does NOT roll back the rest of the file. Each statement's
// success/failure is logged.
// ============================================================

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);
const INCLUDE_SEED = process.argv.includes('--seed');

if (!DATABASE_URL) {
  console.error('Usage: node load-schema.js "<DATABASE_URL>" [--seed]');
  process.exit(1);
}

// ─── Correct migration order ───
// 1. Base schema first (creates core tables).
// 2. The grievances migration MUST run before v3 (v3 ALTERs grievances).
// 3. Subscription migration adds tier columns to industry_profiles.
// 4. v3-v6 are additive enhancements, run in order.
// 5. seed.sql (optional) populates demo data — only on fresh DBs.
const files = [
  'schema.sql',
  'schema_v2.sql',
  'migrations_grievances.sql',   // ← creates grievances table (was missing!)
  'db_migration_subscription.sql',
  'schema_v3_enhancements.sql',
  'schema_v4_research.sql',
  'schema_v4b_realtenants.sql',
  'schema_v5_tier2.sql',
  'schema_v6_tier3.sql',
];
if (INCLUDE_SEED) files.push('seed.sql');

// Split a .sql file into runnable statements using a proper state machine
// that correctly handles single-quoted strings ('...' with '' escaping),
// dollar-quoted blocks ($$ ... $$), line comments (-- ...), and block
// comments (/* ... */). A naive split on ';' breaks when a ';' appears
// inside an inline comment or string — which these schema files have
// (e.g. "-- below = bad when lower; above = bad when higher").
function splitSql(sql) {
  const src = sql.replace(/\r\n/g, '\n');
  const statements = [];
  let buf = '';
  // State: 'normal' | 'sq' (single-quote string) | 'dq' (double-quote ident)
  //        | 'linec' (line comment) | 'blockc' (block comment) | 'dollar' (n)
  let state = 'normal';
  let dollarTag = ''; // the actual tag between $$...$$, e.g. $$ or $body$

  const push = () => {
    const s = buf.trim();
    if (s) statements.push(s);
    buf = '';
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const two = src.slice(i, i + 2);
    const rest = src.slice(i);

    switch (state) {
      case 'normal':
        if (two === '--') { state = 'linec'; buf += two; i++; break; }
        if (two === '/*') { state = 'blockc'; buf += two; i++; break; }
        if (c === "'") { state = 'sq'; buf += c; break; }
        if (c === '"') { state = 'dq'; buf += c; break; }
        // Dollar-quoted: $tag$ ... $tag$  (tag is empty or [A-Za-z_][A-Za-z0-9_]*)
        if (c === '$') {
          const m = rest.match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
          if (m) {
            dollarTag = '$' + (m[1] || '') + '$';
            state = 'dollar';
            buf += dollarTag;
            i += dollarTag.length - 1;
            break;
          }
        }
        if (c === ';' && dollarTag === '') { push(); break; }
        buf += c;
        break;

      case 'sq':
        // '' is an escaped quote inside the string; else ' ends the string.
        if (c === "'") {
          if (src[i + 1] === "'") { buf += "''"; i++; break; }
          state = 'normal'; buf += c; break;
        }
        buf += c;
        break;

      case 'dq':
        if (c === '"') { state = 'normal'; }
        buf += c;
        break;

      case 'linec':
        // Ends at newline (newline not consumed; kept as normal char next pass).
        buf += c;
        if (c === '\n') state = 'normal';
        break;

      case 'blockc':
        buf += c;
        if (two === '*/') { state = 'normal'; buf += src[i + 1] || ''; i++; break; }
        break;

      case 'dollar':
        if (rest.startsWith(dollarTag)) {
          buf += dollarTag;
          i += dollarTag.length - 1;
          state = 'normal';
          dollarTag = '';
          break;
        }
        buf += c;
        break;
    }
  }
  if (buf.trim()) push();
  return statements;
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('[OK] Connected to database.\n');

  let fileOk = 0;
  let fileWarn = 0;
  let fileSkip = 0;
  let totalStmts = 0;
  let totalFail = 0;

  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${file} — file not found`);
      fileSkip++;
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    const stmts = splitSql(sql);

    let stmtOk = 0;
    let stmtWarn = 0;
    const warnings = [];

    for (const stmt of stmts) {
      totalStmts++;
      const firstLine = stmt.split('\n').find((l) => !l.trim().startsWith('--') && l.trim() !== '') || '(empty)';
      try {
        await client.query(stmt);
        stmtOk++;
      } catch (err) {
        stmtWarn++;
        totalFail++;
        warnings.push(`    ${err.message.split('\n')[0]}  [near: ${firstLine.trim().slice(0, 80)}]`);
      }
    }

    if (stmtWarn === 0) {
      console.log(`[OK]   ${file}  (${stmtOk} statements)`);
      fileOk++;
    } else {
      console.log(`[WARN] ${file}  (${stmtOk} ok, ${stmtWarn} warned)`);
      warnings.forEach((w) => console.log(w));
      fileWarn++;
    }
  }

  await client.end();

  console.log(`\nDone. Files: ${fileOk} ok, ${fileWarn} with warnings, ${fileSkip} skipped.`);
  console.log(`Statements: ${totalStmts - totalFail} ok / ${totalFail} warned out of ${totalStmts}.`);

  // ─── Sanity check: list tables ───
  const check = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await check.connect();
  const res = await check.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
  );
  console.log(`\nTables in database (${res.rows.length}):`);
  for (const row of res.rows) console.log('  - ' + row.tablename);

  // ─── Verify the previously-missing pieces now exist ───
  const checks = [
    ["grievances table",            "SELECT to_regclass('public.grievances') IS NOT NULL AS exists"],
    ["inspections table",           "SELECT to_regclass('public.inspections') IS NOT NULL AS exists"],
    ["compliance_rules.target_metric", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compliance_rules' AND column_name='target_metric')"],
    ["industry_profiles.sector_tag",  "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='industry_profiles' AND column_name='sector_tag')"],
  ];
  console.log('\nVerification:');
  for (const [label, q] of checks) {
    const r = await check.query(q);
    console.log(`  ${r.rows[0].exists ? '[OK]  ' : '[MISS]'} ${label}`);
  }
  await check.end();
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
