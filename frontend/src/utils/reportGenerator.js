// ============================================================
// THOZHIRPORUL — Dedicated Report Generator
// Produces a uniquely-designed PDF per role (Admin / Industry / Government),
// each with the THOZHIRPORUL logo (header + watermark), a unique Report ID,
// and real-time data. Supports selection-driven reports (type/park/period).
// Uses jsPDF (mm units, A4).
// ============================================================
import { jsPDF } from 'jspdf';
import {
  analyticService, complianceService, commandService,
  workspaceService, submissionService, reportService,
} from '../services/api';
import logoUrl from '../assets/logo-transparent.png';

// ---- Page geometry (A4 portrait, mm) ----
const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;
const CONTENT_W = PAGE_W - M * 2;

// ---- Per-role identity & theme ----
const THEMES = {
  admin: {
    roleCode: 'ADM', primary: [31, 78, 121], accent: [74, 144, 217], light: [234, 242, 251],
    mono: 'A', org: 'NEXORA · PLATFORM ADMINISTRATION', title: 'PLATFORM ADMINISTRATION REPORT',
    watermark: 'ADMINISTRATIVE', confidential: 'INTERNAL — ADMINISTRATIVE USE ONLY',
  },
  industry: {
    roleCode: 'IND', primary: [27, 94, 32], accent: [102, 187, 106], light: [233, 245, 234],
    mono: 'I', org: 'THOZHIRPORUL · INDUSTRY WORKSPACE', title: 'INDUSTRY PERFORMANCE & COMPLIANCE REPORT',
    watermark: 'CONFIDENTIAL', confidential: 'CONFIDENTIAL — ISSUED TO THE REGISTERED UNIT',
  },
  government: {
    roleCode: 'GOV', primary: [123, 31, 43], accent: [201, 162, 39], light: [246, 239, 226],
    mono: 'G', org: 'GOVERNMENT OF TAMIL NADU · SIPCOT', title: 'STATE INDUSTRIAL OVERSIGHT REPORT',
    watermark: 'OFFICIAL', confidential: 'OFFICIAL — GOVERNMENT OVERSIGHT',
  },
};

// ---- Helpers ----
const inr = (n) => (Number(n) || 0).toLocaleString('en-IN');
const two = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN');
const num = (v) => Number(v) || 0;

function makeReportId(roleCode) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `TZP-${roleCode}-${ymd}-${rand}`;
}

// Load the logo once (cached). Resolves to an HTMLImageElement or null.
let _logo;
function loadLogo() {
  if (_logo !== undefined) return Promise.resolve(_logo);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { _logo = img; resolve(img); };
    img.onerror = () => { _logo = null; resolve(null); };
    img.src = logoUrl;
  });
}

function drawHeader(doc, theme, meta, logo) {
  const [pr, pg, pb] = theme.primary;
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, PAGE_W, 30, 'F');
  doc.setFillColor(...theme.accent);
  doc.rect(0, 30, PAGE_W, 1.6, 'F');

  // Logo on a white tile (visible on any header colour); monogram fallback.
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M, 7, 16, 16, 2.5, 2.5, 'F');
  if (logo) {
    const aspect = (logo.naturalWidth / logo.naturalHeight) || 1;
    let w = 13, h = 13;
    if (aspect >= 1) h = w / aspect; else w = h * aspect;
    try { doc.addImage(logo, 'PNG', M + (16 - w) / 2, 7 + (16 - h) / 2, w, h); } catch { /* ignore */ }
  } else {
    doc.setTextColor(pr, pg, pb);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(theme.mono, M + 8, 18, { align: 'center' });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('THOZHIRPORUL', M + 21, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...theme.light);
  doc.text(theme.org, M + 21, 21);

  doc.setFontSize(6.5);
  doc.setTextColor(...theme.light);
  doc.text('REPORT ID', PAGE_W - M, 10, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(meta.reportId, PAGE_W - M, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...theme.light);
  doc.text(`GENERATED  ${meta.generatedAt}`, PAGE_W - M, 20, { align: 'right' });

  doc.setTextColor(pr, pg, pb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(meta.title || theme.title, M, 45);
  doc.setDrawColor(...theme.accent);
  doc.setLineWidth(0.8);
  doc.line(M, 48, M + 70, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(meta.subtitle || '', M, 54);

  return 62;
}

function sectionTitle(doc, theme, text, y) {
  const [pr, pg, pb] = theme.primary;
  doc.setFillColor(...theme.accent);
  doc.rect(M, y - 4, 3, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(pr, pg, pb);
  doc.text(text.toUpperCase(), M + 6, y);
  return y + 7;
}

function kpiCards(doc, theme, cards, y) {
  const n = cards.length;
  const gap = 4;
  const w = (CONTENT_W - gap * (n - 1)) / n;
  const h = 22;
  cards.forEach((c, i) => {
    const x = M + i * (w + gap);
    doc.setFillColor(...theme.light);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');
    doc.setFillColor(...theme.accent);
    doc.rect(x, y, 1.6, h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...theme.primary);
    doc.text(String(c.value), x + 5, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(70, 70, 70);
    doc.text(String(c.label).toUpperCase(), x + 5, y + 17, { maxWidth: w - 8 });
  });
  return y + h + 8;
}

function table(doc, theme, columns, rows, y) {
  const rowH = 8;
  const headerH = 8.5;
  const drawHeaderRow = (yy) => {
    doc.setFillColor(...theme.primary);
    doc.rect(M, yy, CONTENT_W, headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let x = M;
    columns.forEach((col) => {
      const tx = col.align === 'right' ? x + col.width - 2 : x + 2;
      doc.text(col.header, tx, yy + 5.7, { align: col.align || 'left', maxWidth: col.width - 3 });
      x += col.width;
    });
    return yy + headerH;
  };

  y = drawHeaderRow(y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  rows.forEach((row, ri) => {
    if (y + rowH > PAGE_H - 20) {
      doc.addPage();
      doc.setFillColor(...theme.primary);
      doc.rect(0, 0, PAGE_W, 6, 'F');
      y = 16;
      y = drawHeaderRow(y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }
    if (ri % 2 === 0) {
      doc.setFillColor(...theme.light);
      doc.rect(M, y, CONTENT_W, rowH, 'F');
    }
    let x = M;
    columns.forEach((col, ci) => {
      const val = row[ci] == null ? '' : String(row[ci]);
      doc.setTextColor(50, 50, 50);
      const tx = col.align === 'right' ? x + col.width - 2 : x + 2;
      doc.text(val, tx, y + 5.4, { align: col.align || 'left', maxWidth: col.width - 3 });
      x += col.width;
    });
    y += rowH;
  });

  doc.setDrawColor(...theme.accent);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + CONTENT_W, y);
  return y + 8;
}

function scoreBar(doc, theme, label, value, y) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(label, M, y);
  const barX = M + 55;
  const barW = CONTENT_W - 55 - 14;
  doc.setFillColor(228, 228, 228);
  doc.roundedRect(barX, y - 3.4, barW, 4.5, 1, 1, 'F');
  const pct = Math.max(0, Math.min(100, num(value)));
  doc.setFillColor(...theme.primary);
  doc.roundedRect(barX, y - 3.4, (barW * pct) / 100, 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.primary);
  doc.text(`${pct}%`, PAGE_W - M, y, { align: 'right' });
  return y + 8;
}

// Stamp logo watermark + footer on every page (page count is known here).
function finalize(doc, theme, meta, logo) {
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);

    // Watermark — faint centred logo (transparent PNG). Text fallback if the
    // graphics-state opacity API is unavailable.
    let drew = false;
    if (logo) {
      const aspect = (logo.naturalWidth / logo.naturalHeight) || 1;
      const w = 130, h = w / aspect;
      const x = (PAGE_W - w) / 2, yy = (PAGE_H - h) / 2;
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.06 }));
        doc.addImage(logo, 'PNG', x, yy, w, h);
        doc.restoreGraphicsState();
        drew = true;
      } catch { drew = false; }
    }
    if (!drew) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(60);
      doc.setTextColor(240, 240, 240);
      doc.text(theme.watermark, PAGE_W / 2, PAGE_H / 2 + 10, { align: 'center', angle: 32 });
    }

    // Footer
    doc.setDrawColor(...theme.accent);
    doc.setLineWidth(0.5);
    doc.line(M, PAGE_H - 14, PAGE_W - M, PAGE_H - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(120, 120, 120);
    doc.text(theme.confidential, M, PAGE_H - 9);
    doc.setTextColor(...theme.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(`Report ID: ${meta.reportId}`, PAGE_W / 2, PAGE_H - 9, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - M, PAGE_H - 9, { align: 'right' });
  }
}

async function startDoc(role, subject, titleOverride) {
  const theme = THEMES[role];
  const reportId = makeReportId(theme.roleCode);
  const meta = {
    reportId,
    generatedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    subtitle: subject,
    title: titleOverride,
  };
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  const y = drawHeader(doc, theme, meta, logo);
  return { doc, theme, meta, y, logo };
}

// ============================================================
// SELECTION-DRIVEN REPORT (Admin / Government) — honours the user's
// chosen report type, park and period; pulls real per-industry data.
// ============================================================
const REPORT_DEFS = {
  investment: {
    title: 'Investment Summary',
    cols: [
      { header: 'Company', width: 90, render: (r) => r.company_name },
      { header: 'Location', width: 52, render: (r) => r.location || '-' },
      { header: 'Investment (Cr)', width: 40, align: 'right', render: (r) => `₹${two(r.investment_cr)}` },
    ],
  },
  employment: {
    title: 'Employment Report',
    cols: [
      { header: 'Company', width: 90, render: (r) => r.company_name },
      { header: 'Location', width: 52, render: (r) => r.location || '-' },
      { header: 'Employment', width: 40, align: 'right', render: (r) => inr(r.employment) },
    ],
  },
  compliance: {
    title: 'Compliance Status',
    cols: [
      { header: 'Company', width: 90, render: (r) => r.company_name },
      { header: 'Location', width: 52, render: (r) => r.location || '-' },
      { header: 'Compliance', width: 40, align: 'right', render: (r) => (r.compliance != null ? `${r.compliance}%` : 'N/A') },
    ],
  },
  resource: {
    title: 'Resource Utilization',
    cols: [
      { header: 'Company', width: 82, render: (r) => r.company_name },
      { header: 'Water (KL)', width: 50, align: 'right', render: (r) => inr(r.water_consumption) },
      { header: 'Power (kWh)', width: 50, align: 'right', render: (r) => inr(r.power_usage) },
    ],
  },
  custom: {
    title: 'Consolidated Report',
    cols: [
      { header: 'Company', width: 56, render: (r) => r.company_name },
      { header: 'Location', width: 36, render: (r) => r.location || '-' },
      { header: 'Inv (Cr)', width: 30, align: 'right', render: (r) => `₹${two(r.investment_cr)}` },
      { header: 'Emp', width: 30, align: 'right', render: (r) => inr(r.employment) },
      { header: 'Compl.', width: 30, align: 'right', render: (r) => (r.compliance != null ? `${r.compliance}%` : 'N/A') },
    ],
  },
  park_performance: {
    title: 'Park Performance',
    groupByPark: true,
    cols: [
      { header: 'Industrial Park', width: 78 },
      { header: 'Industries', width: 34, align: 'right' },
      { header: 'Investment (Cr)', width: 40, align: 'right' },
      { header: 'Employment', width: 30, align: 'right' },
    ],
  },
};

export async function downloadSelectionReport({ role = 'admin', reportType = 'investment', period = '', park = 'all', quarter = 'all' } = {}) {
  const themeRole = role === 'govt' ? 'government' : role;
  if (themeRole === 'industry') return downloadIndustryReport();

  const res = await reportService.getData().catch(() => ({ data: { rows: [] } }));
  let rows = res.data?.rows || [];
  if (park && park !== 'all') {
    rows = rows.filter((r) => (r.location || '').toLowerCase().includes(park.toLowerCase()));
  }

  const def = REPORT_DEFS[reportType] || REPORT_DEFS.investment;
  const parkLabel = park && park !== 'all' ? park.charAt(0).toUpperCase() + park.slice(1) : 'All Parks';
  const periodLabel = quarter && quarter !== 'all' ? `Q${quarter} ${period}` : (period || 'Latest');
  const subject = `${def.title}   |   ${parkLabel}   |   Period: ${periodLabel}`;

  const { doc, theme, meta, y: y0, logo } = await startDoc(themeRole, subject, def.title.toUpperCase());
  let y = y0;

  const totInv = rows.reduce((a, r) => a + num(r.investment_cr), 0);
  const totEmp = rows.reduce((a, r) => a + num(r.employment), 0);
  const avgComp = rows.length ? Math.round(rows.reduce((a, r) => a + num(r.compliance), 0) / rows.length) : 0;
  y = kpiCards(doc, theme, [
    { label: 'Industries', value: inr(rows.length) },
    { label: 'Investment (Cr)', value: `₹${two(totInv)}` },
    { label: 'Employment', value: inr(totEmp) },
    { label: 'Avg Compliance', value: `${avgComp}%` },
  ], y);

  y = sectionTitle(doc, theme, def.title, y);

  if (def.groupByPark) {
    const byPark = {};
    rows.forEach((r) => {
      const k = r.location || 'Other';
      byPark[k] = byPark[k] || { park: k, industries: 0, investment: 0, employment: 0 };
      byPark[k].industries += 1;
      byPark[k].investment += num(r.investment_cr);
      byPark[k].employment += num(r.employment);
    });
    const prows = Object.values(byPark)
      .sort((a, b) => b.investment - a.investment)
      .map((p) => [p.park, inr(p.industries), `₹${two(p.investment)}`, inr(p.employment)]);
    if (!prows.length) prows.push(['No data for the selected filters', '', '', '']);
    table(doc, theme, def.cols, prows, y);
  } else {
    const trows = rows.map((r) => def.cols.map((c) => c.render(r)));
    if (!trows.length) trows.push(def.cols.map((_, i) => (i === 0 ? 'No data for the selected filters' : '')));
    table(doc, theme, def.cols.map((c) => ({ header: c.header, width: c.width, align: c.align })), trows, y);
  }

  finalize(doc, theme, meta, logo);
  doc.save(`${meta.reportId}.pdf`);
  return meta.reportId;
}

// ============================================================
// ADMIN REPORT — comprehensive platform snapshot (one-click)
// ============================================================
export async function downloadAdminReport() {
  const [globalRes, overviewRes, violRes] = await Promise.all([
    analyticService.getGlobalData().catch(() => ({ data: {} })),
    complianceService.getOverview().catch(() => ({ data: {} })),
    complianceService.getViolations({ limit: 50 }).catch(() => ({ data: { violations: [] } })),
  ]);
  const g = globalRes.data || {};
  const o = overviewRes.data || {};
  const violations = violRes.data?.violations || [];

  const { doc, theme, meta, y: y0, logo } = await startDoc('admin', 'Platform-wide operational & compliance snapshot');
  let y = y0;

  y = kpiCards(doc, theme, [
    { label: 'Registered Industries', value: inr(g.total_industries || o.total_industries || 0) },
    { label: 'Total Investment (Cr)', value: `₹${two(g.total_investment_cr || 0)}` },
    { label: 'Total Employment', value: inr(g.total_employment || 0) },
    { label: 'Compliant Units', value: inr(o.compliant?.count || 0) },
  ], y);

  y = sectionTitle(doc, theme, 'Compliance Distribution', y);
  y = table(doc, theme,
    [{ header: 'Status', width: 70 }, { header: 'Units', width: 56, align: 'right' }, { header: 'Share', width: 56, align: 'right' }],
    [
      ['Compliant', inr(o.compliant?.count || 0), `${o.compliant?.percentage ?? 0}%`],
      ['Warning', inr(o.warning?.count || 0), `${o.warning?.percentage ?? 0}%`],
      ['Violation', inr(o.violation?.count || 0), `${o.violation?.percentage ?? 0}%`],
      ['Missing Data', inr(o.missing?.count || 0), `${o.missing?.percentage ?? 0}%`],
    ], y);

  y = sectionTitle(doc, theme, 'Active Violations Register', y);
  const vrows = violations.map((v) => [v.company_name, v.rule_name || v.rule_code || '-', String(v.severity || '').toUpperCase(), String(v.status || '')]);
  if (vrows.length === 0) vrows.push(['No active violations on record', '', '', '']);
  table(doc, theme,
    [{ header: 'Company', width: 66 }, { header: 'Rule', width: 60 }, { header: 'Severity', width: 30 }, { header: 'Status', width: 26 }],
    vrows, y);

  finalize(doc, theme, meta, logo);
  doc.save(`${meta.reportId}.pdf`);
  return meta.reportId;
}

// ============================================================
// INDUSTRY REPORT — single registered unit (one-click)
// ============================================================
export async function downloadIndustryReport() {
  const [ovRes, subsRes] = await Promise.all([
    workspaceService.getOverview().catch(() => ({ data: {} })),
    submissionService.getMySubmissions().catch(() => ({ data: [] })),
  ]);
  const ov = ovRes.data || {};
  const subs = Array.isArray(subsRes.data) ? subsRes.data : [];
  const company = ov.company || {};
  const cs = ov.compliance_score || {};
  const qs = ov.quick_stats || {};

  const { doc, theme, meta, y: y0, logo } = await startDoc('industry', `${company.name || 'Registered Unit'} · ${company.park || ''}`.trim());
  let y = y0;

  doc.setFillColor(...theme.light);
  doc.roundedRect(M, y, CONTENT_W, 16, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...theme.primary);
  doc.text(company.name || 'Registered Unit', M + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(`${company.industry_type || '-'}   |   ${company.location || '-'}   |   Plot ${company.plot || '-'}   |   ${company.park || '-'}`, M + 4, y + 12);
  y += 22;

  y = kpiCards(doc, theme, [
    { label: 'Compliance Score', value: `${cs.overall ?? 0}%` },
    { label: 'Employees', value: inr(qs.employees || 0) },
    { label: 'Investment (Cr)', value: `₹${two(qs.investment_cr || 0)}` },
    { label: 'Power (kWh)', value: inr(qs.power_usage_kwh || 0) },
  ], y);

  y = sectionTitle(doc, theme, 'Compliance Score Breakdown', y);
  y = scoreBar(doc, theme, 'Submission', cs.submission, y);
  y = scoreBar(doc, theme, 'Environmental', cs.environmental, y);
  y = scoreBar(doc, theme, 'Financial', cs.financial, y);
  y = scoreBar(doc, theme, 'Safety', cs.safety, y);
  y += 2;

  y = sectionTitle(doc, theme, 'Submission History', y);
  const srows = subs.map((s) => [
    s.period, String(s.status), s.submitted || '-',
    s.data ? `₹${two(num(s.data.investmentAmount))} / ${inr(s.data.powerUsage || 0)} kWh` : '-',
  ]);
  if (srows.length === 0) srows.push(['No submissions on record', '', '', '']);
  table(doc, theme,
    [{ header: 'Period', width: 34 }, { header: 'Status', width: 34 }, { header: 'Submitted', width: 40 }, { header: 'Investment / Power', width: 74 }],
    srows, y);

  finalize(doc, theme, meta, logo);
  doc.save(`${meta.reportId}.pdf`);
  return meta.reportId;
}

// ============================================================
// GOVERNMENT REPORT — state oversight (one-click)
// ============================================================
export async function downloadGovernmentReport() {
  const [kpiRes, overviewRes, rankRes, heatRes] = await Promise.all([
    commandService.getKPIs().catch(() => ({ data: {} })),
    complianceService.getOverview().catch(() => ({ data: {} })),
    commandService.getRankings().catch(() => ({ data: [] })),
    commandService.getHeatmap().catch(() => ({ data: [] })),
  ]);
  const k = kpiRes.data || {};
  const o = overviewRes.data || {};
  const rankings = Array.isArray(rankRes.data) ? rankRes.data : (rankRes.data?.rankings || []);
  const heat = Array.isArray(heatRes.data) ? heatRes.data : (heatRes.data?.heatmapData || []);

  const { doc, theme, meta, y: y0, logo } = await startDoc('government', 'State-wide investment, employment & compliance oversight');
  let y = y0;

  y = kpiCards(doc, theme, [
    { label: 'Total CapEx (Cr)', value: `₹${two(k.total_capex_cr || 0)}` },
    { label: 'Revenue (Cr)', value: `₹${two(k.total_revenue_cr || 0)}` },
    { label: 'Direct Jobs', value: inr(k.direct_employment || 0) },
    { label: 'Red Flags', value: inr(k.red_flags || 0) },
  ], y);

  y = sectionTitle(doc, theme, 'Park-wise Performance', y);
  const prows = rankings.map((r) => [r.name, `₹${two(r.total_investment_cr || 0)}`, inr(r.total_employment || 0), String(r.infrastructure_score ?? '-')]);
  if (prows.length === 0) prows.push(['No park data available', '', '', '']);
  y = table(doc, theme,
    [{ header: 'Industrial Park', width: 78 }, { header: 'Investment (Cr)', width: 40, align: 'right' }, { header: 'Employment', width: 34, align: 'right' }, { header: 'Infra', width: 30, align: 'right' }],
    prows, y);

  y = sectionTitle(doc, theme, 'District Investment Distribution', y);
  const drows = heat.map((d) => [d.district, inr(d.parks || 0), inr(d.industries || 0), `₹${two(d.investment_cr || 0)}`]);
  if (drows.length === 0) drows.push(['No district data available', '', '', '']);
  y = table(doc, theme,
    [{ header: 'District', width: 70 }, { header: 'Parks', width: 34, align: 'right' }, { header: 'Industries', width: 38, align: 'right' }, { header: 'Investment (Cr)', width: 40, align: 'right' }],
    drows, y);

  y = sectionTitle(doc, theme, 'Compliance Summary', y);
  table(doc, theme,
    [{ header: 'Status', width: 90 }, { header: 'Units', width: 46, align: 'right' }, { header: 'Share', width: 46, align: 'right' }],
    [
      ['Compliant', inr(o.compliant?.count || 0), `${o.compliant?.percentage ?? 0}%`],
      ['Warning', inr(o.warning?.count || 0), `${o.warning?.percentage ?? 0}%`],
      ['Violation', inr(o.violation?.count || 0), `${o.violation?.percentage ?? 0}%`],
      ['Missing Data', inr(o.missing?.count || 0), `${o.missing?.percentage ?? 0}%`],
    ], y);

  finalize(doc, theme, meta, logo);
  doc.save(`${meta.reportId}.pdf`);
  return meta.reportId;
}

// Dispatcher: with options.reportType -> selection-driven report; else the
// comprehensive one-click role report.
export function downloadRoleReport(role, options) {
  if (options && options.reportType) {
    return downloadSelectionReport({ role, ...options });
  }
  if (role === 'industry') return downloadIndustryReport();
  if (role === 'govt' || role === 'government') return downloadGovernmentReport();
  return downloadAdminReport();
}
