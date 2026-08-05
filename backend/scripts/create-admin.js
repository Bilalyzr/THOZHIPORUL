#!/usr/bin/env node
/**
 * create-admin.js — one-time production admin bootstrap.
 *
 * Creates the first admin account with a RANDOM password (printed once
 * to the console). No demo data, no shared passwords. Run AFTER the
 * production stack is up:
 *
 *   docker exec -it sipcot_backend node scripts/create-admin.js
 *
 * Or locally:
 *   node scripts/create-admin.js
 *
 * If an admin already exists, it exits without creating a duplicate.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

(async () => {
    try {
        // Check if an admin already exists.
        const existing = await db.query("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");
        if (existing.rows.length) {
            console.log('\n✅ An admin account already exists:');
            console.log('   Email:', existing.rows[0].email);
            console.log('   Skipping creation. To reset the password, use the database directly.\n');
            process.exit(0);
        }

        // Generate a random password (16 hex chars = 64 bits of entropy).
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 12); // cost 12 (OWASP minimum)

        const email = 'admin@sipcot.com';
        await db.query(
            'INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, $3, $4)',
            [email, hash, 'admin', 'Active']
        );

        // NOTE: we intentionally do NOT pre-seed a user_mfa row here.
        // The user_mfa.secret_encrypted column is NOT NULL, and the admin has
        // no secret yet — inserting a bare (user_id, enabled=FALSE) row throws
        // a NOT NULL violation that bricks the bootstrap (admin created but
        // password never printed). The mandatory-2FA login gate already treats
        // "no user_mfa row" as mfa_setup_required, and POST /api/security/mfa/setup
        // creates the row (with a real secret) on first login via ON CONFLICT.

        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║  ✅ ADMIN ACCOUNT CREATED SUCCESSFULLY                   ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║                                                          ║');
        console.log('║  Email:    admin@sipcot.com                              ║');
        console.log(`║  Password: ${tempPassword.padEnd(45)}║`);
        console.log('║                                                          ║');
        console.log('║  ⚠️  SAVE THIS PASSWORD NOW — it is shown only once.      ║');
        console.log('║  You will be forced to set up 2FA on first login.         ║');
        console.log('║                                                          ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        process.exit(0);
    } catch (err) {
        console.error('\n❌ Failed to create admin:', err.message, '\n');
        process.exit(1);
    }
})();
