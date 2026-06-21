const express = require('express');
const router = express.Router();

let mockGrievances = [
  { id: 1, title: "Water Logging near Gate 2", location: "Oragadam", status: "Open", submitted_at: "2026-05-01", name: "Raja" },
  { id: 2, title: "Streetlight not working", location: "Siruseri IT Park", status: "In Progress", submitted_at: "2026-04-28", name: "Suresh" }
];

router.get('/', (req, res) => {
    res.json(mockGrievances);
});

router.post('/', (req, res) => {
    // Extract only allowed fields to prevent mass assignment vulnerability
    const { title, location, name, description } = req.body;

    if (!title || !location) {
        return res.status(400).json({ error: 'Title and location are required' });
    }

    const newGrievance = {
        id: mockGrievances.length + 1,
        title,
        location,
        name: name || 'Anonymous',
        description: description || '',
        status: "Open",
        submitted_at: new Date().toISOString().split('T')[0]
    };
    mockGrievances.push(newGrievance);
    res.status(201).json(newGrievance);
});

// @route   PUT /api/grievances/:id/status
// @desc    Update grievance status
// @access  Public or Private (Admin/Govt)
router.put('/:id/status', (req, res) => {
    const { status } = req.body;
    const id = parseInt(req.params.id);
    
    const grievance = mockGrievances.find(g => g.id === id);
    if (!grievance) {
        return res.status(404).json({ error: 'Grievance not found' });
    }
    
    if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be Open, In Progress, or Resolved.' });
    }
    
    grievance.status = status;
    res.json({ msg: `Grievance status updated to ${status}`, grievance });
});

module.exports = router;
