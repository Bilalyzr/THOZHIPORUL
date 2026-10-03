// ============================================================
// submissionService.js — the single, canonical filing pipeline.
//
// Every path that writes industrial data (single web form, bulk
// import, API key submission) funnels through fileSubmission():
//
//   validate (400 with field errors, explicit nulls — never || 0)
//   → filing-window check (reporting calendar, admin-configurable)
//   → is_late computed from the period's due date
//   → snapshot PREVIOUS payload
//   → upsert master + child rows (NULLs preserved)
//   → replace production line items (history preserved in versions)
//   → operational-status transition + history row + audit
//   → append-only submission_versions row with machine-readable diff
//   → post-commit: consistency + anomaly evaluation (data_findings)
//   → hash-chained audit entry with a full change payload
//
// Nothing is ever silently overwritten without a version record.
// ============================================================

const db = require('../db');
const { validateSubmission } = require('../validators/submissionValidator');
const { recordAudit } = require('../routes/audit');

// Canonical camelCase field list shared by snapshots + diffs.
const SNAPSHOT_FIELDS = [
    'investmentAmount', 'annualTurnover', 'exportRevenue', 'rdExpenditure',
    'permanentEmployees', 'contractEmployees', 'scStEmployees', 'womenEmployees',
    'waterConsumption', 'powerUsage', 'wasteGenerated', 'wasteRecycledPct',
    'csrActivities', 'csrSpent', 'csrBeneficiaries'
];

// ------------------------------------------------------------
// Read one submission's current canonical payload (camelCase,
// same shape the API accepts) including production items.
// Accepts a pooled client (inside a tx) or falls back to db.query.
// ------------------------------------------------------------
async function getSubmissionPayload(runner, submissionId) {
    const q = async (sql, params) => runner === db ? db.query(sql, params) : runner.query(sql, params);
    const { rows } = await q(`
        SELECT ds.id, ds.industry_id, ds.period_year, ds.period_quarter, ds.status, ds.submitted_at,
               ip.operational_status,
               f.investment_amount, f.annual_turnover, f.export_revenue, f.rd_expenditure,
               e.permanent_employees, e.contract_employees, e.sc_st_employees, e.women_employees,
               r.water_consumption, r.power_usage, r.waste_generated, r.waste_recycled_pct,
               c.description AS csr_activities, c.amount_spent AS csr_spent, c.beneficiary_count AS csr_beneficiaries
          FROM data_submissions ds
          JOIN industry_profiles ip ON ip.id = ds.industry_id
     LEFT JOIN financial_data f ON f.submission_id = ds.id
     LEFT JOIN employment_data e ON e.submission_id = ds.id
     LEFT JOIN resource_usage r ON r.submission_id = ds.id
     LEFT JOIN csr_activities c ON c.submission_id = ds.id
         WHERE ds.id = $1`, [submissionId]);
    if (!rows.length) return null;
    const row = rows[0];
    const prod = await q(
        'SELECT product_name, quantity, unit, production_value, remarks FROM production_data WHERE submission_id = $1 ORDER BY id',
        [submissionId]
    );
    const payload = {
        periodYear: row.period_year,
        periodQuarter: row.period_quarter,
        operationalStatus: row.operational_status
    };
    const map = {
        investmentAmount: row.investment_amount, annualTurnover: row.annual_turnover,
        exportRevenue: row.export_revenue, rdExpenditure: row.rd_expenditure,
        permanentEmployees: row.permanent_employees, contractEmployees: row.contract_employees,
        scStEmployees: row.sc_st_employees, womenEmployees: row.women_employees,
        waterConsumption: row.water_consumption, powerUsage: row.power_usage,
        wasteGenerated: row.waste_generated, wasteRecycledPct: row.waste_recycled_pct,
        csrActivities: row.csr_activities, csrSpent: row.csr_spent, csrBeneficiaries: row.csr_beneficiaries
    };
    for (const k of SNAPSHOT_FIELDS) payload[k] = map[k] === undefined ? null : map[k];
    payload.productionItems = prod.rows.map(p => ({
        productName: p.product_name,
        quantity: Number(p.quantity),
        unit: p.unit,
        productionValue: Number(p.production_value),
        remarks: p.remarks
    }));
    return payload;
}

// ------------------------------------------------------------
// Machine-readable diff between two payloads.
// [{field, old, new, change_pct}] — change_pct null when the old
// value is 0/absent (undefined, never fabricated).
// ------------------------------------------------------------
function computeDiff(prev, cur) {
    const diffs = [];
    if (!prev) return diffs;
    const fields = [...SNAPSHOT_FIELDS, 'operationalStatus'];
    for (const f of fields) {
        const a = prev[f] === undefined ? null : prev[f];
        const b = cur[f] === undefined ? null : cur[f];
        if (String(a) !== String(b)) {
            const numA = Number(a), numB = Number(b);
            const changePct = (Number.isFinite(numA) && Number.isFinite(numB) && numA !== 0)
                ? Math.round(((numB - numA) / Math.abs(numA)) * 1000) / 10
                : null;
            diffs.push({ field: f, old: a, new: b, change_pct: changePct });
        }
    }
    // Production: compare per-product maps.
    const prodA = new Map((prev.productionItems || []).map(p => [p.productName, p]));
    const prodB = new Map((cur.productionItems || []).map(p => [p.productName, p]));
    for (const [name, pb] of prodB) {
        const pa = prodA.get(name);
        if (!pa) {
            diffs.push({ field: `production:${name}`, old: null, new: pb, change_pct: null });
        } else if (Number(pa.quantity) !== Number(pb.quantity) || Number(pa.productionValue) !== Number(pb.productionValue)) {
            const changePct = Number(pa.quantity) !== 0
                ? Math.round(((Number(pb.quantity) - Number(pa.quantity)) / Math.abs(Number(pa.quantity))) * 1000) / 10
                : null;
            diffs.push({ field: `production:${name}`, old: pa, new: pb, change_pct: changePct });
        }
    }
    for (const [name, pa] of prodA) {
        if (!prodB.has(name)) diffs.push({ field: `production:${name}`, old: pa, new: null, change_pct: null });
    }
    return diffs;
}

// ------------------------------------------------------------
// Filing-window + lateness for a period.
// → { period: row|null, allowed: bool, reason, is_late }
// ------------------------------------------------------------
async function checkFilingWindow(periodYear, periodQuarter) {
    const { rows } = await db.query(
        'SELECT * FROM reporting_periods WHERE period_year = $1 AND period_quarter = $2',
        [periodYear, periodQuarter]
    );
    const rp = rows[0] || null;
    if (!rp) {
        // No calendar configured for this period — allow filing, mark unknown.
        return { period: null, allowed: true, reason: 'CALENDAR_NOT_CONFIGURED', is_late: false };
    }
    // pg returns DATE columns as Date objects — normalize to YYYY-MM-DD
    // strings before comparing with `today` (string-vs-Date coerces to NaN).
    const dueOn = rp.due_on instanceof Date ? rp.due_on.toISOString().slice(0, 10) : String(rp.due_on).slice(0, 10);
    const closesOn = rp.closes_on instanceof Date ? rp.closes_on.toISOString().slice(0, 10) : String(rp.closes_on).slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (rp.status === 'closed' || closesOn < today) {
        return { period: rp, allowed: false, reason: 'FILING_WINDOW_CLOSED', closes_on: closesOn, is_late: true };
    }
    return { period: rp, allowed: true, reason: 'OPEN', is_late: today > dueOn };
}

// ------------------------------------------------------------
// fileSubmission — the canonical write path.
// opts: { industryId, userId, payload, source: 'web'|'bulk'|'api', ip }
// Resolves to { status, body } — route just forwards it.
// ------------------------------------------------------------
async function fileSubmission(opts) {
    const { industryId, userId, payload, source = 'web', ip = null } = opts;

    // 0. Ownership guard — callers pass an explicit industryId; the
    //    route layer enforces that industry tokens may only pass their own.
    if (!industryId || !payload || typeof payload !== 'object') {
        return { status: 400, body: { success: false, code: 'BAD_REQUEST', errors: [{ field: 'payload', message: 'industryId and payload are required.' }] } };
    }

    // 1. Existing submission for the period (amendment detection).
    const existing = await db.query(
        'SELECT id, status FROM data_submissions WHERE industry_id = $1 AND period_year = $2 AND period_quarter IS NOT DISTINCT FROM $3',
        [industryId, payload.periodYear, payload.periodQuarter ?? null]
    );
    const existingRow = existing.rows[0] || null;
    const isAmendment = !!(existingRow && String(existingRow.status).toLowerCase() === 'approved');

    // 2. Validate.
    const v = await validateSubmission(payload, { isAmendment });
    if (!v.ok) {
        return { status: 400, body: { success: false, code: 'VALIDATION_ERROR', errors: v.errors } };
    }
    const p = v.normalized;

    // 3. Filing window.
    const win = await checkFilingWindow(p.periodYear, p.periodQuarter);
    if (!win.allowed) {
        return {
            status: 423,
            body: {
                success: false,
                code: win.reason,
                message: `The filing window for ${p.periodYear}-Q${p.periodQuarter} closed on ${win.closes_on}. Contact a SIPCOT officer to file a late return.`,
                errors: [{ field: 'periodQuarter', message: `Filing window closed on ${win.closes_on}.`, code: win.reason }]
            }
        };
    }

    // 4. Snapshot the previous payload BEFORE any write.
    let previousPayload = null;
    if (existingRow) previousPayload = await getSubmissionPayload(db, existingRow.id);

    // 5. Transaction: master + children + production + versions.
    const client = await db.pool.connect();
    let submissionId, versionNo, changeKind, newStatus, lastDiff = [];
    try {
        await client.query('BEGIN');

        newStatus = 'Submitted'; // amendments go back to review; fresh filings start here
        const subRes = await client.query(
            `INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, is_late)
             VALUES ($1,$2,$3,$4,NOW(),$5)
             ON CONFLICT (industry_id, period_year, period_quarter)
             DO UPDATE SET status = EXCLUDED.status, submitted_at = NOW(), updated_at = NOW(),
                           is_late = data_submissions.is_late OR EXCLUDED.is_late
             RETURNING id`,
            [industryId, p.periodYear, p.periodQuarter, newStatus, win.is_late]
        );
        submissionId = subRes.rows[0].id;

        // Children: explicit NULL handling — a missing value stays NULL.
        const n = (x) => x === undefined ? null : x;
        await client.query(
            `INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (submission_id) DO UPDATE SET
               investment_amount=EXCLUDED.investment_amount, annual_turnover=EXCLUDED.annual_turnover,
               export_revenue=EXCLUDED.export_revenue, rd_expenditure=EXCLUDED.rd_expenditure`,
            [submissionId, n(p.investmentAmount), n(p.annualTurnover), n(p.exportRevenue), n(p.rdExpenditure)]
        );
        await client.query(
            `INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (submission_id) DO UPDATE SET
               permanent_employees=EXCLUDED.permanent_employees, contract_employees=EXCLUDED.contract_employees,
               sc_st_employees=EXCLUDED.sc_st_employees, women_employees=EXCLUDED.women_employees`,
            [submissionId, n(p.permanentEmployees), n(p.contractEmployees), n(p.scStEmployees), n(p.womenEmployees)]
        );
        await client.query(
            `INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (submission_id) DO UPDATE SET
               water_consumption=EXCLUDED.water_consumption, power_usage=EXCLUDED.power_usage,
               waste_generated=EXCLUDED.waste_generated, waste_recycled_pct=EXCLUDED.waste_recycled_pct`,
            [submissionId, n(p.waterConsumption), n(p.powerUsage), n(p.wasteGenerated), n(p.wasteRecycledPct)]
        );
        if (p.csrActivities !== null || p.csrSpent !== null || p.csrBeneficiaries !== null) {
            await client.query(
                `INSERT INTO csr_activities (submission_id, description, amount_spent, beneficiary_count)
                 VALUES ($1,$2,$3,$4)
                 ON CONFLICT (submission_id) DO UPDATE SET
                   description=EXCLUDED.description, amount_spent=EXCLUDED.amount_spent, beneficiary_count=EXCLUDED.beneficiary_count`,
                [submissionId, n(p.csrActivities), n(p.csrSpent), n(p.csrBeneficiaries)]
            );
        }

        // Production line items: replace-per-filing; prior items live on
        // in submission_versions payloads (nothing is lost).
        if (Array.isArray(p.productionItems)) {
            await client.query('DELETE FROM production_data WHERE submission_id = $1', [submissionId]);
            for (const item of p.productionItems) {
                await client.query(
                    `INSERT INTO production_data
                       (submission_id, industry_id, period_year, period_quarter,
                        product_name, quantity, unit, production_value, remarks)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [submissionId, industryId, p.periodYear, p.periodQuarter,
                     item.productName, item.quantity, item.unit, item.productionValue, item.remarks]
                );
            }
        }

        // Operational status transition (with history + audit).
        if (p.operationalStatus && (!previousPayload || previousPayload.operationalStatus !== p.operationalStatus)) {
            const old = previousPayload ? previousPayload.operationalStatus : null;
            await client.query(
                'UPDATE industry_profiles SET operational_status = $1 WHERE id = $2',
                [p.operationalStatus, industryId]
            );
            await client.query(
                `INSERT INTO operational_status_history (industry_id, from_status, to_status, reason, changed_by, source)
                 VALUES ($1,$2,$3,$4,$5,'submission')`,
                [industryId, old, p.operationalStatus,
                 `Declared in ${p.periodYear}-Q${p.periodQuarter || 'FY'} filing`, userId]
            );
        }

        // Version row (append-only).
        const verRes = await client.query(
            'SELECT COALESCE(MAX(version_no), 0) AS v FROM submission_versions WHERE submission_id = $1',
            [submissionId]
        );
        versionNo = (parseInt(verRes.rows[0].v) || 0) + 1;
        changeKind = versionNo === 1 ? 'original' : 'amendment';
        const diff = computeDiff(previousPayload, {
            ...p,
            productionItems: Array.isArray(p.productionItems) ? p.productionItems : (previousPayload ? previousPayload.productionItems : [])
        });
        lastDiff = diff;
        await client.query(
            `INSERT INTO submission_versions
               (submission_id, industry_id, period_year, period_quarter, version_no, change_kind,
                amendment_reason, payload, previous_payload, diff, filed_by, submission_status, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [submissionId, industryId, p.periodYear, p.periodQuarter, versionNo, changeKind,
             p.amendmentReason || null,
             JSON.stringify(p), previousPayload ? JSON.stringify(previousPayload) : null,
             JSON.stringify(diff), userId || null, newStatus, source]
        );

        // Filing-proof attachments: real bytes hashed (sha256), written to
        // uploads/, and linked to this submission. Written before commit;
        // on rollback an orphan file is possible (harmless, noted here).
        if (Array.isArray(p.attachments) && p.attachments.length) {
            const fs = require('fs');
            const path = require('path');
            const crypto = require('crypto');
            const UPLOADS = path.join(__dirname, '..', 'uploads');
            fs.mkdirSync(UPLOADS, { recursive: true });
            for (const att of p.attachments) {
                const bytes = Buffer.from(att.fileBase64, 'base64');
                const diskName = `filing_${submissionId}_${Date.now()}_${att.fileName}`;
                fs.writeFileSync(path.join(UPLOADS, diskName), bytes);
                const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
                await client.query(
                    `INSERT INTO documents
                       (industry_id, uploaded_by, category, file_name, file_path, file_size_kb,
                        mime_type, verified, content_hash, submission_id)
                     VALUES ($1,$2,'submission_attachment',$3,$4,$5,$6,FALSE,$7,$8)`,
                    [industryId, userId || null, att.fileName, `/uploads/${diskName}`,
                     Math.max(1, Math.round(bytes.length / 1024)),
                     att.fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf',
                     contentHash, submissionId]
                );
            }
        }

        await client.query('COMMIT');
    } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) { /* tx already gone */ }
        client.release();
        console.error('[fileSubmission] transaction error:', e.message);
        return { status: 500, body: { success: false, code: 'SERVER_ERROR', message: 'Submission transaction failed. Nothing was persisted.' } };
    }
    client.release();

    // 5b. Event-driven compliance scoring (instant score update, non-fatal).
    try {
        const { computeIndustryScore } = require('./complianceScoring');
        await computeIndustryScore(industryId);
    } catch (e) {
        console.warn('[fileSubmission] event-driven scoring skipped:', e.message);
    }

    // 6. Post-commit intelligence (non-fatal): consistency + anomaly
    //    evaluation writes data_findings and notifies on severity.
    //    Amendments ALSO get version-over-version anomaly evaluation —
    //    a large revision within one period is itself a signal.
    let findings = { consistency: 0, anomalies: 0 };
    try {
        const consistency = require('./consistencyEngine');
        const anomaly = require('./anomalyService');
        findings.consistency = await consistency.evaluateSubmission(submissionId, 'ingest');
        findings.anomalies = await anomaly.evaluateSubmission(submissionId, 'ingest');
        if (changeKind === 'amendment') {
            findings.anomalies += await anomaly.evaluateVersionChange(submissionId, lastDiff, 'ingest');
        }
    } catch (e) {
        console.warn('[fileSubmission] post-commit intelligence skipped:', e.message);
    }

    // 7. Chained audit entry with the full change payload.
    try {
        await recordAudit(userId, changeKind === 'original' ? 'SUBMISSION_FILED' : 'SUBMISSION_AMENDED', ip, {
            entityType: 'submission', entityId: submissionId, severity: 'info',
            payload: {
                industry_id: industryId,
                period: `${p.periodYear}-Q${p.periodQuarter ?? 'FY'}`,
                version: versionNo,
                change_kind: changeKind,
                amendment_reason: p.amendmentReason || null,
                is_late: win.is_late,
                source,
                changed_fields: (computeDiff(previousPayload, p) || []).map(d => d.field)
            }
        });
    } catch (_) { /* audit is best-effort */ }

    // Invalidate dashboard caches — new data means stale aggregations.
    try { require('./cache').invalidate(''); } catch (_) { /* cache optional */ }

    console.log(`[SUBMISSION] industry=${industryId} ${p.periodYear}-Q${p.periodQuarter ?? 'FY'} v${versionNo} (${changeKind}, source=${source})`);
    return {
        status: 201,
        body: {
            success: true,
            msg: changeKind === 'original'
                ? 'Industrial data submitted and validated.'
                : `Amendment filed (version ${versionNo}). Previous values preserved in history.`,
            submissionId,
            version: versionNo,
            changeKind,
            isLate: win.is_late,
            calendarNote: win.reason === 'CALENDAR_NOT_CONFIGURED'
                ? 'No reporting calendar configured for this period — lateness not tracked.'
                : null,
            findings
        }
    };
}

module.exports = { fileSubmission, getSubmissionPayload, computeDiff, checkFilingWindow, SNAPSHOT_FIELDS };
