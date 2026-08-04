import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, IconButton, TextField, Paper, Fab, Fade, Chip,
  Avatar, InputAdornment, Divider, Slide, Tooltip
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { keyframes } from '@emotion/react';

import fabIcon from '../assets/vazhiporul_fab_icon.png';

const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.08)}`;
const typing = keyframes`0%{opacity:.2}20%{opacity:1}100%{opacity:.2}`;
const float = keyframes`0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.03)}`;
const pulseGreen = keyframes`
  0% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// VAZHIPORUL AI - COMPREHENSIVE SIPCOT KNOWLEDGE BASE v2.0
// ═══════════════════════════════════════════════════════════════════════════════
const SITE_KNOWLEDGE = {
  platform: {
    name: 'THOZHIRPORUL',
    tamilName: 'தொழில்புரள்',
    fullName: 'Smart Industrial Monitoring System (SIMS)',
    by: 'NEXORA, Government of Tamil Nadu',
    govtBody: 'SIPCOT (State Industries Promotion Corporation of Tamil Nadu)',
    established: '1971',
    desc: 'THOZHIRPORUL is the unified digital platform powering Tamil Nadu\'s industrial transformation through real-time monitoring, compliance tracking, and data-driven governance. It connects industries, government officers, and SIPCOT administrators on a single platform.',
    vision: 'To digitize and modernize Tamil Nadu\'s industrial park governance, enabling transparency, efficiency, and data-driven decision-making.',
    achievements: [
      'Service delivery reduced from 15-30 days to less than 7 days',
      'Compliance reporting increased from 60% to 95%',
      '90% of service requests now digital',
      'Managing 1,250+ industries across 6 major industrial parks',
      'Administrative overhead reduced by 40%',
      'Paper usage reduced by 2,00,000 pages per month'
    ]
  },
  roles: [
    { name: 'Admin', desc: 'Full system access — dashboards, user management, compliance engine, services tracker, analytics, parks explorer, reports, and settings.', loginPath: '/login/admin' },
    { name: 'Industry', desc: 'Workspace dashboard, data submission, compliance tracking, service requests (NOCs, land allotment), reports, and parks explorer.', loginPath: '/login/industry' },
    { name: 'Government Officer', desc: 'Command center with KPIs, parks explorer, services overview, compliance engine, analytics, and report center.', loginPath: '/login/govt' },
  ],
  pages: [
    { path: '/home', name: 'Home', desc: 'Landing page with platform overview, live statistics, capabilities showcase, and GIS parks teaser.', public: true, keywords: ['home','landing','main','start','welcome'] },
    { path: '/about', name: 'About THOZHIRPORUL', desc: 'Platform mission, architecture, team information, and technology stack details.', public: true, keywords: ['about','info','mission','team'] },
    { path: '/features', name: 'Capabilities', desc: 'Detailed breakdown of all platform features — monitoring, compliance, analytics, and unified gateway.', public: true, keywords: ['features','capabilities','what can'] },
    { path: '/parks', name: 'Industrial Parks (Public)', desc: 'GIS interactive map of 8+ industrial parks across Tamil Nadu with search, filters, satellite/terrain views, and plot availability overlays. Public users see basic info; logged-in users get investment, employment, and infrastructure data.', public: true, keywords: ['parks','industrial park','map','gis','explore','oragadam','hosur','siruseri'] },
    { path: '/contact', name: 'Contact & Support', desc: 'Helpdesk contact form, phone numbers, email, and office address for SIPCOT support.', public: true, keywords: ['contact','support','help','phone','email'] },
    { path: '/grievance', name: 'Public Grievance', desc: 'Submit grievances and complaints publicly. Track grievance status.', public: true, keywords: ['grievance','complaint','issue','problem'] },
    { path: '/role-selection', name: 'Portal Selection', desc: 'Choose your login portal — Admin, Industry, or Government Officer. Each has a dedicated login page.', public: true, keywords: ['login','sign in','portal','role','access'] },
    { path: '/registration', name: 'Industry Registration', desc: 'Register a new industry on the platform. Requires company name, type, location, contact details, and password.', public: true, keywords: ['register','sign up','new industry','create account'] },
    { path: '/govt-registration', name: 'Government Registration', desc: 'Register as a government officer with designation, department, jurisdiction, and official email.', public: true, keywords: ['govt register','officer register','government sign up'] },
    { path: '/admin-dashboard', name: 'Admin Dashboard', desc: 'KPIs (industries, investment, employment, power), growth charts, resource consumption comparisons, real-time electricity/water flow with tariffs, AI decision support, and workflow automation engine.', roles: ['admin'], keywords: ['admin','dashboard','overview','kpi'] },
    { path: '/command-center', name: 'Command Center', desc: 'Government-level command center with state-wide KPIs, district heatmap, park rankings, red-flag alerts, investment/employment trends, and real-time activity feed.', roles: ['admin','govt'], keywords: ['command','center','government','heatmap','alerts','rankings'] },
    { path: '/workspace', name: 'Industry Workspace', desc: 'Industry\'s personal dashboard — compliance score, recent submissions, document vault, lease information, and quick action buttons for data submission and service requests.', roles: ['industry'], keywords: ['workspace','my dashboard','industry home'] },
    { path: '/submit-data', name: 'Unified Data Submission', desc: 'Submit quarterly/annual data — financial (revenue, investment), employment, resource usage (water, power, waste), and CSR activities. Multi-step wizard form.', roles: ['industry'], keywords: ['submit','data','quarterly','annual','financial','employment','resource'] },
    { path: '/services', name: 'Services Tracker', desc: 'Track NOCs, land allotments, water/power connections, lease renewals, and more. Kanban board and table views. Industries can create new requests (including plot allotment with acreage). Admins can approve, update status, and allot specific plots.', roles: ['admin','govt','industry'], keywords: ['services','noc','allotment','land','plot','request','track','kanban'] },
    { path: '/compliance', name: 'Compliance Monitoring', desc: 'Industry\'s own compliance status — submission history, scores, violation alerts, and deadline tracking.', roles: ['industry'], keywords: ['compliance','my compliance','violations','score'] },
    { path: '/compliance-engine', name: 'Compliance Engine', desc: 'Admin/Govt compliance dashboard — violations by severity, industry scores, missing submissions, automated reminders, trend analysis, and predictive risk scoring.', roles: ['admin','govt'], keywords: ['compliance engine','violations','rules','enforce'] },
    { path: '/parks-explorer', name: 'Parks Explorer (Authenticated)', desc: 'Full-featured GIS parks explorer with detailed investment, employment, infrastructure metrics, and "Apply for Plot" button that pre-fills a land allotment request.', roles: ['admin','govt','industry'], keywords: ['parks explorer','plot','apply'] },
    { path: '/report-center', name: 'Report & Export Center', desc: 'Generate custom reports — select data categories, date ranges, and export as PDF/Excel/CSV. Template-based reporting.', roles: ['admin','govt','industry'], keywords: ['report','export','pdf','excel','csv','download'] },
    { path: '/analytics', name: 'Analytics Dashboard', desc: 'Visual analytics — charts, graphs, and trend analysis for industrial data across parks.', roles: ['admin','govt'], keywords: ['analytics','charts','trends','graphs'] },
    { path: '/user-management', name: 'User Management', desc: 'Admin panel to view, activate, deactivate, and manage all registered users (industries and govt officers).', roles: ['admin'], keywords: ['users','manage','activate','deactivate'] },
    { path: '/industry-profile', name: 'Company Profile', desc: 'View and edit industry profile — company details, contact info, park/plot assignment.', roles: ['industry'], keywords: ['profile','company','my info'] },
    { path: '/audit-logs', name: 'Audit Logs', desc: 'System-wide audit trail — track who did what and when across the platform.', roles: ['admin','govt'], keywords: ['audit','logs','history','trail'] },
    { path: '/settings', name: 'Settings', desc: 'Platform settings — notification preferences, theme, and system configuration.', roles: ['admin'], keywords: ['settings','preferences','config'] },
  ],
  workflows: [
    { name: 'Plot Allotment', steps: ['1. Industry logs in and goes to Parks Explorer or Services Tracker','2. Selects "Land Allotment" as service type','3. Chooses target Industrial Park and required area in acres','4. Submits the request (status: Applied)','5. Admin reviews the request in Services Tracker','6. Admin updates status through Document Review → Field Inspection → Approved','7. On approval, Admin selects a specific available plot from the park','8. System atomically updates plot status, industry profile, and completes the request'], path: '/services' },
    { name: 'Data Submission', steps: ['1. Industry logs in → Workspace → Submit Data','2. Fills multi-step form: Financial → Employment → Resources → CSR','3. Submits quarterly/annual data','4. System validates and records the submission','5. Compliance score automatically updates'], path: '/submit-data' },
    { name: 'Grievance Filing', steps: ['1. Go to Public Grievance page (no login required)','2. Fill in grievance details and contact info','3. Submit the grievance','4. Receive tracking number','5. Track status on the same page'], path: '/grievance' },
    { name: 'Industry Registration', steps: ['1. Go to Portal Selection → Industry Portal','2. Click "Register your industry"','3. Fill company name, type, location, contact, email, password','4. Submit registration','5. Login with your new credentials'], path: '/registration' },
  ],
  quickFacts: [
    '8 industrial parks across Tamil Nadu are tracked on the platform',
    'The platform supports 3 roles: Admin, Industry, and Government Officer',
    'GIS maps support Street, Satellite, and Terrain views',
    'Real-time electricity and water flow monitoring with government tariff rates',
    'AI Decision Support system helps admins prioritize critical actions',
    'Compliance engine auto-detects violations based on 8 predefined rules',
    'Services Tracker supports Kanban board and Table views',
  ],
  interactionGuide: {
    title: 'How to get the best from VazhiPorul AI',
    tips: [
      '**Be Specific**: Instead of "help", try "How do I apply for a plot?"',
      '**Use Page Names**: Mention pages like "Compliance Engine" or "Parks Explorer"',
      '**Ask for Workflows**: Ask "What is the process for registration?"',
      '**Role-based info**: Ask "What can an Industry user do?"',
    ]
  },
  supportProcess: {
    title: 'How to Solve Doubts & Get Support',
    channels: [
      { type: 'AI Chatbot', desc: 'Ask me for instant navigation, workflow guides, and platform information.' },
      { type: 'Grievance System', desc: 'For formal complaints or issues, use the Public Grievance portal.' },
      { type: 'Contact Page', desc: 'Find official SIPCOT phone numbers and emails for technical or policy support.' },
      { type: 'Helpdesk Form', desc: 'Submit a support ticket directly through the Contact page form.' },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // INDUSTRIAL PARKS - COMPREHENSIVE INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════════
  industrialParks: [
    {
      name: 'Oragadam',
      code: 'ORGDM',
      district: 'Kancheepuram',
      specialty: 'Asia\'s Largest Automotive Hub',
      description: 'Oragadam is SIPCOT\'s flagship industrial park, home to major automotive companies including Renault-Nissan, Daimler, and Apollo Tyres. It spans over 2,000 acres with excellent connectivity via GST Road and ORR.',
      industries: ['Automotive', 'Auto Components', 'Manufacturing'],
      infrastructure: {
        power: 'TANGEDCO 110KV Substation',
        water: 'Chennai Metro Water + Groundwater',
        roads: '60m/40m Internal Roads',
        connectivity: 'GST Road, Outer Ring Road'
      },
      investment: '₹15,000+ Crores',
      employment: '45,000+ Direct Jobs'
    },
    {
      name: 'Sriperumbudur',
      code: 'SRPBR',
      district: 'Kancheepuram',
      specialty: 'Electronics & Manufacturing Hub',
      description: 'Sriperumbudur is known as the "Detroit of South India" with focus on electronics, telecom, and heavy manufacturing. Home to Samsung, Foxconn, and Motorola.',
      industries: ['Electronics', 'Telecom', 'Heavy Machinery'],
      infrastructure: {
        power: '220KV Feeder from TANGEDCO',
        water: 'PWD Supply + Industrial Water Supply',
        roads: 'Multilane Internal Roads',
        connectivity: 'NH-4, Chennai-Bangalore Highway'
      },
      investment: '₹12,000+ Crores',
      employment: '38,000+ Direct Jobs'
    },
    {
      name: 'Hosur',
      code: 'HOSUR',
      district: 'Krishnagiri',
      specialty: 'Multi-Sector Industrial Hub',
      description: 'Hosur Industrial Area is located on the Karnataka-Tamil Nadu border, ideal for industries targeting both states. Known for automobile, textile, and food processing industries.',
      industries: ['Automotive', 'Textiles', 'Food Processing', 'Pharmaceuticals'],
      infrastructure: {
        power: '230KV Substation',
        water: 'Cauvery River + Borewells',
        roads: 'Well-connected Internal Network',
        connectivity: 'NH-44, Bangalore Highway'
      },
      investment: '₹8,500+ Crores',
      employment: '32,000+ Direct Jobs'
    },
    {
      name: 'Cheyyar',
      code: 'CHYYR',
      district: 'Thiruvannamalai',
      specialty: 'Manufacturing & Engineering',
      description: 'Cheyyar SIPCOT Industrial Park is strategically located between Chennai and Bangalore, focusing on engineering, manufacturing, and ancillary industries.',
      industries: ['Engineering', 'Manufacturing', 'Auto Ancillaries'],
      infrastructure: {
        power: '110KV Substation',
        water: 'Palar River + PWD Supply',
        roads: '30m/20m Internal Roads',
        connectivity: 'NH-48, Chennai-Bangalore Corridor'
      },
      investment: '₹3,200+ Crores',
      employment: '15,000+ Direct Jobs'
    },
    {
      name: 'Thoothukudi',
      code: 'THOOT',
      district: 'Thoothukudi',
      specialty: 'Special Economic Zone (SEZ)',
      description: 'Thoothukudi SEZ is strategically located near the port, ideal for export-oriented industries. Focus on marine, chemical, and wind energy equipment manufacturing.',
      industries: ['Marine Products', 'Chemicals', 'Wind Energy', 'Export Units'],
      infrastructure: {
        power: 'TANGEDCO Supply + Wind Farm Integration',
        water: 'Desalination Plant',
        roads: 'Port-connected Roads',
        connectivity: 'V.O. Chidambaranar Port (5km)'
      },
      investment: '₹2,800+ Crores',
      employment: '12,000+ Direct Jobs'
    },
    {
      name: 'Gangaikondan',
      code: 'GNGKN',
      district: 'Tirunelveli',
      specialty: 'Textiles & Manufacturing',
      description: 'Gangaikondan SIPCOT Park serves Southern Tamil Nadu with focus on textiles, manufacturing, and agro-based industries. Well-connected to Tamil Nadu\'s southern districts.',
      industries: ['Textiles', 'Spinning Mills', 'Manufacturing', 'Agro-based'],
      infrastructure: {
        power: '110KV Substation',
        water: 'Tamirabarani River',
        roads: 'Industrial Grade Roads',
        connectivity: 'NH-44, Southern Railway'
      },
      investment: '₹1,500+ Crores',
      employment: '8,000+ Direct Jobs'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // SERVICES - DETAILED SERVICE CATALOG
  // ═══════════════════════════════════════════════════════════════════════════════
  services: [
    {
      name: 'NOC - Fire Safety',
      code: 'NOC_FIRE',
      description: 'No Objection Certificate from Fire Department for new buildings, renovations, or change of building use.',
      requiredDocuments: ['Building Plan', 'Fire Safety Layout', 'Equipment List', 'Owner ID Proof'],
      processingTime: '7 days',
      authority: 'District Fire Officer',
      fees: 'Based on building area'
    },
    {
      name: 'NOC - Pollution Control',
      code: 'NOC_POLLUTION',
      description: 'Consent to Establish/Operate from Tamil Nadu Pollution Control Board (TNPCB).',
      requiredDocuments: ['Site Plan', 'Process Flow Chart', 'Water Balance Statement', 'Hazardous Waste Management Plan'],
      processingTime: '10 days',
      authority: 'TNPCB Regional Office',
      fees: 'Based on pollution category'
    },
    {
      name: 'NOC - Building Plan',
      code: 'NOC_BUILDING',
      description: 'Approval for building construction plans within industrial park limits.',
      requiredDocuments: ['Architectural Drawings', 'Structural Certificate', 'Land Documents', 'Foundation Plan'],
      processingTime: '14 days',
      authority: 'SIPCOT Town Planning',
      fees: '0.5% of construction cost'
    },
    {
      name: 'Land Allotment / Plot',
      code: 'LAND_ALLOT',
      description: 'Allocation of industrial land/plots in SIPCOT parks on 99-year lease basis.',
      requiredDocuments: ['Project Report', 'Capacity Statement', 'Financial Proofs', 'Company Registration', 'PAN Card'],
      processingTime: '30 days',
      authority: 'SIPCOT Managing Director',
      leaseTerms: '99-year lease, with 5% annual escalation'
    },
    {
      name: 'Lease Renewal',
      code: 'LEASE_RENEW',
      description: 'Renewal of existing industrial land lease. Auto-approved for industries with compliance >90%.',
      requiredDocuments: ['Existing Lease Document', 'Compliance Certificate', 'Up-to-date Payment Receipts'],
      processingTime: '5 days',
      authority: 'Regional SIPCOT Manager',
      autoApproval: true
    },
    {
      name: 'Transfer Request',
      code: 'TRANSFER',
      description: 'Transfer of plot ownership/lease from one industry to another.',
      requiredDocuments: ['No-objection from Allottee', 'Buyer Financial Proofs', 'Clearance Certificate', 'Board Resolution'],
      processingTime: '21 days',
      authority: 'SIPCOT Managing Director',
      transferFee: '2% of current land value'
    },
    {
      name: 'Water Connection',
      code: 'WATER_CONN',
      description: 'New water connection or capacity enhancement for industrial use.',
      requiredDocuments: ['Application Form', 'Water Requirement Assessment', 'Existing Connection Details', 'Plumbing Certificate'],
      processingTime: '7 days',
      authority: 'TWAD Board / Local Body',
      tariff: 'Industrial water rates apply'
    },
    {
      name: 'Power Connection',
      code: 'POWER_CONN',
      description: 'High-tension power connection for industrial operations.',
      requiredDocuments: ['Load Requirement', 'Transformer Capacity Details', 'Sanctioned Plan', 'Electrical Contractor License'],
      processingTime: '10 days',
      authority: 'TANGEDCO',
      tariff: 'HT Industrial Tariff - ₹6.50/unit avg'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPLIANCE FRAMEWORK
  // ═══════════════════════════════════════════════════════════════════════════════
  compliance: {
    categories: [
      {
        name: 'Environmental Compliance',
        weight: 30,
        description: 'Adherence to environmental regulations and pollution control norms.',
        checks: [
          'Air pollution monitoring (stack emissions)',
          'Water effluent treatment standards',
          'Hazardous waste disposal documentation',
          'Green belt maintenance (10-15% of plot)',
          'Environmental clearance validity'
        ],
        authorities: ['TNPCB', 'CPCB', 'MoEFCC'],
        consequences: 'Violation can result in plant shutdown and penalties up to ₹5 lakhs'
      },
      {
        name: 'Safety Compliance',
        weight: 25,
        description: 'Workplace safety standards and fire safety measures.',
        checks: [
          'Fire safety NOC validity',
          'Emergency evacuation plan',
          'Safety equipment maintenance',
          'Employee safety training records',
          'Mock drill documentation (twice yearly)'
        ],
        authorities: ['Directorate of Industrial Safety', 'Fire & Rescue Services'],
        consequences: 'Non-compliance attracts closure notice and prosecution'
      },
      {
        name: 'Financial Compliance',
        weight: 20,
        description: 'Timely payment of dues and financial reporting.',
        checks: [
          'Land lease payment (annual)',
          'Water charges payment',
          'Property tax payment',
          'Statutory returns (GST, PF, ESI)',
          'Financial statement submission'
        ],
        authorities: ['SIPCOT Accounts', 'Commercial Taxes', 'Labour Department'],
        consequences: 'Interest @18% p.a. on delayed payments'
      },
      {
        name: 'Operational Compliance',
        weight: 25,
        description: 'Operational reporting and documentation maintenance.',
        checks: [
          'Quarterly production reporting',
          'Employment details submission',
          'Power consumption reporting',
          'Water consumption reporting',
          'Annual capacity utilization report'
        ],
        authorities: ['SIPCOT Regional Office', 'DIC'],
        consequences: 'Warning notice followed by lease cancellation for persistent default'
      }
    ],
    scoring: {
      excellent: '90-100: Compliant (Green) - Eligible for auto-approvals and incentives',
      good: '70-89: Warning (Yellow) - Monitoring required, some restrictions apply',
      poor: 'Below 70: Non-Compliant (Red) - Inspection mandatory, action initiated'
    },
    violations: [
      { severity: 'Critical', description: 'Operating without valid environmental clearance', action: 'Immediate Shutdown Notice' },
      { severity: 'Critical', description: 'Water/air pollution beyond permissible limits', action: 'Stop Work Notice + Penalty' },
      { severity: 'High', description: 'Missed submission deadline >30 days', action: 'Show Cause Notice' },
      { severity: 'High', description: 'Fire safety NOC expired', action: 'Warning + Inspection' },
      { severity: 'Medium', description: 'Lease payment delay >15 days', action: 'Interest Charge + Reminder' },
      { severity: 'Medium', description: 'Green belt area below 10%', action: 'Compliance Direction' },
      { severity: 'Low', description: 'Reporting delay <7 days', action: 'Automated Reminder' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // GOVERNMENT SCHEMES & INCENTIVES
  // ═══════════════════════════════════════════════════════════════════════════════
  schemes: [
    {
      name: 'Tamil Nadu Industrial Policy 2021',
      description: 'Flagship policy attracting investments with comprehensive incentives.',
      incentives: [
        'Capital Subsidy: Up to 20% of investment (max ₹50 crores)',
        'Payroll Incentive: 30% of EPF/ESI contribution for 5 years',
        'Electricity Tax Exemption: 100% for 5 years',
        'Stamp Duty Concession: 100% on land registration',
        'Quality Certification Grant: ₹50 lakhs for ISO/other certifications'
      ],
      eligibility: 'New investments in manufacturing, minimum investment ₹50 crores',
      applyThrough: 'SIPCOT → TN Guidance Bureau'
    },
    {
      name: 'PLI Scheme (Production Linked Incentive)',
      description: 'Central government scheme for specific sectors including electronics, pharma, and auto components.',
      incentives: [
        'Incentive of 4-6% on incremental sales',
        'Duration: 5 years',
        'Minimum investment threshold varies by sector'
      ],
      eligibleSectors: ['Automobiles', 'Auto Components', 'Pharmaceuticals', 'Telecom', 'Textiles'],
      applyThrough: 'PIYush Portal → Ministry of Commerce'
    },
    {
      name: 'Startup Tamil Nadu',
      description: 'Support for startups and MSMEs in the state.',
      incentives: [
        'Seed funding up to ₹20 lakhs',
        'Rental subsidy for incubation space',
        'Patent filing reimbursement',
        'Mentorship and networking support'
      ],
      eligibility: 'Incorporated within 10 years, turnover <₹100 crores',
      applyThrough: 'StartupTN Portal → SIPCOT for space allotment'
    },
    {
      name: 'Electricty Tariff Subsidy',
      description: 'Concessional power tariff for eligible industries.',
      incentives: [
        '30% subsidy on HT industrial tariff',
        'Applicable for first 5 years of operation',
        'For industries in backward blocks'
      ],
      eligibility: 'New expansions, minimum employment creation'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // INDUSTRY TYPES & SECTORS
  // ═══════════════════════════════════════════════════════════════════════════════
  industrySectors: [
    { name: 'Automotive', examples: 'Car manufacturers, Auto parts, Tyres', parks: ['Oragadam', 'Hosur', 'Chengalpattu'] },
    { name: 'Electronics', examples: 'Consumer electronics, Components, Telecom', parks: ['Sriperumbudur', 'Oragadam'] },
    { name: 'Textiles', examples: 'Spinning mills, Garments, Dyeing', parks: ['Gangaikondan', 'Tiruppur', 'Erode'] },
    { name: 'Pharmaceuticals', examples: 'Drug manufacturing, Bulk drugs', parks: ['Hosur', 'Chengalpattu'] },
    { name: 'Food Processing', examples: 'Processed foods, Beverages, Dairy', parks: ['Hosur', 'Cheyyar'] },
    { name: 'Engineering', examples: 'Machine tools, Castings, Forgings', parks: ['Cheyyar', 'Puducherry'] },
    { name: 'Chemicals', examples: 'Petrochemicals, Fertilizers, Paints', parks: ['Thoothukudi SEZ', 'Manali'] },
    { name: 'Leather', examples: 'Tanneries, Footwear, Goods', parks: ['Ambattur', 'Vaniyambadi'] },
    { name: 'Renewable Energy', examples: 'Solar manufacturing, Wind equipment', parks: ['Thoothukudi', 'Hosur'] }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTACT & SUPPORT INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════════
  contacts: {
    sipcotHeadquarters: {
      address: 'SIPCOT Ltd., "SIPCOT Industrial Complex",',
      location: '150, Periyar Path, Kancheepuram - 631 502',
      phone: '044-27253123',
      email: 'cmd@sipcot.com',
      website: 'www.sipcot.tn.gov.in'
    },
    regionalOffices: [
      { region: 'Chennai', phone: '044-25304567' },
      { region: 'Coimbatore', phone: '0422-2341234' },
      { region: 'Madurai', phone: '0452-2534567' },
      { region: 'Tirunelveli', phone: '0462-2567890' }
    ],
    supportChannels: [
      { channel: 'Helpline', number: '1800-425-2211', timing: 'Mon-Fri, 9 AM - 6 PM' },
      { channel: 'Email Support', id: 'support@thozhirporul.tn.gov.in', timing: '24-48 hour response' },
      { channel: 'Grievance Portal', url: '/grievance', timing: 'Track online' },
      { channel: 'AI Chatbot', name: 'VazhiPorul AI', timing: '24/7 Available' }
    ],
    importantAuthorities: [
      { name: 'TNPCB', purpose: 'Pollution Control NOC', phone: '044-22540003' },
      { name: 'TANGEDCO', purpose: 'Power Connection', phone: '1912' },
      { name: 'TWAD Board', purpose: 'Water Connection', phone: '044-25301021' },
      { name: 'Fire Department', purpose: 'Fire Safety NOC', phone: '101' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATED DOMAIN KNOWLEDGE
  // ═══════════════════════════════════════════════════════════════════════════════
  domainKnowledge: [
    { category: 'Land & Allotment', keywords: ['land','allotment','acre','plot','lease','cost','rate','price','buy','rent'], desc: 'SIPCOT provides industrial land on 99-year lease. Rates: Oragadam ₹1.5-2.5 Cr/acre, Sriperumbudur ₹2-3 Cr/acre, Hosur ₹80-120 Lakhs/acre, Cheyyar ₹60-80 Lakhs/acre. Application process: Submit project report → Site verification → Allotment order → Agreement execution → Possession.' },
    { category: 'Infrastructure', keywords: ['road','water','power','electricity','drain','infrastructure','facility','amenity'], desc: 'SIPCOT parks feature: 60ft/40ft internal roads, 110KV/230KV substations, dedicated water supply (TWAD/Chennai Metro), STP/CETP for effluent treatment, underground drainage, telecom connectivity, and green belt development.' },
    { category: 'Environmental Support', keywords: ['stp','etp','waste','environment','pollution','green belt','effluent'], desc: 'Large parks have Common Effluent Treatment Plants (CETP) and Sewage Treatment Plants (STP). Industries must maintain 10-15% green belt, obtain TNPCB consent, manage hazardous waste authorized dealers, and submit half-yearly environmental compliance reports.' },
    { category: 'Incentives & Policies', keywords: ['subsidy','incentive','policy','investment','grant','support','scheme'], desc: 'TN Industrial Policy 2021: 20% capital subsidy (max ₹50 Cr), 30% PF reimbursement for 5 years, 100% electricity tax exemption, 100% stamp duty concession. Additional schemes: PLI (4-6% on sales), StartupTN seed funding, and MSME support.' },
    { category: 'Utilities Monitoring', keywords: ['meter','flow','consumption','tariff','bill','reading','usage'], desc: 'THOZHIRPORUL tracks real-time electricity (TANGEDCO HT tariff: ₹6.50/unit avg) and water consumption. Anomaly alerts for usage spikes >200%, cost run rate calculations, and tariff verification against government rates.' },
    { category: 'Compliance & Violations', keywords: ['compliance','violation','penalty','fine','notice','default','rule'], desc: 'Compliance Score: Environmental (30%), Safety (25%), Financial (20%), Operational (25%). Score >90: Compliant (green, auto-approvals). 70-89: Warning (yellow, monitoring). <70: Non-Compliant (red, inspection). Critical violations trigger shutdown notices.' },
    { category: 'Service Requests', keywords: ['noc','certificate','approval','permit','request','application'], desc: 'Services: Fire NOC (7 days), Pollution NOC (10 days), Building NOC (14 days), Land Allotment (30 days), Lease Renewal (5 days, auto-approve if compliance >90%), Water Connection (7 days), Power Connection (10 days). Track status in Services Tracker.' },
    { category: 'Investment & Employment', keywords: ['investment','employment','jobs','capex','revenue','create jobs'], desc: 'Total SIPCOT: ₹24,500 Cr investment, 89,000 direct jobs, 56,000 indirect jobs. Oragadam leads with ₹15,000 Cr, Sriperumbudur ₹12,000 Cr. Employment: 1 job per ₹15-20 lakhs investment in manufacturing.' },
    { category: 'Registration Process', keywords: ['register','registration','sign up','new account','create account','join'], desc: 'Industry Registration: Company name, Industry type, Location/Park preference, Contact person details, Phone, Email, Password. Documents required: Company incorporation certificate, PAN, Address proof. Account activated after verification.' },
    { category: 'Data Submission', keywords: ['submit','data','quarterly','annual','report','filing'], desc: 'Quarterly submission: Financial (revenue, investment), Employment (direct/indirect), Resources (power/water consumption, waste generation), CSR activities. Due dates: Q1 (Oct 15), Q2 (Jan 15), Q3 (Apr 15), Q4 (July 15). Late submission: -10 points to compliance score.' },
    { category: 'AI Agents', keywords: ['agent', 'ai agent', 'react agent', 'llm agent', 'agent workflow', 'agent steps', 'agent principles'], desc: 'AI Agent design guidelines. Guardrails: clear boundaries, error handling, safety checks, human-in-the-loop. Steps: Understand requirements → Design architecture → Define tools → Implement core → Add safety guardrails → Test behavior.' },
    { category: 'Prompt Engineering', keywords: ['prompt', 'prompt engineering', 'few-shot', 'system prompt', 'prompt structure', 'optimize prompt'], desc: 'Prompt optimization framework. Core structure: Role, Context, Instructions, Examples, Output Format. Steps: Task analysis → Delimited sections → Precise constraints → A/B testing → Token minimization.' },
    { category: 'RAG Pipeline', keywords: ['rag', 'retrieval-augmented', 'vector store', 'embeddings', 'chunk size', 'text splitter'], desc: 'Retrieval-Augmented Generation pipeline. Key components: Loader, Splitter, Embeddings, Vector Store, Retriever, Generator. Optimization: Chunk tuning, Retrieval k-tuning, Reranking, Hybrid search.' },
    { category: 'Workflow Creator', keywords: ['workflow creator', 'create workflow', 'stack-agnostic', 'workflow template'], desc: 'Philosophy for repository workflows. Rules: stack-agnostic (detect & adapt, don\'t hardcode), question-driven, single responsibility. Template: Guardrails, Context, Project Analysis, Implementation, Verification.' }
  ],

  // ═══════════════════════════════════════════════════════════════════════════════
  // FAQ & QUICK ANSWERS
  // ═══════════════════════════════════════════════════════════════════════════════
  faqs: [
    { q: 'How to apply for industrial plot?', a: '1. Register as Industry user → 2. Go to Parks Explorer → 3. Click "Apply for Plot" → 4. Fill required area, park, industry type → 5. Submit → 6. Track in Services Tracker' },
    { q: 'What documents required for land allotment?', a: 'Project Report, Capacity Statement, Financial Capacity Proof, Company Registration Certificate, PAN Card, Address Proof, Board Resolution' },
    { q: 'How much does SIPCOT land cost?', a: 'Varies by park: Oragadam ₹1.5-2.5 Cr/acre, Sriperumbudur ₹2-3 Cr/acre, Hosur ₹80-120 Lakhs/acre, Cheyyar ₹60-80 Lakhs/acre' },
    { q: 'What is compliance score?', a: 'Score 0-100 based on Environmental (30%), Safety (25%), Financial (20%), Operational (25%). >90: Compliant, 70-89: Warning, <70: Non-Compliant' },
    { q: 'How long for NOC approvals?', a: 'Fire NOC: 7 days, Pollution NOC: 10 days, Building NOC: 14 days. Delays possible if documents incomplete or site inspection needed' },
    { q: 'What incentives are available?', a: 'TN Industrial Policy: 20% capital subsidy, 30% PF reimbursement, 100% electricity tax exemption, 100% stamp duty concession. PLI scheme: 4-6% on sales' },
    { q: 'How to check compliance status?', a: 'Login → Workspace (for Industry) or Compliance Engine (for Admin/Govt) → View score, category breakdown, violations, and submission history' },
    { q: 'What to do for missed submission deadline?', a: 'Submit immediately with late reason. Penalty: -10 points to compliance score. Critical: >30 days delay triggers Show Cause Notice' },
    { q: 'How to contact SIPCOT?', a: 'HQ: 044-27253123, Email: cmd@sipcot.com. Helpline: 1800-425-2211. Or use Contact page form / Grievance portal' },
    { q: 'Can I transfer my plot?', a: 'Yes, submit Transfer Request. Documents: NOC from buyer, buyer financial proof, clearance certificate. Processing: 21 days. Transfer fee: 2% of current land value' },
    { q: 'How to build an AI agent?', a: 'Define clear boundaries and error handling. Understand requirements, design the agent (ReAct, memory), specify tool schemas, build core LLM integration, add input validation/rate limits, and test edge cases.' },
    { q: 'What is the structure of a good prompt?', a: 'A premium prompt template includes: 1. Role (define who the AI is), 2. Context (background info), 3. Instructions (clear task description), 4. Examples (few-shot learning), 5. Output Format (specified structure).' },
    { q: 'How does a RAG pipeline work?', a: 'Documents are loaded and split into text chunks, converted into vector embeddings, and stored in a vector store. When queried, a retriever finds relevant chunks, and a generator (LLM) constructs a response from them.' },
    { q: 'How to create a new workflow?', a: 'Define the name and category, follow the standard template (context, project analysis, core steps, verification), ensure stack-agnosticism, create the file under workflows/<category>/<name>.md, and update workflows/registry.json.' }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTELLIGENT RESPONSE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
function findBestResponse(input, isLoggedIn, currentPath, userName) {
  const q = input.toLowerCase().trim();
  const nav = (path) => ({ path });

  const greetingName = userName ? ` **${userName}**` : '';

  // ═══════════════════════════════════════════════════════════════════════════════
  // AI TOOLS & WORKFLOWS QUERIES (Antigravity AI Workflows)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (/\bagent\b|ai agent|react agent|llm agent/.test(q)) {
    return {
      text: `🤖 **AI Agent Workflow**\n` +
            `Learn how to create AI agents with tools and capabilities.\n\n` +
            `🛡️ **Guardrails:**\n` +
            `• Define clear boundaries for agent actions.\n` +
            `• Implement proper error handling & fail gracefully.\n` +
            `• Log agent decisions for debugging.\n` +
            `• Add safety checks & require human-in-the-loop for destructive operations.\n\n` +
            `📋 **Implementation Steps:**\n` +
            `1. **Understand Requirements:** Ask what the agent should do, which tools/LLM it needs, and any safety constraints.\n` +
            `2. **Design Agent:** Plan the architecture (e.g., ReAct, Chain-of-Thought), memory, context, and output format.\n` +
            `3. **Define Tools:** Specify names, descriptions, input parameters, and error handling for each capability.\n` +
            `4. **Implement Agent:** Integrate the LLM, tool execution, response parsing, and context management.\n` +
            `5. **Add Safety:** Implement validation, rate limiting, and recovery patterns.\n` +
            `6. **Test:** Verify happy path scenarios, edge cases, and safety limits.\n\n` +
            `💡 **Core Principles:**\n` +
            `Start simple and add complexity. Log everything. Always prioritize safety first.`,
      suggestions: ['Prompt Engineering', 'RAG Pipeline', 'Workflow Creator']
    };
  }

  if (/\bprompt\b|prompt engineering|few-shot|system prompt/.test(q)) {
    return {
      text: `✍️ **Prompt Engineering Workflow**\n` +
            `Optimize prompts for LLM applications.\n\n` +
            `🛡️ **Guardrails:**\n` +
            `• Test prompts with various inputs.\n` +
            `• Keep prompts maintainable and version controlled.\n` +
            `• Anticipate edge cases, misuse, or jailbreaks.\n\n` +
            `🏗️ **Prompt Structure Elements:**\n` +
            `• **Role:** Define who the AI is.\n` +
            `• **Context:** Provide background information.\n` +
            `• **Instructions:** Clear and specific task description.\n` +
            `• **Examples:** Use few-shot learning for format/style constraints.\n` +
            `• **Output Format:** Specify structured output format (e.g., JSON).\n\n` +
            `📋 **Optimization Steps:**\n` +
            `1. **Understand Task:** Clarify LLM role, inputs, constraints, and target outputs.\n` +
            `2. **Design Structure:** Group sections using clear delimiters.\n` +
            `3. **Write Prompt:** Be specific and clear (Clarity > Cleverness).\n` +
            `4. **Test & Iterate:** Test with real-world inputs and A/B test variations.\n` +
            `5. **Optimize:** Reduce token usage and handle errors gracefully.`,
      suggestions: ['AI Agent', 'RAG Pipeline', 'Workflow Creator']
    };
  }

  if (/\brag\b|retrieval-augmented|vector store|embeddings/.test(q)) {
    return {
      text: `🔍 **RAG Pipeline Workflow**\n` +
            `Build robust Retrieval-Augmented Generation pipelines.\n\n` +
            `🛡️ **Guardrails:**\n` +
            `• Start simple and optimize parameters later.\n` +
            `• Always measure retrieval quality & handle empty results gracefully.\n` +
            `• Monitor cost and latency.\n\n` +
            `🏗️ **Key Components:**\n` +
            `• **Document Loader:** Ingest data sources.\n` +
            `• **Text Splitter:** Chunk documents appropriately.\n` +
            `• **Embeddings:** Generate vector representations.\n` +
            `• **Vector Store:** Store and query vectors (e.g., Pinecone, Chroma).\n` +
            `• **Retriever:** Retrieve the most relevant chunks.\n` +
            `• **Generator:** Use LLM to generate responses using retrieved context.\n\n` +
            `📋 **Optimization Steps:**\n` +
            `1. **Understand Requirements:** Identify data sources, query types, and latency needs.\n` +
            `2. **Design & Setup:** Select embedding model, vector store, and chunk size/overlap.\n` +
            `3. **Build Flow:** Connect components into a retrieval and generation chain.\n` +
            `4. **Optimize:** Tune chunk size, adjust retrieval \`k\`, add reranking or hybrid search.\n` +
            `5. **Verify:** Check retrieval relevance and response quality.`,
      suggestions: ['AI Agent', 'Prompt Engineering', 'Workflow Creator']
    };
  }

  if (/workflow creator|create workflow|stack-agnostic/.test(q)) {
    return {
      text: `🛠️ **Workflow Creator**\n` +
            `Create new stack-agnostic workflows for the repository.\n\n` +
            `🛡️ **Guardrails:**\n` +
            `• Every workflow MUST be stack-agnostic (never hardcode React, Tailwind, etc.).\n` +
            `• Always include stack detection and clarifying questions.\n` +
            `• Keep workflows focused on a single responsibility.\n\n` +
            `🏗️ **Template Structure:**\n` +
            `• \`description\` frontmatter.\n` +
            `• **Guardrails:** What to avoid, scope boundaries.\n` +
            `• **Steps:**\n` +
            `  1. *Understand Context:* Ask clarifying questions.\n` +
            `  2. *Analyze Project:* Detect existing stack/config files.\n` +
            `  3. *Core Implementation:* Describe WHAT to do (not exact code).\n` +
            `  4. *Verify:* How to confirm success.\n` +
            `• **Principles & References.**\n\n` +
            `❌ **Mistakes to Avoid:**\n` +
            `• *Hardcoding frameworks:* e.g., don't write \`npm install react\`.\n` +
            `• *Boilerplate code:* Describe what component to create, not exact code.`,
      suggestions: ['AI Agent', 'Prompt Engineering', 'RAG Pipeline']
    };
  }

  if (/\bai workflow|ai tool|ai skill|workflows\b/.test(q)) {
    return {
      text: `🤖 **Antigravity AI Workflows & Skills**\n` +
            `I possess specialized knowledge on building and utilizing advanced AI tools. Which one would you like to explore?\n\n` +
            `• **AI Agent:** Guide on creating autonomous agents with tools, capabilities, and safety guardrails.\n` +
            `• **Prompt Engineering:** Best practices for structuring and optimizing prompts.\n` +
            `• **RAG Pipeline:** Guide on building Retrieval-Augmented Generation pipelines.\n` +
            `• **Workflow Creator:** Standard template and philosophy for creating new repository workflows.`,
      suggestions: ['AI Agent', 'Prompt Engineering', 'RAG Pipeline', 'Workflow Creator']
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // INDUSTRIAL PARKS QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════
  if (/park|industrial park|which park|parks in|park list|park information|oragadam|hosur|sriperumbudur|cheyyar|thoothukudi|gangaikondan/.test(q)) {
    for (const park of SITE_KNOWLEDGE.industrialParks) {
      if (q.includes(park.name.toLowerCase()) || q.includes(park.code.toLowerCase())) {
        return {
          text: `🏭 **${park.name} Industrial Park (${park.code})**\n\n` +
                `📍 *${park.district} District*\n` +
                `🏷️ **Specialty:** ${park.specialty}\n\n` +
                `📖 **About:** ${park.description}\n\n` +
                `🏗️ **Industries:** ${park.industries.join(', ')}\n` +
                `💰 **Investment:** ${park.investment}\n` +
                `👷 **Employment:** ${park.employment}\n\n` +
                `⚡ **Power:** ${park.infrastructure.power}\n` +
                `💧 **Water:** ${park.infrastructure.water}\n` +
                `🛣️ **Connectivity:** ${park.infrastructure.connectivity}`,
          suggestions: ['Show all parks', 'Apply for plot here', 'How to reach?']
        };
      }
    }
    // All parks list
    const parkList = SITE_KNOWLEDGE.industrialParks.map(p => `• **${p.name}** (${p.code}) - ${p.specialty}`).join('\n');
    return {
      text: `🏭 **SIPCOT Industrial Parks in Tamil Nadu**\n\n${parkList}\n\n📊 **Total:** ${SITE_KNOWLEDGE.industrialParks.length} Major Parks\n💰 **Combined Investment:** ₹43,000+ Crores\n👷 **Total Employment:** 1,50,000+ Jobs`,
      suggestions: ['Tell me about Oragadam', 'Sriperumbudur details', 'Apply for plot']
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SERVICES & NOC QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════
  if (/noc|service|certificate|approval|what service|how to.*approval|how to.*noc/.test(q)) {
    for (const service of SITE_KNOWLEDGE.services) {
      if (q.includes(service.name.toLowerCase()) || q.includes(service.code.toLowerCase()) || (q.includes('noc') && service.name.includes('NOC'))) {
        return {
          text: `📋 **${service.name}** (${service.code})\n\n` +
                `📝 **Description:** ${service.description}\n\n` +
                `📄 **Required Documents:**\n${service.requiredDocuments.map(d => `• ${d}`).join('\n')}\n\n` +
                `⏱️ **Processing Time:** ${service.processingTime}\n` +
                `🏢 **Authority:** ${service.authority}\n` +
                `${service.fees ? `💰 **Fees:** ${service.fees}\n` : ''}` +
                `${service.autoApproval ? `✨ **Note:** Auto-approved for industries with compliance score >90%` : ''}`,
          suggestions: ['Apply now', 'Track service status', 'What is compliance score?']
        };
      }
    }
    const serviceList = SITE_KNOWLEDGE.services.map(s => `• **${s.name}** - ${s.processingTime}`).join('\n');
    return {
      text: `📋 **SIPCOT Services Available**\n\n${serviceList}\n\n✨ **Auto-Approval:** Lease renewals auto-approved for compliant industries (score >90)\n\n💡 *Tip: Login and go to Services Tracker to apply or track requests*`,
      suggestions: ['Fire NOC details', 'How to apply for plot?', 'Service status']
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPLIANCE QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════
  if (/compliance|score|violation|penalty|fine|environment|safety|pollution/.test(q)) {
    const categories = SITE_KNOWLEDGE.compliance.categories.map(c =>
      `**${c.name}** (${c.weight}%)\n${c.checks.slice(0, 2).map(ch => `• ${ch}`).join('\n')}`
    ).join('\n\n');

    return {
      text: `📊 **SIPCOT Compliance Framework**\n\n` +
            `Compliance Score (0-100) determines industry status:\n` +
            `🟢 **90-100:** Compliant - Auto-approvals, incentives eligible\n` +
            `🟡 **70-89:** Warning - Monitoring required\n` +
            `🔴 **Below 70:** Non-Compliant - Inspection, action initiated\n\n` +
            `**Categories:**\n${categories}\n\n` +
            `**Consequences:**\n${SITE_KNOWLEDGE.compliance.violations.slice(0, 3).map(v => `• ${v.severity}: ${v.description} → ${v.action}`).join('\n')}`,
      suggestions: ['Check my compliance', 'How to improve score?', 'Violation details']
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHEMES & INCENTIVES QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════
  if (/scheme|incentive|subsidy|policy|support|grant|funding|pli/.test(q)) {
    const scheme = SITE_KNOWLEDGE.schemes.find(s =>
      q.includes(s.name.toLowerCase().split(' ')[0]) || q.includes(s.description.toLowerCase().split(' ')[0])
    );

    if (scheme) {
      return {
        text: `🎁 **${scheme.name}**\n\n` +
              `📝 **Description:** ${scheme.description}\n\n` +
              `💰 **Incentives:**\n${scheme.incentives.map(i => `• ${i}`).join('\n')}\n\n` +
              `✅ **Eligibility:** ${scheme.eligibility}\n` +
              `📮 **Apply Through:** ${scheme.applyThrough}`,
        suggestions: ['How to apply?', 'Other schemes', 'Am I eligible?']
      };
    }

    const schemeList = SITE_KNOWLEDGE.schemes.map(s => `• **${s.name}**`).join('\n');
    return {
      text: `🎁 **Government Schemes & Incentives**\n\n${schemeList}\n\n📞 *Contact SIPCOT or DIC for detailed application assistance*`,
      suggestions: ['TN Industrial Policy details', 'PLI Scheme', 'Startup support']
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTOR/INDUSTRY TYPE QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════
  if (/sector|industry type|automotive|textile|electronic|pharma|chemical|manufacturing/.test(q)) {
    const sector = SITE_KNOWLEDGE.industrySectors.find(s => q.includes(s.name.toLowerCase()));

    if (sector) {
      return {
        text: `🏭 **${sector.name} Sector**\n\n` +
              `📦 **Examples:** ${sector.examples}\n` +
              `📍 **Best Parks:** ${sector.parks.join(', ')}`,
        suggestions: ['Other sectors', 'Park details', 'Apply for plot']
      };
    }

    const sectorList = SITE_KNOWLEDGE.industrySectors.map(s => `• **${s.name}** - ${s.examples}`).join('\n');
    return {
      text: `🏭 **Industry Sectors in SIPCOT Parks**\n\n${sectorList}`,
      suggestions: ['Automotive details', 'Textile parks', 'Electronics hubs']
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTACT & SUPPORT QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════
  if (/contact|phone|email|support|helpdesk|address|office|call|reach/.test(q)) {
    const contacts = SITE_KNOWLEDGE.contacts;
    return {
      text: `📞 **Contact & Support Information**\n\n` +
            `**SIPCOT Headquarters:**\n📍 ${contacts.sipcotHeadquarters.address}\n📞 ${contacts.sipcotHeadquarters.phone}\n📧 ${contacts.sipcotHeadquarters.email}\n🌐 ${contacts.sipcotHeadquarters.website}\n\n` +
            `**Support Channels:**\n${contacts.supportChannels.map(c => `• **${c.channel}:** ${c.name || c.number || c.id} (${c.timing})`).join('\n')}\n\n` +
            `**Important Authorities:**\n${contacts.importantAuthorities.map(a => `• **${a.name}:** ${a.purpose} - ${a.phone}`).join('\n')}`,
      suggestions: ['File grievance', 'Regional offices', 'Working hours']
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COST/RATE/PRICE QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════
  if (/cost|rate|price|how much|charges|fee|expensive|cheap|tariff/.test(q)) {
    return {
      text: `💰 **SIPCOT Land Rates (Approximate per acre)**\n\n` +
            `• **Oragadam:** ₹1.5 - 2.5 Crores\n` +
            `• **Sriperumbudur:** ₹2 - 3 Crores\n` +
            `• **Hosur:** ₹80 - 120 Lakhs\n` +
            `• **Cheyyar:** ₹60 - 80 Lakhs\n` +
            `• **Thoothukudi SEZ:** ₹70 - 90 Lakhs\n` +
            `• **Gangaikondan:** ₹40 - 60 Lakhs\n\n` +
            `**Lease Terms:** 99-year lease with 5% annual escalation\n\n` +
            `**Utility Tariffs:**\n` +
            `• HT Power: ~₹6.50/unit\n` +
            `• Industrial Water: ~₹25-35/KL\n\n` +
            `💡 *Rates are indicative. Contact SIPCOT for current rates*`,
      suggestions: ['Apply for plot', 'Payment schedule', 'Subsidy available?']
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // FAQ MATCHING
  // ═══════════════════════════════════════════════════════════════════════════════
  for (const faq of SITE_KNOWLEDGE.faqs) {
    if (q.includes(faq.q.toLowerCase().replace(/how to|what|how much/g, '').trim()) || faq.q.toLowerCase().includes(q)) {
      return {
        text: `❓ **${faq.q}**\n\n✅ ${faq.a}`,
        suggestions: ['More FAQs', 'Related services', 'Contact support']
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORIGINAL RESPONSE LOGIC (preserved below)
  // ═══════════════════════════════════════════════════════════════════════════════

  // Current Page Context
  if (/(tell me about (this )?page|where am i|what is this page|explain this page)/.test(q)) {
    const page = SITE_KNOWLEDGE.pages.find(p => p.path === currentPath);
    if (page) {
       if (!page.public && !isLoggedIn) {
          return { text: `You are on the **${page.name}** page. This is a restricted internal page. I cannot provide inside details while you are logged out.\n\nHowever, here is what the roles can do generally:\n• **Admin**: Full system access, dashboards, compliance engine.\n• **Industry**: Submit data, track compliance, request services.\n• **Govt Officer**: Monitor park KPIs and violations.`, suggestions: ['How to login?', 'What is this platform?'] };
       }
       const roleInfo = page.public ? '🌐 *Public page — no login required*' : `🔒 *Requires: ${page.roles.join(', ')} role*`;
       return { text: `You are currently on the **${page.name}** page.\n\n${page.desc}\n\n${roleInfo}`, suggestions: ['Show all pages', 'How to use this platform?'] };
    }
    return { text: `I'm not exactly sure which page you're on right now (URL: \`${currentPath}\`), but I can tell you about the platform in general!`, suggestions: ['What is this platform?', 'Show all pages'] };
  }

  // Greetings
  if (/^(hi|hello|hey|greetings|good\s?(morning|evening|afternoon))/.test(q)) {
    return {
      text: `Hello${greetingName}! 👋 I'm **VazhiPorul AI**, your intelligent assistant for the THOZHIRPORUL platform.\n\n` +
            `I can help you with:\n` +
            `• 🏭 **Industrial Parks** - Information about all SIPCOT parks\n` +
            `• 📋 **Services** - NOCs, approvals, land allotment\n` +
            `• 📊 **Compliance** - Scores, violations, submissions\n` +
            `• 🎁 **Incentives** - Government schemes and subsidies\n` +
            `• 📞 **Support** - Contact information and grievances\n\n` +
            `**Quick Start:** Try asking about "Oragadam park", "Fire NOC", or "How to apply for plot?"`,
      suggestions: ['Show industrial parks', 'How to apply for plot?', 'Available services']
    };
  }

  // Name query
  if (/what is (your name|the ai name|this ai)|who are you/.test(q)) {
    return { text: `I am **VazhiPorul AI**, your intelligent assistant for the THOZHIRPORUL platform.`, suggestions: ['What can you do?', 'What is this platform?'] };
  }

  // What is this platform
  if (/what (is|are).*(platform|thozhirporul|sims|site|website|system)/.test(q) || /tell me about/.test(q)) {
    const p = SITE_KNOWLEDGE.platform;
    const achievements = p.achievements.map(a => `• ${a}`).join('\n');
    return {
      text: `**${p.name}** (${p.tamilName}) — ${p.fullName}\n\n` +
            `${p.desc}\n\n` +
            `📊 **Key Achievements:**\n${achievements}\n\n` +
            `🏢 **Managing:** 1,250+ Industries across 6 Major Parks\n` +
            `📅 **Established:** ${p.govtBody}, ${p.established}\n` +
            `🚀 **Built by:** ${p.by}`,
      suggestions: ['Show industrial parks', 'Services available', 'How to register?']
    };
  }

  // Roles
  if (/role|who can use|user types|access level/.test(q)) {
    const roleText = SITE_KNOWLEDGE.roles.map(r => `• **${r.name}**: ${r.desc}`).join('\n');
    return { text: `THOZHIRPORUL has 3 user roles:\n\n${roleText}`, suggestions: ['How to register?', 'Login as Admin', 'Login as Industry'] };
  }

  // Dynamic page access / login instructions
  if (/(how.*access|access.*how|how.*login.*to|how.*go.*to)/.test(q)) {
    for (const page of SITE_KNOWLEDGE.pages) {
      for (const kw of page.keywords) {
        if (q.includes(kw) || (page.name.toLowerCase().includes(q.replace(/(how.*access|access.*how|how.*login.*to|how.*go.*to)/g, '').trim()))) {
          if (page.public) {
            return { text: `**Accessing ${page.name}**\n\nThis is a public page. You do not need to log in. Just click the button below to go there immediately.`, suggestions: ['Take me there'], ...nav(page.path) };
          }
          
          if (!isLoggedIn) {
             return { text: `**${page.name}** is a restricted internal page. As you are not logged in, I cannot provide inside details about how this page looks or works.\n\nHowever, here is what the roles can do generally:\n• **Admin**: Full system access, dashboards, compliance engine.\n• **Industry**: Submit data, track compliance, request services.\n• **Govt Officer**: Monitor park KPIs and violations.`, suggestions: ['How to login?', 'What is this platform?'] };
          }

          let loginSteps = '';
          if (page.roles.includes('admin')) {
             loginSteps += `**Admin Access:**\n1. Go to Portal Selection → Admin Portal\n2. Login with Admin credentials\n3. Navigate to ${page.name}\n\n`;
          }
          if (page.roles.includes('industry')) {
             loginSteps += `**Industry Access:**\n1. Go to Portal Selection → Industry Portal\n2. Login with Industry credentials\n3. Navigate to ${page.name}\n\n`;
          }
          if (page.roles.includes('govt')) {
             loginSteps += `**Government Access:**\n1. Go to Portal Selection → Government Portal\n2. Login with Government credentials\n3. Navigate to ${page.name}\n\n`;
          }

          return { text: `**How to access ${page.name}:**\n\nThis page is restricted. Here is the workflow to access it:\n\n${loginSteps.trim()}`, suggestions: ['Take me there'], ...nav(page.path) };
        }
      }
    }
  }

  // Workflow queries
  for (const wf of SITE_KNOWLEDGE.workflows) {
    const wfName = wf.name.toLowerCase();
    if (q.includes(wfName) || (wfName === 'plot allotment' && /(plot|allot|land|apply.*plot|buy.*plot|how.*apply)/.test(q))) {
      return { text: `**${wf.name} Workflow:**\n\n${wf.steps.join('\n')}`, suggestions: ['Take me there', 'What other workflows exist?'], ...nav(wf.path) };
    }
  }

  // Page navigation — match by keywords
  for (const page of SITE_KNOWLEDGE.pages) {
    for (const kw of page.keywords) {
      if (q.includes(kw) || (kw.length > 3 && q.split(/\s+/).some(w => w.includes(kw)))) {
        if (!page.public && !isLoggedIn) {
           return { text: `**${page.name}** is a restricted internal page. I cannot provide inside details while you are logged out.\n\nHowever, here is what the roles can do generally:\n• **Admin**: Full system access, dashboards, compliance engine.\n• **Industry**: Submit data, track compliance, request services.\n• **Govt Officer**: Monitor park KPIs and violations.`, suggestions: ['How to login?', 'What is this platform?'] };
        }
        const roleInfo = page.public ? '🌐 *Public page — no login required*' : `🔒 *Requires: ${page.roles.join(', ')} role*`;
        return { text: `**${page.name}**\n\n${page.desc}\n\n${roleInfo}`, suggestions: ['Take me there', 'Tell me more'], ...nav(page.path) };
      }
    }
  }

  // Navigation commands
  if (/^(go to|take me|navigate|open|show|visit)\s/.test(q)) {
    const target = q.replace(/^(go to|take me to|navigate to|open|show me|visit)\s*/i, '').trim();
    for (const page of SITE_KNOWLEDGE.pages) {
      if (page.name.toLowerCase().includes(target) || page.keywords.some(k => target.includes(k))) {
        return { text: `Taking you to **${page.name}**... 🚀`, ...nav(page.path), autoNavigate: true };
      }
    }
    return { text: `I couldn't find a page matching "${target}". Here are some options:`, suggestions: ['Home', 'Industrial Parks', 'Services Tracker', 'Login'] };
  }

  // All pages / what can I do
  if (/all pages|what can i (do|see|access)|site map|sitemap|list.*pages/.test(q)) {
    const role = localStorage.getItem('role');
    const available = SITE_KNOWLEDGE.pages.filter(p => p.public || (isLoggedIn && (!p.roles || p.roles.includes(role))));
    const pageList = available.slice(0, 10).map(p => `• **${p.name}** → \`${p.path}\``).join('\n');
    return { text: `Here are the pages you can access:\n\n${pageList}`, suggestions: ['Take me to Home', 'Show industrial parks'] };
  }

  // Quick facts
  if (/fact|did you know|interesting|stats|statistics/.test(q)) {
    const fact = SITE_KNOWLEDGE.quickFacts[Math.floor(Math.random() * SITE_KNOWLEDGE.quickFacts.length)];
    return { text: `💡 **Did you know?**\n\n${fact}`, suggestions: ['Another fact', 'What is this platform?'] };
  }

  // How to use
  if (/how.*(use|start|begin|get started)/.test(q)) {
    return { text: `**Getting Started with THOZHIRPORUL:**\n\n1. Visit the **Home** page to learn about the platform\n2. Go to **Portal Selection** to choose your role\n3. **Register** if you're new, or **Login** with existing credentials\n4. Access your role-specific dashboard\n5. Use the sidebar to navigate between features\n\n*Non-registered users can still explore Industrial Parks, Features, and file Grievances!*`, suggestions: ['How to register?', 'Show me parks', 'Login'] };
  }

  // Domain Knowledge Search
  for (const info of SITE_KNOWLEDGE.domainKnowledge) {
    if (info.keywords.some(kw => q.includes(kw))) {
      return { 
        text: `🔍 **SIPCOT Domain Knowledge: ${info.category}**\n\n${info.desc}`, 
        suggestions: ['How to apply?', 'Show parks explorer', 'Contact Support'] 
      };
    }
  }

  // Help / Solve Doubts / Provide Inputs
  if (/help|what can you do|how.*work|assist|doubt|problem|issue|solve|provide.*input/.test(q)) {
    const tips = SITE_KNOWLEDGE.interactionGuide.tips.map(t => `• ${t}`).join('\n');
    const support = SITE_KNOWLEDGE.supportProcess.channels.map(c => `• **${c.type}**: ${c.desc}`).join('\n');
    
    return { 
      text: `I am here to help you solve doubts and navigate the platform! 🛠️\n\n**To get the best information, try these input tips:**\n${tips}\n\n**Ways to solve your doubts:**\n${support}\n\nWhat specific process or information are you looking for?`, 
      suggestions: ['How to apply for a plot?', 'Show all pages', 'Contact Support'] 
    };
  }

  // Fallback
  return { text: `I'm not sure about that. Try asking me:\n\n• "What is THOZHIRPORUL?"\n• "How to apply for a plot?"\n• "Take me to the services tracker"\n• "What pages can I access?"`, suggestions: ['What is this platform?', 'Help', 'Show all pages'] };
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Seed the greeting ONLY when the chat is first opened with no history.
  // Previously this ran on every open, wiping the conversation — now the
  // greeting is added only once (when messages is empty), so reopening the
  // panel keeps your prior conversation intact.
  const seedGreeting = () => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');
    const role = localStorage.getItem('role');
    const initialText = (token && name)
      ? `Welcome back **${name}**! 👋\n\nI'm **VazhiPorul AI** - your SIPCOT intelligent assistant.\n\nAs a **${role || 'user'}**, I can help you:\n• Navigate to your dashboard\n• Track services and compliance\n• Answer questions about SIPCOT\n• Find information about parks and schemes`
      : `👋 Welcome to **THOZHIRPORUL**!\n\nI'm **VazhiPorul AI** - your SIPCOT intelligent assistant.\n\nI can help you:\n• Explore our 6 industrial parks\n• Understand services like NOCs and plot allotment\n• Learn about compliance and incentives\n• Navigate to any page`;
    setMessages([
      {
        role: 'ai',
        text: initialText,
        suggestions: ['Show industrial parks', 'How to apply for plot?', 'Available services']
      }
    ]);
  };

  useEffect(() => {
    if (open && messages.length === 0) seedGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset the conversation back to a fresh greeting.
  const handleClearChat = () => {
    setIsTyping(false);
    setInput('');
    seedGreeting();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput('');
    const now = new Date();

    setMessages(prev => [...prev, { role: 'user', text: userMsg, ts: now }]);
    setIsTyping(true);

    setTimeout(() => {
      const response = findBestResponse(
        userMsg,
        !!localStorage.getItem('token'),
        location.pathname,
        localStorage.getItem('userName')
      );
      setMessages(prev => [...prev, { role: 'ai', ts: new Date(), ...response }]);
      setIsTyping(false);

      if (response.autoNavigate && response.path) {
        setTimeout(() => navigate(response.path), 800);
      }
    }, 600 + (userMsg.length % 5) * 80);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMessages(prev => [...prev, { role: 'ai', text: `✅ Navigated to **${path}** successfully!` }]);
  };

  const renderMarkdown = (text) => {
    return text.split('\n').map((line, i) => {
      let html = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(16,185,129,0.15);color:#34D399;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>');
      return <Typography key={i} variant="body2" sx={{ lineHeight: 1.6, mb: line ? 0.3 : 0.8 }} dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />;
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        onClick={() => setOpen(!open)}
        sx={{
          position: 'fixed', bottom: { xs: 20, md: 28 }, right: { xs: 20, md: 28 },
          zIndex: 9900, width: 60, height: 60,
          background: open ? 'linear-gradient(135deg, #0f172a, #1e293b)' : 'linear-gradient(135deg, #10B981, #1F4E79)',
          boxShadow: open ? '0 6px 24px rgba(15,23,42,0.4)' : '0 6px 28px rgba(16,185,129,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: !open ? `${pulse} 2s infinite` : 'none',
          '&:hover': { transform: 'scale(1.08)', boxShadow: '0 8px 32px rgba(16,185,129,0.5)' },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {open ? <CloseIcon sx={{ color: 'white', fontSize: 26 }} /> : (
          <Box sx={{
            width: 44, height: 44, borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.95)',
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.3)',
            animation: `${float} 3s ease-in-out infinite`,
          }}>
            <img src={fabIcon} alt="AI Assistant" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          </Box>
        )}
      </Fab>

      {/* Chat Window */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper sx={{
          position: 'fixed', bottom: { xs: 90, md: 100 }, right: { xs: 12, md: 28 },
          width: { xs: 'calc(100vw - 24px)', sm: 400 }, maxHeight: { xs: '70vh', md: 560 },
          zIndex: 9899, borderRadius: 5, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(30px)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}>
          {/* Header */}
          <Box sx={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(31, 78, 121, 0.7))',
            color: 'white',
            px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5,
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', width: 40, height: 40, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <AutoAwesomeIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.2, letterSpacing: '-0.01em' }}>VazhiPorul AI</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.7rem' }}>THOZHIRPORUL Intelligent Assistant</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981',
                boxShadow: '0 0 8px #10B981',
                animation: `${pulseGreen} 2s infinite ease-in-out`,
                mr: 0.5,
              }} />
              <Tooltip title="Clear conversation">
                <IconButton size="small" onClick={handleClearChat} sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: '#34D399', bgcolor: 'rgba(16,185,129,0.12)' } }}>
                  <RestartAltIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>

          {/* Messages */}
          <Box sx={{
            flex: 1, overflowY: 'auto', px: 2.5, py: 2,
            background: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(7, 11, 19, 0.5) 100%)',
            '&::-webkit-scrollbar': { width: 5 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255, 255, 255, 0.12)', borderRadius: 2.5 },
          }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', mb: 2 }}>
                <Box sx={{
                  maxWidth: '85%', p: 1.8, borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  bgcolor: msg.role === 'user' ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255, 255, 255, 0.04)',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255, 255, 255, 0.04)',
                  color: msg.role === 'user' ? 'white' : 'rgba(255,255,255,0.92)',
                  boxShadow: msg.role === 'user' ? '0 4px 12px rgba(16,185,129,0.2)' : '0 4px 12px rgba(0,0,0,0.15)',
                  border: '1px solid',
                  borderColor: msg.role === 'user' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                }}>
                  {renderMarkdown(msg.text)}

                  {/* Navigation button */}
                  {msg.path && !msg.autoNavigate && (
                    <Chip
                      icon={<ArrowForwardIcon sx={{ fontSize: 13, color: '#10B981 !important' }} />}
                      label={`Go to ${msg.path}`}
                      size="small"
                      onClick={() => handleNavigate(msg.path)}
                      sx={{
                        mt: 1.5, cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem',
                        bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.25)',
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)', transform: 'translateY(-1px)' },
                      }}
                    />
                  )}

                  {/* Suggestions */}
                  {msg.suggestions && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1.5 }}>
                      {msg.suggestions.map((s, j) => (
                        <Chip key={j} label={s} size="small" variant="outlined"
                          onClick={() => {
                            if (s === 'Take me there' && msg.path) {
                              handleNavigate(msg.path);
                            } else {
                              handleSend(s);
                            }
                          }}
                          sx={{
                            cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700,
                            borderColor: 'rgba(16, 185, 129, 0.35)', color: '#34D399',
                            bgcolor: 'rgba(16, 185, 129, 0.04)',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: '#10B981', color: 'white', borderColor: '#10B981', transform: 'translateY(-1px)' },
                          }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Timestamp */}
                  {msg.ts && (
                    <Typography variant="caption" sx={{ display: 'block', textAlign: msg.role === 'user' ? 'right' : 'left', mt: 0.6, fontSize: '0.6rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
                      {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}

            {isTyping && (
              <Box sx={{ display: 'flex', gap: 0.6, p: 1.5, mb: 1, bgcolor: 'rgba(255,255,255,0.03)', width: 'fit-content', borderRadius: '12px 12px 12px 4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{
                    width: 7, height: 7, borderRadius: '50%', bgcolor: '#10B981',
                    animation: `${typing} 1s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, bgcolor: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {/* Quick-start prompts — only when the conversation is just the greeting */}
            {messages.length <= 1 && !isTyping && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
                {[
                  { label: '🏭 Parks', q: 'Show industrial parks' },
                  { label: '📋 Services', q: 'Available services' },
                  { label: '📊 Compliance', q: 'What is compliance score?' },
                  { label: '📞 Contact', q: 'How to contact SIPCOT?' },
                ].map((p) => (
                  <Chip
                    key={p.q}
                    label={p.label}
                    size="small"
                    onClick={() => handleSend(p.q)}
                    sx={{
                      cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700,
                      bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: 'rgba(16,185,129,0.15)', color: '#34D399', borderColor: 'rgba(16,185,129,0.4)' },
                    }}
                  />
                ))}
              </Box>
            )}
            <TextField
              inputRef={inputRef}
              fullWidth size="small" placeholder="Ask VazhiPorul AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3.5,
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s',
                  '& fieldset': { border: 'none' },
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)' },
                  '&.Mui-focused': { bgcolor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(16, 185, 129, 0.35)' }
                },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255, 255, 255, 0.45)', opacity: 1 }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleSend()} disabled={!input.trim()} size="small"
                      sx={{
                        bgcolor: input.trim() ? '#10B981' : 'transparent',
                        color: input.trim() ? 'white' : 'rgba(255, 255, 255, 0.25)',
                        '&:hover': { bgcolor: '#059669', transform: 'scale(1.05)' },
                        '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.15)', bgcolor: 'transparent' },
                        transition: 'all 0.2s',
                        p: 0.8
                      }}>
                      <SendIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.8, color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              Powered by VazhiPorul AI • THOZHIRPORUL Platform
            </Typography>
          </Box>
        </Paper>
      </Slide>
    </>
  );
}
