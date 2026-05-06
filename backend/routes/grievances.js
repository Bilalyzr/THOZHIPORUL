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
    const newGrievance = {
        id: mockGrievances.length + 1,
        ...req.body,
        status: "Open",
        submitted_at: new Date().toISOString().split('T')[0]
    };
    mockGrievances.push(newGrievance);
    res.status(201).json(newGrievance);
});

module.exports = router;
