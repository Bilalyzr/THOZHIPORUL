// agentSchemas.js — strongly typed agent results (PRD §20, §25).
// Every agent returns this shape; nothing else flows downstream.

const { z } = require('zod');

const AgentResult = z.object({
    status: z.enum(['ok', 'review_required', 'failed', 'waiting_input', 'skipped']),
    risk: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
    confidence: z.number().min(0).max(1).nullable().default(null),
    summary: z.string().default(''),
    findings: z.array(z.object({
        severity: z.enum(['info', 'warning', 'high', 'critical']),
        metric: z.string().nullable().optional(),
        message: z.string(),
        evidence: z.record(z.any()).nullable().optional()
    })).default([]),
    evidence: z.array(z.object({
        source: z.string(),                       // table/view/service/report id
        ref: z.string().nullable().optional(),    // row id / period
        note: z.string().default('')
    })).default([]),
    recommended_action: z.string().nullable().default(null),
    requires_approval: z.boolean().default(false),
    data: z.record(z.any()).nullable().optional() // agent-specific structured payload
});

// Error taxonomy (PRD §26) — retryable set lives here as single truth.
const ERROR_CLASSES = [
    'VALIDATION_ERROR', 'AUTHORIZATION_ERROR', 'TOOL_ERROR', 'MODEL_ERROR',
    'OCR_ERROR', 'DATABASE_ERROR', 'TIMEOUT', 'POLICY_BLOCK',
    'APPROVAL_REQUIRED', 'INSUFFICIENT_DATA', 'EXTERNAL_PROVIDER_ERROR',
    'MODEL_UNAVAILABLE', 'NOT_IMPLEMENTED'
];
const RETRYABLE = new Set(['TOOL_ERROR', 'DATABASE_ERROR', 'TIMEOUT', 'EXTERNAL_PROVIDER_ERROR']);
const NON_RETRYABLE = new Set([
    'VALIDATION_ERROR', 'AUTHORIZATION_ERROR', 'POLICY_BLOCK',
    'APPROVAL_REQUIRED', 'INSUFFICIENT_DATA', 'MODEL_UNAVAILABLE', 'NOT_IMPLEMENTED'
]);

class AgentError extends Error {
    constructor(errorClass, message, { retryable } = {}) {
        super(message);
        this.name = 'AgentError';
        this.errorClass = ERROR_CLASSES.includes(errorClass) ? errorClass : 'TOOL_ERROR';
        this.retryable = retryable !== undefined ? retryable : RETRYABLE.has(this.errorClass);
    }
}

module.exports = { AgentResult, ERROR_CLASSES, RETRYABLE, NON_RETRYABLE, AgentError, z };
