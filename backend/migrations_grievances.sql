-- Grievances table: persists public/industrial grievances (was previously in-memory).
-- Additive only. Safe to re-run: CREATE TABLE IF NOT EXISTS + guarded INSERTs.

CREATE TABLE IF NOT EXISTS grievances (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT 'Anonymous',
    description TEXT,
    status VARCHAR(50) DEFAULT 'Open',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed a few realistic Tamil Nadu grievances so the demo list isn't empty.
-- Guarded so re-running the migration does not create duplicates.

INSERT INTO grievances (title, location, name, description, status, submitted_at)
SELECT 'Water logging near Gate 2', 'Oragadam', 'Raja Kumar',
       'Phone: 9843012345. Details: Stagnant water at the main entrance road after monsoon rains, blocking truck movement.',
       'Open', '2026-05-01 09:15:00'
WHERE NOT EXISTS (
    SELECT 1 FROM grievances WHERE title = 'Water logging near Gate 2' AND location = 'Oragadam'
);

INSERT INTO grievances (title, location, name, description, status, submitted_at)
SELECT 'Streetlights not working on inner road', 'Siruseri IT Park', 'Suresh Babu',
       'Phone: 9789054321. Details: Several streetlights along the inner service road have been off for two weeks, raising safety concerns for night-shift staff.',
       'In Progress', '2026-04-28 18:40:00'
WHERE NOT EXISTS (
    SELECT 1 FROM grievances WHERE title = 'Streetlights not working on inner road' AND location = 'Siruseri IT Park'
);

INSERT INTO grievances (title, location, name, description, status, submitted_at)
SELECT 'Irregular water supply to plots', 'Hosur', 'Anonymous',
       'Phone: 9600123456. Details: Water supply to the allotted plots has been irregular for the past few days, affecting production schedules.',
       'Open', '2026-05-10 11:05:00'
WHERE NOT EXISTS (
    SELECT 1 FROM grievances WHERE title = 'Irregular water supply to plots' AND location = 'Hosur'
);

INSERT INTO grievances (title, location, name, description, status, submitted_at)
SELECT 'Damaged road near effluent treatment plant', 'Oragadam', 'Lakshmi Narayanan',
       'Phone: 9791088776. Details: Potholes on the approach road to the ETP are damaging vehicles and slowing waste transport.',
       'Resolved', '2026-03-22 14:20:00'
WHERE NOT EXISTS (
    SELECT 1 FROM grievances WHERE title = 'Damaged road near effluent treatment plant' AND location = 'Oragadam'
);
