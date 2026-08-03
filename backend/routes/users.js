const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { requireRole } = require('./auth');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/', requireRole(['admin']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                u.id, 
                u.email as "rootEmail", 
                u.role, 
                u.status, 
                COALESCE(i.company_name, u.email) as name
            FROM users u
            LEFT JOIN industry_profiles i ON i.user_id = u.id
            ORDER BY u.id ASC
        `);
        
        // Map role casing for frontend compatibility
        const mappedUsers = rows.map(user => {
            let mappedRole = 'Industry';
            if (user.role === 'admin') mappedRole = 'Admin';
            if (user.role === 'govt') mappedRole = 'Govt';
            
            return {
                id: user.id,
                name: user.name,
                rootEmail: user.rootEmail,
                role: mappedRole,
                status: user.status
            };
        });
        
        res.json(mappedUsers);
    } catch (err) {
        console.error("Fetch Users Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/users
// @desc    Create a new user manually
// @access  Private (Admin)
router.post('/', requireRole(['admin']), async (req, res) => {
    try {
        const { name, rootEmail, role, status } = req.body;
        
        // Check if user exists
        const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [rootEmail]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ msg: "User already exists" });
        }

        // Default password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);

        const dbRole = role.toLowerCase();

        // Use a single pooled client so BEGIN/INSERT/COMMIT form a real
        // transaction (db.query() checks out a NEW client each call, which
        // would break the transaction boundary).
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const newUser = await client.query(
                "INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, $3, $4) RETURNING id, email, role, status",
                [rootEmail, passwordHash, dbRole, status || 'Pending']
            );

            const userId = newUser.rows[0].id;

            if (dbRole === 'industry') {
                await client.query(
                    "INSERT INTO industry_profiles (user_id, company_name, industry_type, location) VALUES ($1, $2, 'Other', 'Other')",
                    [userId, name || rootEmail]
                );
            }

            await client.query('COMMIT');

            res.json({
                id: userId,
                name: name || rootEmail,
                rootEmail: rootEmail,
                role: role,
                status: status || 'Pending'
            });
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Create User Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status
// @access  Private (Admin)
router.put('/:id/status', requireRole(['admin']), async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        
        await db.query(
            "UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [status, id]
        );
        
        res.json({ msg: "Status updated successfully" });
    } catch (err) {
        console.error("Update Status Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/users/:id
// @desc    Update user details
// @access  Private (Admin)
router.put('/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { name, rootEmail, role, status } = req.body;
        const { id } = req.params;

        // Use a single pooled client so BEGIN/UPDATE/COMMIT form a real
        // transaction (db.query() checks out a NEW client each call).
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const dbRole = role.toLowerCase();

            await client.query(
                "UPDATE users SET email = $1, role = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
                [rootEmail, dbRole, status, id]
            );

            if (dbRole === 'industry') {
                await client.query(
                    "UPDATE industry_profiles SET company_name = $1 WHERE user_id = $2",
                    [name, id]
                );
            }

            await client.query('COMMIT');
            res.json({ msg: "User updated successfully" });
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Update User Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private (Admin)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        // cascade delete handles related records
        await db.query("DELETE FROM users WHERE id = $1", [id]);
        
        res.json({ msg: "User deleted successfully" });
    } catch (err) {
        console.error("Delete User Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
