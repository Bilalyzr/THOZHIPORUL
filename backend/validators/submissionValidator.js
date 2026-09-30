// ============================================================
// submissionValidator.js — server-side validation for industrial
// filings (Phase 1 + 2 of the intelligence upgrade).
//
// CANONICAL UNITS (no runtime guessing, ever):
//   investmentAmount / annualTurnover / exportRevenue /
//   rdExpenditure / csrSpent / productionValue  → INR
//   waterConsumption → KL       powerUsage → kWh
//   employees / beneficiaries → count
//   wasteGenerated → MT         wasteRecycledPct → percent
//
// RULES come from intelligence_rules (admin-configurable, cached
// by services/ruleConfig). A value that is absent stays NULL — it
// is NEVER coerced to 0 here or downstream. Only hard failures
// produce errors; soft suspicions become data_findings later in
// the pipeline (consistency engine), not rejections.
// ============================================================

const { getEnabledByCategory } = require('../services/ruleConfig');

// Domain fields the validator knows, with their canonical type.
const NUMERIC_FIELDS = [
    'investmentAmount', 'annualTurnover', 'exportRevenue', 'rdExpenditure',
    'permanentEmployees', 'contractEmployees', 'scStEmployees', 'womenEmployees',
    'waterConsumption', 'powerUsage', 'wasteGenerated', 'wasteRecycledPct',
    'csrSpent', 'csrBeneficiaries'
];

const OPERATIONAL_STATUSES = ['OPERATING', 'UNDER_CONSTRUCTION', 'IDLE', 'TEMPORARILY_CLOSED', 'CLOSED'];
const PRODUCTION_UNITS = ['MT', 'KG', 'L', 'M3', 'KWH', 'NOS', 'SQM'];

// Fields required for a filing to be considered complete. Seeded
// default — admin-configurable via the V-REQUIRED rule.
const DEFAULT_REQUIRED = ['investmentAmount', 'annualTurnover', 'permanentEmployees'];

function err(field, message, code) {
    return { field, message, code: code || 'INVALID' };
}

// Coerce a user-supplied value into a JS number, or fail cleanly.
// Numeric strings ("123.4") are accepted; anything else is an error.
function toNumber(value) {
    if (value === null || value === undefined || value === '') return { ok: true, value: null };
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(n)) return { ok: false };
    return { ok: true, value: n };
}

function currentPeriod() {
    const now = new Date();
    return { year: now.getUTCFullYear(), quarter: Math.floor(now.getUTCMonth() / 3) + 1 };
}

// ------------------------------------------------------------
// validateSubmission(payload, { isAmendment })
// → { ok, errors: [{field,message,code}], normalized, skippedRequired }
// normalized = payload with numerics coerced and unknown keys dropped.
// ------------------------------------------------------------
async function validateSubmission(payload, opts = {}) {
    const errors = [];
    const normalized = {};

    // ---- Period validity -----------------------------------
    const period = toNumber(payload.periodYear);
    const quarter = toNumber(payload.periodQuarter);
    if (period.value === null || !Number.isInteger(period.value) || period.value < 2000 || period.value > 2100) {
        errors.push(err('periodYear', 'A valid reporting year (2000-2100) is required.', 'REQUIRED'));
    }
    if (quarter.value !== null && (!Number.isInteger(quarter.value) || quarter.value < 1 || quarter.value > 4)) {
        errors.push(err('periodQuarter', 'Quarter must be 1-4 (or null for an annual filing).', 'INVALID'));
    }
    if (!errors.length) {
        normalized.periodYear = period.value;
        normalized.periodQuarter = quarter.value;
        // Future periods cannot be filed.
        const cur = currentPeriod();
        const curKey = cur.year * 4 + cur.quarter;
        const filKey = period.value * 4 + (quarter.value || 4);
        if (filKey > curKey) {
            errors.push(err('periodQuarter',
                `Reporting period ${period.value}-Q${quarter.value || 'FY'} is in the future.`,
                'FUTURE_PERIOD'));
        }
    }

    // ---- Numeric fields: type + range ----------------------
    const rangeRules = await getEnabledByCategory('validation');
    const rangeByField = {};
    for (const r of rangeRules) {
        const f = r.config && r.config.field;
        if (f) rangeByField[f] = r;
    }

    for (const field of NUMERIC_FIELDS) {
        const res = toNumber(payload[field]);
        if (!res.ok) {
            errors.push(err(field, `${field} must be a number (or null when not reported).`, 'NOT_NUMERIC'));
            continue;
        }
        normalized[field] = res.value;
        const rule = rangeByField[field];
        if (rule && res.value !== null) {
            const { min, max } = rule.config || {};
            if (min !== undefined && res.value < min) {
                errors.push(err(field, `${field} ${res.value} is below the allowed minimum (${min}).`, 'OUT_OF_RANGE'));
            }
            if (max !== undefined && res.value > max) {
                errors.push(err(field, `${field} ${res.value} exceeds the allowed maximum (${max}).`, 'OUT_OF_RANGE'));
            }
        }
    }

    // ---- Required-field policy (configurable) --------------
    const requiredRule = rangeRules.find(r => r.rule_id === 'V-REQUIRED');
    const required = (requiredRule && Array.isArray(requiredRule.config.required)) || DEFAULT_REQUIRED;
    normalized.skippedRequired = [];
    for (const field of required) {
        if (normalized[field] === null || normalized[field] === undefined) {
            errors.push(err(field, `${field} is required for a complete filing.`, 'REQUIRED'));
            normalized.skippedRequired.push(field);
        }
    }

    // ---- Cross-field: workforce split cannot exceed total --
    const totalEmp = (normalized.permanentEmployees || 0) + (normalized.contractEmployees || 0);
    const hasEmpData = normalized.permanentEmployees !== null || normalized.contractEmployees !== null;
    for (const [field, label] of [['scStEmployees', 'SC/ST employees'], ['womenEmployees', 'Women employees']]) {
        if (normalized[field] !== null && hasEmpData && normalized[field] > totalEmp) {
            errors.push(err(field,
                `${label} (${normalized[field]}) cannot exceed total employees (${totalEmp}).`,
                'SPLIT_EXCEEDS_TOTAL'));
        }
    }

    // ---- CSR free text -------------------------------------
    if (payload.csrActivities !== undefined && payload.csrActivities !== null) {
        const t = String(payload.csrActivities);
        if (t.length > 2000) errors.push(err('csrActivities', 'CSR description must be under 2000 characters.', 'TOO_LONG'));
        normalized.csrActivities = t;
    } else {
        normalized.csrActivities = null;
    }

    // ---- Operational status --------------------------------
    if (payload.operationalStatus !== undefined && payload.operationalStatus !== null && payload.operationalStatus !== '') {
        const s = String(payload.operationalStatus).toUpperCase();
        if (!OPERATIONAL_STATUSES.includes(s)) {
            errors.push(err('operationalStatus',
                `operationalStatus must be one of: ${OPERATIONAL_STATUSES.join(', ')}.`, 'INVALID'));
        } else {
            normalized.operationalStatus = s;
        }
    }

    // ---- Production line items ------------------------------
    normalized.productionItems = null;
    if (payload.productionItems !== undefined && payload.productionItems !== null) {
        if (!Array.isArray(payload.productionItems)) {
            errors.push(err('productionItems', 'productionItems must be an array of line items.', 'INVALID'));
        } else if (payload.productionItems.length > 50) {
            errors.push(err('productionItems', 'A filing may contain at most 50 production line items.', 'TOO_MANY'));
        } else {
            const items = [];
            const seen = new Set();
            for (let i = 0; i < payload.productionItems.length; i++) {
                const raw = payload.productionItems[i] || {};
                const pfx = `productionItems[${i}]`;
                const name = raw.productName !== undefined && raw.productName !== null ? String(raw.productName).trim() : '';
                if (!name) { errors.push(err(`${pfx}.productName`, 'Product name is required.', 'REQUIRED')); continue; }
                if (name.length > 255) { errors.push(err(`${pfx}.productName`, 'Product name too long (max 255).', 'TOO_LONG')); continue; }
                if (seen.has(name.toLowerCase())) { errors.push(err(`${pfx}.productName`, `Duplicate product "${name}" in this filing.`, 'DUPLICATE')); continue; }
                seen.add(name.toLowerCase());

                const qty = toNumber(raw.quantity);
                if (!qty.ok) { errors.push(err(`${pfx}.quantity`, 'Quantity must be numeric.', 'NOT_NUMERIC')); continue; }
                const val = toNumber(raw.productionValue);
                if (!val.ok) { errors.push(err(`${pfx}.productionValue`, 'Production value must be numeric (INR).', 'NOT_NUMERIC')); continue; }
                const qtyRule = rangeByField['productionQuantity'];
                const valRule = rangeByField['productionValue'];
                if (qty.value !== null && qty.value < 0) { errors.push(err(`${pfx}.quantity`, 'Quantity cannot be negative.', 'NEGATIVE')); continue; }
                if (val.value !== null && val.value < 0) { errors.push(err(`${pfx}.productionValue`, 'Production value cannot be negative.', 'NEGATIVE')); continue; }
                if (qtyRule && qty.value !== null && qtyRule.config.max !== undefined && qty.value > qtyRule.config.max) {
                    errors.push(err(`${pfx}.quantity`, 'Quantity exceeds the allowed maximum.', 'OUT_OF_RANGE')); continue;
                }
                if (valRule && val.value !== null && valRule.config.max !== undefined && val.value > valRule.config.max) {
                    errors.push(err(`${pfx}.productionValue`, 'Production value exceeds the allowed maximum.', 'OUT_OF_RANGE')); continue;
                }
                const unit = raw.unit ? String(raw.unit).toUpperCase() : 'NOS';
                if (!PRODUCTION_UNITS.includes(unit)) {
                    errors.push(err(`${pfx}.unit`, `Unit must be one of: ${PRODUCTION_UNITS.join(', ')}.`, 'INVALID')); continue;
                }
                items.push({
                    productName: name,
                    quantity: qty.value === null ? 0 : qty.value,
                    unit,
                    productionValue: val.value === null ? 0 : val.value,
                    remarks: raw.remarks ? String(raw.remarks).slice(0, 1000) : null
                });
            }
            normalized.productionItems = items; // may be partial if errors — only used when ok
        }
    }

    // ---- Empty-filing guard ---------------------------------
    const anyDomain = NUMERIC_FIELDS.some(f => normalized[f] !== null && normalized[f] !== undefined)
        || (normalized.productionItems && normalized.productionItems.length)
        || normalized.csrActivities;
    if (!anyDomain && errors.length === 0) {
        errors.push(err('payload', 'A filing must contain at least one data domain (financial, employment, resources, CSR or production).', 'EMPTY_SUBMISSION'));
    }

    // ---- Amendment reason (context-dependent) ----------------
    if (opts.isAmendment) {
        const reason = payload.amendmentReason ? String(payload.amendmentReason).trim() : '';
        if (reason.length < 5) {
            errors.push(err('amendmentReason', 'An amendment reason (min 5 characters) is required when re-filing an approved submission.', 'REQUIRED'));
        } else {
            normalized.amendmentReason = reason.slice(0, 500);
        }
    } else if (payload.amendmentReason) {
        normalized.amendmentReason = String(payload.amendmentReason).trim().slice(0, 500);
    }

    return { ok: errors.length === 0, errors, normalized };
}

module.exports = {
    validateSubmission,
    NUMERIC_FIELDS,
    OPERATIONAL_STATUSES,
    PRODUCTION_UNITS,
    // pure helpers exported for unit tests
    toNumber,
    currentPeriod
};
