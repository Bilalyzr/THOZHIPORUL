const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ----------------------------------------------------------------
// Secure Vault file storage.
// Files land in backend/uploads/<timestamp>-<sanitised-name>. The
// timestamp prefix avoids collisions and the basename() strip removes
// any path components (defence against path-traversal in the name).
// ----------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
// Ensure the directory exists on boot (no-op if already present).
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        // Strip directory components + unsafe chars from the original name.
        const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});
// 25 MB hard cap — matches the frontend's tier-quota enforcement.
const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }
});

// @route   GET /api/workspace/overview
// @desc    Combined workspace overview for industry user
// @access  Private (Industry)
router.get('/overview', requireRole(['industry']), async (req, res) => {
    try {
        const industryId = req.user.profile_id;
        if (!industryId) {
            return res.status(400).json({ error: 'No profile associated with this industry account.' });
        }

        // 1. Get profile details
        const profileRes = await db.query(
            `SELECT 
                ip.id as profile_id,
                ip.company_name,
                ip.industry_type,
                ip.location,
                ip.contact_person,
                ip.phone_number,
                ip.registration_date,
                ip.compliance_score as overall_compliance_score,
                ip.subscription_tier,
                u.email,
                p.name as park_name,
                pp.plot_number,
                pp.area_acres as plot_area_acres,
                pp.lease_start_date,
                pp.lease_end_date,
                pp.monthly_lease_amount
             FROM industry_profiles ip
             JOIN users u ON ip.user_id = u.id
             LEFT JOIN industrial_parks p ON ip.park_id = p.id
             LEFT JOIN park_plots pp ON ip.plot_id = pp.id OR pp.allottee_industry_id = ip.id
             WHERE ip.id = $1`,
            [industryId]
        );

        const profile = profileRes.rows[0];
        if (!profile) {
            return res.status(404).json({ error: 'Industry profile not found.' });
        }

        // 2. Get latest compliance score
        const scoreRes = await db.query(
            `SELECT overall_score, submission_score, environmental_score, financial_score, safety_score 
             FROM compliance_scores 
             WHERE industry_id = $1 
             ORDER BY score_date DESC 
             LIMIT 1`,
            [industryId]
        );
        const scoreRow = scoreRes.rows[0];

        // 3. Get latest submission metrics
        const subRes = await db.query(
            `SELECT 
                ds.status, ds.period_year, ds.period_quarter,
                f.investment_amount, f.annual_turnover,
                e.permanent_employees, e.contract_employees,
                r.water_consumption, r.power_usage
             FROM data_submissions ds
             LEFT JOIN financial_data f ON ds.id = f.submission_id
             LEFT JOIN employment_data e ON ds.id = e.submission_id
             LEFT JOIN resource_usage r ON ds.id = r.submission_id
             WHERE ds.industry_id = $1
             ORDER BY ds.period_year DESC, ds.period_quarter DESC
             LIMIT 1`,
            [industryId]
        );
        const subRow = subRes.rows[0];

        // 4. Get submissions and documents lists for pending tasks
        const subsListRes = await db.query(
            `SELECT status, period_year, period_quarter FROM data_submissions WHERE industry_id = $1`,
            [industryId]
        );
        const docsListRes = await db.query(
            `SELECT category, verified, expiry_date FROM documents WHERE industry_id = $1`,
            [industryId]
        );

        // 5. Get compliance violations
        const violationsRes = await db.query(
            `SELECT cv.*, cr.rule_name 
             FROM compliance_violations cv
             JOIN compliance_rules cr ON cv.rule_id = cr.id
             WHERE cv.industry_id = $1 AND cv.status != 'resolved'
             ORDER BY cv.violation_date DESC`,
            [industryId]
        );

        // 6. Get service request status counts
        const serviceRes = await db.query(
            `SELECT current_status, COUNT(*) as count 
             FROM service_requests 
             WHERE industry_id = $1 
             GROUP BY current_status`,
            [industryId]
        );

        // Synthesize results
        const company = {
            name: profile.company_name,
            park: profile.park_name || 'Oragadam Industrial Park',
            plot: profile.plot_number || 'A-101',
            since: profile.registration_date ? new Date(profile.registration_date).getFullYear() : 2019,
            industry_type: profile.industry_type,
            location: profile.location,
            contact_person: profile.contact_person,
            phone_number: profile.phone_number,
            email: profile.email,
            subscription_tier: profile.subscription_tier || 'free_starter'
        };

        const compliance_score = {
            overall: scoreRow ? scoreRow.overall_score : 0,
            submission: scoreRow ? scoreRow.submission_score : 0,
            environmental: scoreRow ? scoreRow.environmental_score : 0,
            financial: scoreRow ? scoreRow.financial_score : 0,
            safety: scoreRow ? scoreRow.safety_score : 0
        };

        const formatToCrores = (val) => {
            const num = Number(val);
            if (!num) return 0;
            return num > 10000 ? num / 10000000 : num;
        };

        const quick_stats = {
            employees: subRow ? (Number(subRow.permanent_employees || 0) + Number(subRow.contract_employees || 0)) : 0,
            investment_cr: subRow ? formatToCrores(subRow.investment_amount) : 0,
            power_usage_kwh: subRow ? Number(subRow.power_usage || 0) : 0,
            water_usage_kl: subRow ? Number(subRow.water_consumption || 0) : 0
        };

        const lease = {
            status: 'Active',
            plot_number: profile.plot_number || 'A-101',
            park_name: profile.park_name || 'Oragadam Industrial Park',
            area_acres: profile.plot_area_acres ? Number(profile.plot_area_acres) : 5.0,
            zone_type: 'Industrial',
            lease_start: profile.lease_start_date ? new Date(profile.lease_start_date).toISOString().split('T')[0] : '2019-04-01',
            end_date: profile.lease_end_date ? new Date(profile.lease_end_date).toISOString().split('T')[0] : '2035-03-31',
            monthly_amount: profile.monthly_lease_amount ? Number(profile.monthly_lease_amount) : 240000,
            total_paid: 17280000,
            next_payment_due: '2026-05-01',
            payment_status: 'Current'
        };

        const subs = subsListRes.rows;
        const docs = docsListRes.rows;
        const hasQ12026 = subs.find(s => s.period_year === 2026 && s.period_quarter === 1);
        const hasFireNoc = docs.find(d => d.category === 'fire_noc');
        const hasPollution = docs.find(d => d.category === 'pollution_clearance');

        const pending_tasks = [
            { 
                id: 1, 
                title: hasQ12026 ? `Q1 2026 Data Submission - ${hasQ12026.status}` : 'Q1 2026 Data Submission', 
                due_date: '2026-04-15', 
                type: 'submission', 
                priority: 'high', 
                done: !!hasQ12026 
            },
            { 
                id: 2, 
                title: hasFireNoc ? 'Fire NOC Uploaded' : 'Fire NOC Renewal', 
                due_date: '2026-05-01', 
                type: 'document', 
                priority: 'medium', 
                done: !!hasFireNoc 
            },
            { 
                id: 3, 
                title: hasPollution ? 'Pollution Clearance Valid' : 'Pollution Certificate Expiring', 
                due_date: '2026-08-15', 
                type: 'document', 
                priority: 'low', 
                done: !!hasPollution 
            },
            { 
                id: 4, 
                title: 'Q4 2025 Data - Approved', 
                due_date: '2026-01-15', 
                type: 'submission', 
                priority: 'none', 
                done: true 
            },
            { 
                id: 5, 
                title: 'Lease Agreement Signed', 
                due_date: '2025-12-01', 
                type: 'lease', 
                priority: 'none', 
                done: true 
            }
        ];

        const violations = violationsRes.rows;
        const notices = violations.map(v => ({
            id: v.id,
            severity: v.severity === 'critical' || v.severity === 'high' ? 'warning' : 'info',
            message: `${v.rule_name || 'Violation'}: ${v.description}`,
            date: new Date(v.violation_date).toISOString().split('T')[0]
        }));

        if (notices.length === 0) {
            notices.push({
                id: 1,
                severity: 'info',
                message: 'All core compliances are currently in good standing.',
                date: new Date().toISOString().split('T')[0]
            });
        }

        const serviceRows = serviceRes.rows;
        const service_summary = { applied: 0, in_review: 0, approved: 0, completed: 0 };
        serviceRows.forEach(row => {
            const status = row.current_status;
            if (status === 'applied') {
                service_summary.applied += Number(row.count);
            } else if (['document_review', 'field_inspection', 'pending_approval'].includes(status)) {
                service_summary.in_review += Number(row.count);
            } else if (status === 'approved') {
                service_summary.approved += Number(row.count);
            } else if (status === 'completed') {
                service_summary.completed += Number(row.count);
            }
        });

        res.json({
            company,
            compliance_score,
            quick_stats,
            lease,
            pending_tasks,
            notices,
            service_summary
        });
    } catch (err) {
        console.error('Workspace Overview Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/workspace/profile
// @desc    Update profile contact details
// @access  Private (Industry)
router.put('/profile', requireRole(['industry']), async (req, res) => {
    try {
        const industryId = req.user.profile_id;
        if (!industryId) {
            return res.status(400).json({ error: 'No profile associated with this industry account.' });
        }
        
        const { contactPerson, phoneNumber } = req.body;
        
        if (!contactPerson || !phoneNumber) {
            return res.status(400).json({ error: 'Contact person and phone number are required.' });
        }
        
        await db.query(
            `UPDATE industry_profiles 
             SET contact_person = $1, phone_number = $2 
             WHERE id = $3`,
            [contactPerson, phoneNumber, industryId]
        );
        
        console.log(`[DB] Updated Profile for Industry ID ${industryId}: ${contactPerson}, ${phoneNumber}`);
        res.json({ msg: 'Profile updated successfully' });
    } catch (err) {
        console.error('Update Profile Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspace/compliance-score
// @desc    Detailed compliance breakdown with history
// @access  Private (Industry)
router.get('/compliance-score', requireRole(['industry']), async (req, res) => {
    try {
        const industryId = req.user.profile_id;
        if (!industryId) {
            return res.status(400).json({ error: 'No profile associated with this industry account.' });
        }

        // Get latest compliance score
        const scoreRes = await db.query(
            `SELECT overall_score, submission_score, environmental_score, financial_score, safety_score 
             FROM compliance_scores 
             WHERE industry_id = $1 
             ORDER BY score_date DESC 
             LIMIT 1`,
            [industryId]
        );
        const scoreRow = scoreRes.rows[0];

        // Get history of compliance scores (last 6 months)
        const historyRes = await db.query(
            `SELECT score_date, overall_score 
             FROM compliance_scores 
             WHERE industry_id = $1 
             ORDER BY score_date ASC 
             LIMIT 6`,
            [industryId]
        );
        const history = historyRes.rows.map(h => ({
            month: new Date(h.score_date).toISOString().substring(0, 7), // 'YYYY-MM'
            overall: h.overall_score
        }));

        // Dynamic tips based on scores
        const tips = [];
        if (!scoreRow) {
            tips.push('Complete your first data submission to establish your compliance score.');
        } else {
            if (Number(scoreRow.submission_score || 0) < 80) {
                tips.push('Submit pending quarterly data within the first 15 days of the quarter.');
            }
            if (Number(scoreRow.environmental_score || 0) < 80) {
                tips.push('Optimize water/power consumption and increase your waste recycling rate above 60%.');
            }
            if (Number(scoreRow.safety_score || 0) < 80) {
                tips.push('Renew your Fire safety certificate and clear active safety violations.');
            }
            if (Number(scoreRow.financial_score || 0) < 80) {
                tips.push('Ensure all declarations for investment changes over 10% are submitted.');
            }
        }
        if (tips.length === 0) {
            tips.push('Maintain your excellent compliance standards across all categories.');
            tips.push('Keep documents updated ahead of their expiration dates.');
        }

        res.json({
            current: {
                overall: scoreRow ? scoreRow.overall_score : 0,
                submission: scoreRow ? scoreRow.submission_score : 0,
                environmental: scoreRow ? scoreRow.environmental_score : 0,
                financial: scoreRow ? scoreRow.financial_score : 0,
                safety: scoreRow ? scoreRow.safety_score : 0
            },
            history,
            tips
        });
    } catch (err) {
        console.error('Compliance Score Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspace/documents
// @desc    Document vault list for industry, govt, or admin
// @access  Private (Industry/Govt/Admin)
router.get('/documents', requireRole(['industry', 'govt', 'admin']), async (req, res) => {
    try {
        let docsRes;
        
        if (req.user.role === 'govt' || req.user.role === 'admin') {
            // For admin and govt, return all documents in the system
            docsRes = await db.query(
                `SELECT d.id, d.category, d.file_name, d.expiry_date, d.verified, d.file_size_kb, d.created_at, ip.company_name
                 FROM documents d
                 LEFT JOIN industry_profiles ip ON d.industry_id = ip.id
                 ORDER BY d.created_at DESC`
            );
        } else {
            const industryId = req.user.profile_id;
            if (!industryId) {
                return res.status(400).json({ error: 'No profile associated with this industry account.' });
            }
            docsRes = await db.query(
                `SELECT id, category, file_name, expiry_date, verified, file_size_kb, created_at 
                 FROM documents 
                 WHERE industry_id = $1
                 ORDER BY created_at DESC`,
                [industryId]
            );
        }

        const documents = docsRes.rows.map(d => ({
            id: d.id,
            category: d.category,
            file_name: d.file_name,
            expiry_date: d.expiry_date ? new Date(d.expiry_date).toISOString().split('T')[0] : null,
            verified: d.verified,
            file_size_kb: d.file_size_kb || 150,
            uploaded_at: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : null,
            company_name: d.company_name || null
        }));

        res.json(documents);
    } catch (err) {
        console.error('Documents Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/workspace/documents
// @desc    Upload a REAL document (multipart/form-data). The file is
//          written to backend/uploads/ and the documents row stores the
//          genuine path, size and mime type — so it persists across
//          refresh and is genuinely downloadable.
// @access  Private (Industry)
router.post('/documents', requireRole(['industry']), upload.single('file'), async (req, res) => {
    try {
        const industryId = req.user.profile_id;
        const userId = req.user.id;
        if (!industryId) {
            // Clean up the temp file if the user has no profile yet.
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'No profile associated with this industry account.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'A file is required. Select a file to upload.' });
        }

        // Form fields (sent alongside the file in the FormData payload).
        const category = req.body.category;
        const expiryDate = req.body.expiryDate || null;
        // Display name defaults to the original uploaded filename.
        const fileName = req.body.fileName || req.file.originalname;

        if (!category) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'Category is required.' });
        }

        // file_path is the URL the static handler serves (see index.js).
        const filePath = `/uploads/${req.file.filename}`;
        const sizeKb = Math.max(1, Math.round(req.file.size / 1024));

        const docInsert = await db.query(
            `INSERT INTO documents (industry_id, uploaded_by, category, file_name, file_path, file_size_kb, mime_type, expiry_date, verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
             RETURNING id`,
            [industryId, userId, category, fileName, filePath, sizeKb, req.file.mimetype, expiryDate]
        );

        console.log(`[VAULT] Document uploaded to disk: ${req.file.filename} (${category}, ${sizeKb} KB) for industry ID ${industryId}`);
        res.status(201).json({ msg: 'Document uploaded successfully', id: docInsert.rows[0].id });
    } catch (err) {
        // Best-effort cleanup of the partial file on failure.
        if (req.file) { try { fs.unlink(req.file.path, () => {}); } catch (_) {} }
        console.error('Document Upload Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspace/documents/:id/download
// @desc    Download the real file from disk (Secure Vault). Industry users
//          can only download their own; admin/govt may download any.
// @access  Private (Industry owner, Admin, Govt)
router.get('/documents/:id/download', requireRole(['industry', 'admin', 'govt']), async (req, res) => {
    try {
        const doc = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
        if (!doc.rows.length) return res.status(404).json({ error: 'Document not found.' });

        const d = doc.rows[0];
        // Ownership check for industry users.
        if (req.user.role === 'industry' && d.industry_id !== req.user.profile_id) {
            return res.status(403).json({ error: 'You can only download your own documents.' });
        }

        // Resolve the on-disk filename. file_path looks like "/uploads/<filename>".
        const diskName = path.basename(d.file_path || '');
        const absPath = path.join(UPLOAD_DIR, diskName);

        if (!diskName || !fs.existsSync(absPath)) {
            return res.status(404).json({ error: 'File is missing from storage. It may have been removed.' });
        }

        // Suggest the display name as the download filename.
        res.download(absPath, d.file_name || diskName, (err) => {
            if (err) console.error('Download stream error:', err.message);
        });
    } catch (err) {
        console.error('Document Download Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/workspace/documents/:id
// @desc    Delete a document — removes the DB row AND unlinks the file
//          from disk (best-effort). Industry-owner only.
// @access  Private (Industry)
router.delete('/documents/:id', requireRole(['industry']), async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM documents WHERE id = $1 AND industry_id = $2 RETURNING file_path',
            [req.params.id, req.user.profile_id]
        );
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Document not found or not yours.' });
        }
        // Best-effort file removal.
        const diskName = path.basename(result.rows[0].file_path || '');
        if (diskName) {
            fs.unlink(path.join(UPLOAD_DIR, diskName), () => {});
        }
        res.json({ msg: 'Document deleted.' });
    } catch (err) {
        console.error('Document Delete Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspace/lease
// @desc    Lease details for industry
// @access  Private (Industry)
router.get('/lease', requireRole(['industry']), async (req, res) => {
    try {
        const industryId = req.user.profile_id;
        if (!industryId) {
            return res.status(400).json({ error: 'No profile associated with this industry account.' });
        }

        const leaseRes = await db.query(
            `SELECT 
                pp.plot_number,
                p.name as park_name,
                pp.area_acres,
                pp.zone_type,
                pp.lease_start_date,
                pp.lease_end_date,
                pp.monthly_lease_amount
             FROM industry_profiles ip
             LEFT JOIN park_plots pp ON ip.plot_id = pp.id OR pp.allottee_industry_id = ip.id
             LEFT JOIN industrial_parks p ON pp.park_id = p.id
             WHERE ip.id = $1`,
            [industryId]
        );
        const leaseRow = leaseRes.rows[0];
        if (!leaseRow || !leaseRow.plot_number) {
            return res.status(404).json({ error: 'Lease details not found for this profile.' });
        }
        
        let totalPaid = 0;
        let leaseStartStr = '2019-04-01';
        let leaseEndStr = '2035-03-31';
        let monthlyAmount = Number(leaseRow.monthly_lease_amount) || 150000;
        
        if (leaseRow.lease_start_date) {
            const start = new Date(leaseRow.lease_start_date);
            const today = new Date();
            const diffMonths = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth();
            if (diffMonths > 0) {
                totalPaid = diffMonths * monthlyAmount;
            }
            leaseStartStr = start.toISOString().split('T')[0];
        }
        if (leaseRow.lease_end_date) {
            leaseEndStr = new Date(leaseRow.lease_end_date).toISOString().split('T')[0];
        }

        const lease = {
            plot_number: leaseRow.plot_number,
            park_name: leaseRow.park_name || 'SIPCOT Industrial Park',
            area_acres: leaseRow.area_acres ? Number(leaseRow.area_acres) : 5.0,
            zone_type: leaseRow.zone_type || 'Industrial',
            lease_start: leaseStartStr,
            lease_end: leaseEndStr,
            monthly_amount: monthlyAmount,
            total_paid: totalPaid || (monthlyAmount * 36),
            next_payment_due: '2026-07-01',
            payment_status: 'Current'
        };
        res.json(lease);
    } catch (err) {
        console.error('Lease Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/workspace/verify-vault
// @desc    Verify the vault passphrase (against user password or fallback)
// @access  Private (Industry/Govt/Admin)
router.post('/verify-vault', requireRole(['industry', 'govt', 'admin']), async (req, res) => {
    try {
        const { passphrase } = req.body;
        const userId = req.user.id;

        if (!passphrase) {
            return res.status(400).json({ error: 'Passphrase is required.' });
        }

        // Demo passphrase shortcuts only work when demo mode is explicitly enabled.
        const demoEnabled = process.env.ENABLE_DEMO_LOGIN === 'true';
        const cleanPassphrase = passphrase.trim().toLowerCase();
        if (demoEnabled && (cleanPassphrase === 'sipcot123' || cleanPassphrase === 'password123')) {
            return res.json({ success: true });
        }

        // Fetch user from DB to check actual password
        const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];

        if (user) {
            // The '$demo$' placeholder only unlocks when demo mode is enabled.
            if (demoEnabled && user.password_hash === '$demo$' && passphrase === 'password') {
                return res.json({ success: true });
            }
            const isMatch = await bcrypt.compare(passphrase, user.password_hash);
            if (isMatch) {
                return res.json({ success: true });
            }
        }

        return res.status(401).json({ error: 'Invalid Decryption Passphrase.' });
    } catch (err) {
        console.error('Verify Vault Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
