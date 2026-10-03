// memory/workingMemory.js — current workflow state access. The canonical
// store is agent_workflows.state (the LangGraph checkpoint); this module
// is the typed read/write surface used by nodes and the resume path.

const db = require('../../db');

async function get(workflowId) {
    const { rows } = await db.query('SELECT state FROM agent_workflows WHERE workflow_id=$1::uuid', [workflowId]);
    return rows.length ? rows[0].state : null;
}

async function set(workflowId, state) {
    await db.query(
        'UPDATE agent_workflows SET state=$1::jsonb, updated_at=NOW() WHERE workflow_id=$2::uuid',
        [JSON.stringify(state), workflowId]);
}

/** Mark current node + persist atomically with status transitions. */
async function checkpoint(workflowId, state, { node, status } = {}) {
    await db.query(
        `UPDATE agent_workflows
            SET state=$1::jsonb,
                currentNode=COALESCE($2, currentNode),
                status=COALESCE($3, status),
                updated_at=NOW()
          WHERE workflow_id=$4::uuid`,
        [JSON.stringify(state), node || null, status || null, workflowId]);
}

module.exports = { get, set, checkpoint };
