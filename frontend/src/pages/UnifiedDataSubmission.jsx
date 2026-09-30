import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, Stepper, Step,
  StepLabel, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Radio, RadioGroup, FormControlLabel, FormControl,
  FormLabel, Select, MenuItem, InputLabel, Alert, Divider, Card, CardContent,
  Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip
} from '@mui/material';
import {
  CloudUpload, Download, CheckCircle, Edit, Visibility,
  NavigateBefore, NavigateNext, Send, Save, Add, DeleteOutline, History
} from '@mui/icons-material';
import { submissionService, lifecycleService, reportingPeriodService } from '../services/api';

const steps = ['Period & Status', 'Financial', 'Employment', 'Resources', 'Production', 'CSR', 'Review & Submit'];

// CANONICAL UNITS: the API stores INR / count / KL / kWh. The form INPUTS
// financial values in ₹ Crores for usability and converts on submit
// (× 1e7); history values come back in INR and are displayed as Cr.
const CR = 1e7;
const toInr = (v) => (v === '' || v === null || v === undefined ? null : Number(v) * CR);
const toCrDisplay = (v) => (v === null || v === undefined || v === '' ? '-' : `${(Number(v) / CR).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`);

const statusChipColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'draft') return 'default';
  if (s === 'submitted') return 'primary';
  return 'warning';
};
const isDraft = (status) => String(status || '').toLowerCase() === 'draft';

const OPERATIONAL_STATUSES = [
  'OPERATING', 'UNDER_CONSTRUCTION', 'IDLE', 'TEMPORARILY_CLOSED', 'CLOSED'
];
const PRODUCTION_UNITS = ['MT', 'KG', 'L', 'M3', 'KWH', 'NOS', 'SQM'];

const EMPTY_FORM = {
  periodYear: new Date().getFullYear(), periodQuarter: Math.floor(new Date().getMonth() / 3) + 1,
  operationalStatus: 'OPERATING',
  investmentAmount: '', annualTurnover: '', exportRevenue: '', rdExpenditure: '',
  permanentEmployees: '', contractEmployees: '', scStEmployees: '', womenEmployees: '',
  waterConsumption: '', powerUsage: '', wasteGenerated: '', wasteRecycledPct: '',
  csrActivities: '', csrSpent: '', csrBeneficiaries: '',
  csrPillar: 'education_skills', csrPatBaseline: '', csrMandatedSpend: '',
  csrActualSpend: '', csrPartner: '', csrCsr1No: '', csrSdgGoals: '', csrLocation: '',
  productionItems: [],       // [{productName, quantity, unit, productionValue(in Cr input), remarks}]
  amendmentReason: '',
};

export default function UnifiedDataSubmission() {
  const [mode, setMode] = useState('form');
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [history, setHistory] = useState([]);
  const [viewDialog, setViewDialog] = useState(null);
  const [viewVersions, setViewVersions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]); // [{field,message}]
  const [calendar, setCalendar] = useState(null);
  const [queryDialog, setQueryDialog] = useState(null);

  const refreshHistory = async () => {
    try {
      const res = await submissionService.getMySubmissions();
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  useEffect(() => {
    let active = true;
    submissionService.getMySubmissions()
      .then(res => { if (active) setHistory(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {});
    reportingPeriodService.getMyCalendar()
      .then(res => { if (active) setCalendar(res.data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Is the currently selected period an AMENDMENT of an approved filing?
  const existingForPeriod = useMemo(
    () => history.find(h => h.periodYear === Number(formData.periodYear)
      && h.periodQuarter === Number(formData.periodQuarter)),
    [history, formData.periodYear, formData.periodQuarter]
  );
  const amendingApproved = existingForPeriod
    && String(existingForPeriod.status).toLowerCase() === 'approved';

  const handleChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  // Build the canonical payload: financials INR, counts, KL, kWh.
  const buildPayload = () => ({
    periodYear: Number(formData.periodYear),
    periodQuarter: Number(formData.periodQuarter),
    operationalStatus: formData.operationalStatus || undefined,
    investmentAmount: toInr(formData.investmentAmount),
    annualTurnover: toInr(formData.annualTurnover),
    exportRevenue: toInr(formData.exportRevenue),
    rdExpenditure: toInr(formData.rdExpenditure),
    permanentEmployees: formData.permanentEmployees === '' ? null : Number(formData.permanentEmployees),
    contractEmployees: formData.contractEmployees === '' ? null : Number(formData.contractEmployees),
    scStEmployees: formData.scStEmployees === '' ? null : Number(formData.scStEmployees),
    womenEmployees: formData.womenEmployees === '' ? null : Number(formData.womenEmployees),
    waterConsumption: formData.waterConsumption === '' ? null : Number(formData.waterConsumption),
    powerUsage: formData.powerUsage === '' ? null : Number(formData.powerUsage),
    wasteGenerated: formData.wasteGenerated === '' ? null : Number(formData.wasteGenerated),
    wasteRecycledPct: formData.wasteRecycledPct === '' ? null : Number(formData.wasteRecycledPct),
    csrActivities: formData.csrActivities || null,
    csrSpent: toInr(formData.csrSpent ? formData.csrSpent : (formData.csrActualSpend ? Number(formData.csrActualSpend) : '')),
    csrBeneficiaries: formData.csrBeneficiaries === '' ? null : Number(formData.csrBeneficiaries),
    productionItems: formData.productionItems.length
      ? formData.productionItems.map(p => ({
          productName: p.productName,
          quantity: p.quantity === '' ? 0 : Number(p.quantity),
          unit: p.unit || 'NOS',
          productionValue: p.productionValue === '' ? 0 : Number(p.productionValue) * CR,
          remarks: p.remarks || null
        }))
      : [],
    amendmentReason: formData.amendmentReason || undefined
  });

  const handleSubmit = async () => {
    setValidationErrors([]);
    try {
      const res = await submissionService.submit(buildPayload());
      const b = res.data || {};
      const periodLabel = `Q${formData.periodQuarter} ${formData.periodYear}`;
      const findings = b.findings ? ` Consistency findings: ${b.findings.consistency}, anomalies flagged: ${b.findings.anomalies}.` : '';
      setSnackbar({
        open: true,
        severity: 'success',
        message: `${b.msg || `Data for ${periodLabel} submitted.`}${b.version ? ` (version ${b.version})${b.changeKind === 'amendment' ? ' — previous values preserved in history' : ''}.` : ''}${b.isLate ? ' Filed LATE (past due date).' : ''}${findings}`
      });
      setFormData({ ...EMPTY_FORM });
      setActiveStep(0);
      setEditingId(null);
      refreshHistory();
    } catch (err) {
      const data = err.response && err.response.data;
      if (data && Array.isArray(data.errors)) {
        setValidationErrors(data.errors);
        setSnackbar({ open: true, severity: 'error',
          message: `${data.code || 'VALIDATION_ERROR'} — ${data.errors.length} field(s) need attention. Nothing was saved.` });
        setActiveStep(0);
      } else if (data && data.code === 'FILING_WINDOW_CLOSED') {
        setValidationErrors([{ field: 'periodQuarter', message: data.message }]);
        setSnackbar({ open: true, severity: 'error', message: data.message });
      } else {
        setSnackbar({ open: true, message: 'Submission failed. Please try again.', severity: 'error' });
      }
    }
  };

  const handleSaveDraft = () => {
    const periodLabel = `Q${formData.periodQuarter} ${formData.periodYear}`;
    if (editingId) {
      setHistory(history.map(h => h.id === editingId ? { ...h, period: periodLabel, data: { ...formData } } : h));
    } else {
      const draft = { id: `draft-${Date.now()}`, period: periodLabel, periodYear: formData.periodYear,
        periodQuarter: formData.periodQuarter, status: 'Draft', submitted: '-', approved_by: '-', data: { ...formData } };
      setHistory([draft, ...history]);
      setEditingId(draft.id);
    }
    try { localStorage.setItem('tzp_submission_draft', JSON.stringify(formData)); } catch (_) {}
    setSnackbar({ open: true, message: `Draft for ${periodLabel} kept on this page (browser-local). Submit to persist.`, severity: 'info' });
  };

  const handleEdit = (entry) => {
    const d = entry.data || {};
    setFormData({
      ...EMPTY_FORM,
      periodYear: entry.periodYear || new Date().getFullYear(),
      periodQuarter: entry.periodQuarter || 1,
      operationalStatus: d.operationalStatus || 'OPERATING',
      // history stores INR → show Crores
      investmentAmount: d.investmentAmount != null ? String(Number(d.investmentAmount) / CR) : '',
      annualTurnover: d.annualTurnover != null ? String(Number(d.annualTurnover) / CR) : '',
      exportRevenue: d.exportRevenue != null ? String(Number(d.exportRevenue) / CR) : '',
      rdExpenditure: d.rdExpenditure != null ? String(Number(d.rdExpenditure) / CR) : '',
      permanentEmployees: d.permanentEmployees ?? '', contractEmployees: d.contractEmployees ?? '',
      scStEmployees: d.scStEmployees ?? '', womenEmployees: d.womenEmployees ?? '',
      waterConsumption: d.waterConsumption ?? '', powerUsage: d.powerUsage ?? '',
      wasteGenerated: d.wasteGenerated ?? '', wasteRecycledPct: d.wasteRecycledPct ?? '',
      csrActivities: d.csrActivities ?? '',
      csrSpent: d.csrSpent != null ? String(Number(d.csrSpent) / CR) : '',
      csrBeneficiaries: d.csrBeneficiaries ?? '',
      productionItems: (d.productionItems || []).map(p => ({ ...p, productionValue: p.productionValue != null ? String(Number(p.productionValue) / CR) : '' })),
    });
    setEditingId(entry.id);
    setActiveStep(0);
    setMode('form');
    setSnackbar({ open: true, message: `Editing ${entry.period}. Submit to file an amendment — previous values are preserved.`, severity: 'info' });
  };

  // Prefill numeric/resource fields from the last filing (units converted).
  const handlePrefill = async () => {
    try {
      const res = await submissionService.getPrefill();
      const p = res.data && res.data.prefill;
      if (!p) { setSnackbar({ open: true, message: 'No prior filing to prefill from.', severity: 'info' }); return; }
      setFormData(f => ({
        ...f,
        operationalStatus: p.operational_status || f.operationalStatus,
        investmentAmount: p.investment_amount != null ? String(Number(p.investment_amount) / CR) : f.investmentAmount,
        annualTurnover: p.annual_turnover != null ? String(Number(p.annual_turnover) / CR) : f.annualTurnover,
        exportRevenue: p.export_revenue != null ? String(Number(p.export_revenue) / CR) : f.exportRevenue,
        rdExpenditure: p.rd_expenditure != null ? String(Number(p.rd_expenditure) / CR) : f.rdExpenditure,
        permanentEmployees: p.permanent_employees ?? f.permanentEmployees,
        contractEmployees: p.contract_employees ?? f.contractEmployees,
        scStEmployees: p.sc_st_employees ?? f.scStEmployees,
        womenEmployees: p.women_employees ?? f.womenEmployees,
        waterConsumption: p.water_consumption ?? f.waterConsumption,
        powerUsage: p.power_usage ?? f.powerUsage,
        wasteGenerated: p.waste_generated ?? f.wasteGenerated,
        wasteRecycledPct: p.waste_recycled_pct ?? f.wasteRecycledPct,
        csrActivities: p.csr_activities || f.csrActivities,
        csrSpent: p.csr_spent != null ? String(Number(p.csr_spent) / CR) : f.csrSpent,
        productionItems: (p.production_items || []).map(x => ({ ...x, productionValue: x.production_value != null ? String(Number(x.production_value) / CR) : '' })),
      }));
      setSnackbar({ open: true, message: `Prefilled from your last filing (${p.period_year}-Q${p.period_quarter ?? 'FY'}).`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Prefill failed.', severity: 'error' });
    }
  };

  const handleOpenQueries = async (row) => {
    try {
      const id = row.id || row.submissionId;
      const res = await lifecycleService.getQueries();
      const mine = (res.data || []).filter(q => q.submission_id === id);
      setQueryDialog({ submissionId: id, period: row.period, queries: mine, responses: {} });
    } catch {
      setSnackbar({ open: true, message: 'Failed to load queries.', severity: 'error' });
    }
  };

  const handleRespondQuery = async (queryId) => {
    const text = (queryDialog.responses && queryDialog.responses[queryId]) || '';
    if (!text.trim()) return;
    try {
      await lifecycleService.respondQuery(queryId, { responseText: text });
      setSnackbar({ open: true, message: 'Response submitted to officer.', severity: 'success' });
      const res = await lifecycleService.getQueries();
      const mine = (res.data || []).filter(q => q.submission_id === queryDialog.submissionId);
      setQueryDialog({ ...queryDialog, queries: mine, responses: { ...queryDialog.responses, [queryId]: '' } });
    } catch {
      setSnackbar({ open: true, message: 'Failed to submit response.', severity: 'error' });
    }
  };

  const handleView = async (row) => {
    setViewDialog(row);
    setViewVersions([]);
    try {
      const res = await submissionService.getVersions(row.id);
      setViewVersions((res.data && res.data.versions) || []);
    } catch { /* versions unavailable pre-v7 */ }
  };

  const handleDownloadSubmission = (entry) => {
    const d = entry.data || {};
    const rows = [
      ['Period', entry.period], ['Status', entry.status], ['Versions', entry.versionCount || 1],
      ['Investment (INR)', d.investmentAmount ?? '-'], ['Annual Turnover (INR)', d.annualTurnover ?? '-'],
      ['Export Revenue (INR)', d.exportRevenue ?? '-'], ['R&D (INR)', d.rdExpenditure ?? '-'],
      ['Permanent Employees', d.permanentEmployees ?? '-'], ['Contract Employees', d.contractEmployees ?? '-'],
      ['SC/ST Employees', d.scStEmployees ?? '-'], ['Women Employees', d.womenEmployees ?? '-'],
      ['Water (KL)', d.waterConsumption ?? '-'], ['Power (kWh)', d.powerUsage ?? '-'],
      ['Waste (MT)', d.wasteGenerated ?? '-'], ['Recycled (%)', d.wasteRecycledPct ?? '-'],
      ['CSR Activities', d.csrActivities || '-'], ['CSR Spent (INR)', d.csrSpent ?? '-'],
      ['Beneficiaries', d.csrBeneficiaries ?? '-'],
      ...((d.productionItems || []).map((p, i) => [`Production ${i + 1}: ${p.productName}`, `${p.quantity} ${p.unit} | ₹${p.productionValue}`])),
    ];
    const csv = 'Field,Value\n' + rows.map(([k, v]) => `"${k}","${v}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Submission_${entry.period.replace(' ', '_')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const header = 'PeriodYear,PeriodQuarter,InvestmentCr,TurnoverCr,ExportCr,RnDCr,PermanentEmployees,ContractEmployees,SCSTEmployees,WomenEmployees,WaterKL,PowerKWh,WasteMT,WasteRecycledPct,CSRActivities,CSRSpendCr,Beneficiaries';
    const example = '2026,3,150,320,80,5,740,120,45,95,1200,45000,24.5,75,"Anganwadi renovation",1.85,120';
    const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'THOZHIRPORUL_Submission_Template.csv'; a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Template downloaded (financial columns in ₹ Crores — converted to INR on import). One row per quarter.', severity: 'success' });
  };

  // CSV import — ALL rows, sequential validated submissions, per-row results.
  const handleCsvImport = async () => {
    if (!uploadedFile) return;
    const text = await uploadedFile.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      // Basic quote-aware split.
      const cells = lines[i].match(/("([^"]*)"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
      const payload = {
        periodYear: Number(cells[0]), periodQuarter: Number(cells[1]),
        investmentAmount: cells[2] !== '' && cells[2] !== undefined ? Number(cells[2]) * CR : null,
        annualTurnover: cells[3] !== '' && cells[3] !== undefined ? Number(cells[3]) * CR : null,
        exportRevenue: cells[4] !== '' && cells[4] !== undefined ? Number(cells[4]) * CR : null,
        rdExpenditure: cells[5] !== '' && cells[5] !== undefined ? Number(cells[5]) * CR : null,
        permanentEmployees: cells[6] !== '' && cells[6] !== undefined ? Number(cells[6]) : null,
        contractEmployees: cells[7] !== '' && cells[7] !== undefined ? Number(cells[7]) : null,
        scStEmployees: cells[8] !== '' && cells[8] !== undefined ? Number(cells[8]) : null,
        womenEmployees: cells[9] !== '' && cells[9] !== undefined ? Number(cells[9]) : null,
        waterConsumption: cells[10] !== '' && cells[10] !== undefined ? Number(cells[10]) : null,
        powerUsage: cells[11] !== '' && cells[11] !== undefined ? Number(cells[11]) : null,
        wasteGenerated: cells[12] !== '' && cells[12] !== undefined ? Number(cells[12]) : null,
        wasteRecycledPct: cells[13] !== '' && cells[13] !== undefined ? Number(cells[13]) : null,
        csrActivities: cells[14] || null,
        csrSpent: cells[15] !== '' && cells[15] !== undefined ? Number(cells[15]) * CR : null,
        csrBeneficiaries: cells[16] !== '' && cells[16] !== undefined ? Number(cells[16]) : null,
      };
      try {
        const res = await submissionService.submit(payload);
        results.push(`Row ${i}: ✅ ${res.data.msg || 'filed'}${res.data.version ? ` (v${res.data.version})` : ''}`);
      } catch (err) {
        const errs = err.response?.data?.errors?.map(e => `${e.field}: ${e.message}`).join('; ')
          || err.response?.data?.message || 'rejected';
        results.push(`Row ${i}: ❌ ${errs}`);
      }
    }
    setUploadedFile(null);
    refreshHistory();
    setSnackbar({ open: true, severity: 'info', message: `Import finished — ${results.filter(r => r.includes('✅')).length}/${results.length - 0} rows filed. See results below.` });
    setImportResults(results);
  };

  const [importResults, setImportResults] = useState(null);

  // ---- production item editors ----
  const addProductionItem = () => setFormData(f => ({
    ...f, productionItems: [...f.productionItems, { productName: '', quantity: '', unit: 'MT', productionValue: '', remarks: '' }]
  }));
  const setProductionItem = (i, field) => (e) => setFormData(f => ({
    ...f, productionItems: f.productionItems.map((p, j) => j === i ? { ...p, [field]: e.target.value } : p)
  }));
  const removeProductionItem = (i) => () => setFormData(f => ({
    ...f, productionItems: f.productionItems.filter((_, j) => j !== i)
  }));

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select value={formData.periodYear} label="Year" onChange={handleChange('periodYear')}>
                  {[2027, 2026, 2025, 2024].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Quarter (calendar)</InputLabel>
                <Select value={formData.periodQuarter} label="Quarter (calendar)" onChange={handleChange('periodQuarter')}>
                  <MenuItem value={1}>Q1 (Jan–Mar)</MenuItem>
                  <MenuItem value={2}>Q2 (Apr–Jun)</MenuItem>
                  <MenuItem value={3}>Q3 (Jul–Sep)</MenuItem>
                  <MenuItem value={4}>Q4 (Oct–Dec)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Operational Status</InputLabel>
                <Select value={formData.operationalStatus} label="Operational Status" onChange={handleChange('operationalStatus')}>
                  {OPERATIONAL_STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            {calendar && (
              <Grid size={{ xs: 12 }}>
                <Alert severity={calendar.my_status?.outstanding?.length ? 'warning' : 'success'}>
                  {calendar.my_status?.outstanding?.length
                    ? <>You have <strong>{calendar.my_status.outstanding.length}</strong> outstanding period(s) this year: {calendar.my_status.outstanding.map(q => `Q${q}`).join(', ')}. Filing deadlines are set by SIPCOT's reporting calendar.</>
                    : <>You are current on this year's reporting calendar. Next periods: {(calendar.upcoming || []).slice(0, 2).map(p => `${p.period_year}-Q${p.period_quarter} (due ${new Date(p.due_on).toLocaleDateString('en-IN')})`).join(' · ')}</>}
                </Alert>
              </Grid>
            )}
            {existingForPeriod && (
              <Grid size={{ xs: 12 }}>
                <Alert severity={amendingApproved ? 'warning' : 'info'}>
                  {amendingApproved
                    ? <>This period is already <strong>Approved</strong> — filing again creates an <strong>amendment</strong>. The previous values are preserved in version history, and an amendment reason is required.</>
                    : <>This period already has a filing in status <strong>{existingForPeriod.status}</strong> — submitting again updates it (all revisions are versioned).</>}
                </Alert>
              </Grid>
            )}
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}><Alert severity="info">Enter financial values in <strong>₹ Crores</strong> — stored canonically in INR.</Alert></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Investment Amount (₹ Cr) *" type="number" value={formData.investmentAmount} onChange={handleChange('investmentAmount')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Annual Turnover (₹ Cr) *" type="number" value={formData.annualTurnover} onChange={handleChange('annualTurnover')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Export Revenue (₹ Cr)" type="number" value={formData.exportRevenue} onChange={handleChange('exportRevenue')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="R&D Expenditure (₹ Cr)" type="number" value={formData.rdExpenditure} onChange={handleChange('rdExpenditure')} /></Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Permanent Employees *" type="number" value={formData.permanentEmployees} onChange={handleChange('permanentEmployees')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Contract Employees *" type="number" value={formData.contractEmployees} onChange={handleChange('contractEmployees')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="SC/ST Employees" type="number" value={formData.scStEmployees} onChange={handleChange('scStEmployees')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Women Employees" type="number" value={formData.womenEmployees} onChange={handleChange('womenEmployees')} /></Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Water Consumption (KL) *" type="number" value={formData.waterConsumption} onChange={handleChange('waterConsumption')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Power Usage (kWh) *" type="number" value={formData.powerUsage} onChange={handleChange('powerUsage')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Waste Generated (MT)" type="number" value={formData.wasteGenerated} onChange={handleChange('wasteGenerated')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Waste Recycled (%)" type="number" value={formData.wasteRecycledPct} onChange={handleChange('wasteRecycledPct')} /></Grid>
          </Grid>
        );
      case 4:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>Production line items for this quarter (value in ₹ Crores). Add one row per product.</Alert>
            {formData.productionItems.map((p, i) => (
              <Grid container spacing={2} key={i} sx={{ mb: 1, alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth size="small" label="Product name" value={p.productName} onChange={setProductionItem(i, 'productName')} /></Grid>
                <Grid size={{ xs: 6, sm: 2 }}><TextField fullWidth size="small" label="Quantity" type="number" value={p.quantity} onChange={setProductionItem(i, 'quantity')} /></Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <FormControl fullWidth size="small"><InputLabel>Unit</InputLabel>
                    <Select value={p.unit} label="Unit" onChange={setProductionItem(i, 'unit')}>
                      {PRODUCTION_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 8, sm: 3 }}><TextField fullWidth size="small" label="Production value (₹ Cr)" type="number" value={p.productionValue} onChange={setProductionItem(i, 'productionValue')} /></Grid>
                <Grid size={{ xs: 4, sm: 2 }}><IconButton color="error" onClick={removeProductionItem(i)}><DeleteOutline /></IconButton></Grid>
              </Grid>
            ))}
            <Button startIcon={<Add />} onClick={addProductionItem} variant="outlined" size="small">Add product</Button>
          </Box>
        );
      case 5:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ mb: 1 }}>
                CSR is filed under <strong>Section 135 / Schedule VII</strong> of the Companies Act.
                Companies must spend <strong>2% of average PAT</strong> (3-yr baseline) on eligible activities.
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>CSR Pillar (Schedule VII)</InputLabel>
                <Select value={formData.csrPillar} label="CSR Pillar (Schedule VII)" onChange={handleChange('csrPillar')}>
                  <MenuItem value="health_sanitation">Healthcare &amp; Sanitation</MenuItem>
                  <MenuItem value="education_skills">Education &amp; Skill Development</MenuItem>
                  <MenuItem value="environment">Environmental Sustainability</MenuItem>
                  <MenuItem value="women_welfare">Women Empowerment &amp; Worker Welfare</MenuItem>
                  <MenuItem value="heritage_culture">Heritage, Art &amp; Culture</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth multiline rows={2} label="Activity Description" value={formData.csrActivities} onChange={handleChange('csrActivities')} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label="PAT Baseline (3-yr avg, Cr)" type="number" value={formData.csrPatBaseline} onChange={handleChange('csrPatBaseline')} helperText="Avg net profit after tax, preceding 3 FYs" /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label="Mandated 2% Spend (Cr)" type="number" value={formData.csrMandatedSpend || (formData.csrPatBaseline ? (Number(formData.csrPatBaseline) * 0.02).toFixed(2) : '')} onChange={handleChange('csrMandatedSpend')} helperText="Auto = PAT × 2%" /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label="Total CSR Spend (₹ Cr)" type="number" value={formData.csrSpent} onChange={handleChange('csrSpent')} helperText="Canonical INR is stored; enter Crores" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Implementing Partner (NGO/Trust)" value={formData.csrPartner} onChange={handleChange('csrPartner')} helperText="Must hold CSR-1 registration" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Partner CSR-1 Reg. No." value={formData.csrCsr1No} onChange={handleChange('csrCsr1No')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="SDG Goals (comma-separated)" value={formData.csrSdgGoals} onChange={handleChange('csrSdgGoals')} helperText="e.g. 3,4,13 (UN SDG numbers)" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Location Benefited" value={formData.csrLocation} onChange={handleChange('csrLocation')} helperText="Local-area rule — community near your park" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Beneficiaries Count" type="number" value={formData.csrBeneficiaries} onChange={handleChange('csrBeneficiaries')} /></Grid>
          </Grid>
        );
      case 6:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              {amendingApproved
                ? 'You are amending an APPROVED filing — a reason is required and the previous version is preserved.'
                : 'Review all data before submitting. Server-side validation runs on every field; failures are reported per field and nothing is saved.'}
            </Alert>
            {amendingApproved && (
              <TextField fullWidth multiline rows={2} label="Amendment reason (required) *" value={formData.amendmentReason}
                onChange={handleChange('amendmentReason')} sx={{ mb: 2 }}
                helperText={`e.g. "Corrected employment figure after payroll audit for Q${formData.periodQuarter}"`} />
            )}
            <Grid container spacing={2}>
              {[
                { label: 'Period', value: `Q${formData.periodQuarter} ${formData.periodYear}` },
                { label: 'Operational status', value: formData.operationalStatus },
                { label: 'Investment', value: formData.investmentAmount ? `₹ ${formData.investmentAmount} Cr` : '-' },
                { label: 'Turnover', value: formData.annualTurnover ? `₹ ${formData.annualTurnover} Cr` : '-' },
                { label: 'Permanent Employees', value: formData.permanentEmployees || '-' },
                { label: 'Contract Employees', value: formData.contractEmployees || '-' },
                { label: 'Water (KL)', value: formData.waterConsumption || '-' },
                { label: 'Power (kWh)', value: formData.powerUsage || '-' },
                { label: 'Production items', value: formData.productionItems.length || '0' },
                { label: 'CSR Spent (Cr)', value: formData.csrSpent || '-' },
                { label: 'Beneficiaries', value: formData.csrBeneficiaries || '-' },
              ].map((item, i) => (
                <Grid key={i} size={{ xs: 6, sm: 3 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      <Typography variant="body1" fontWeight={600}>{item.value}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      default: return null;
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
        Unified Data Submission
        {editingId && <Chip label="Editing Draft" color="warning" size="small" sx={{ ml: 2, verticalAlign: 'middle' }} />}
      </Typography>

      {/* Server-side validation errors (field-level) */}
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationErrors([])}>
          <strong>Submission rejected by server validation — nothing was saved:</strong>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            {validationErrors.map((e, i) => <li key={i}><code>{e.field}</code> — {e.message}</li>)}
          </Box>
        </Alert>
      )}

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, md: 3 } }}>
        <FormControl>
          <FormLabel>Submission Mode</FormLabel>
          <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value)}>
            <FormControlLabel value="form" control={<Radio />} label="Step-by-Step Form" />
            <FormControlLabel value="excel" control={<Radio />} label="Bulk CSV Import" />
          </RadioGroup>
        </FormControl>
      </Paper>

      {mode === 'form' && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button size="small" onClick={handlePrefill}>Prefill from last filing</Button>
          </Box>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: { xs: 2, md: 4 } }}>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          <Box sx={{ minHeight: 200, mb: 3 }}>{renderStepContent()}</Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button disabled={activeStep === 0} onClick={() => setActiveStep(activeStep - 1)} startIcon={<NavigateBefore />}>Previous</Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Save />} onClick={handleSaveDraft}>Save Draft</Button>
              {activeStep < steps.length - 1 ? (
                <Button variant="contained" onClick={() => setActiveStep(activeStep + 1)} endIcon={<NavigateNext />}>Next</Button>
              ) : (
                <Button variant="contained" color="success" startIcon={<Send />} onClick={handleSubmit}>
                  {amendingApproved ? 'Submit Amendment' : 'Submit Data'}
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {mode === 'excel' && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, md: 3 } }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Bulk CSV Import</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: { xs: 2, md: 3 }, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadTemplate}>Download Template (.csv)</Button>
          </Box>
          <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center', bgcolor: 'grey.50', mb: 2 }}>
            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1">Upload a CSV file — one row per quarter</Typography>
            <Typography variant="body2" color="text.secondary">Every row is validated server-side; invalid rows are reported and skipped.</Typography>
            <input type="file" accept=".csv" id="file-upload" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) { setUploadedFile(e.target.files[0]); setImportResults(null); } }} />
            <label htmlFor="file-upload"><Button variant="outlined" sx={{ mt: 2 }} component="span">Choose CSV File</Button></label>
            {uploadedFile && (
              <Box sx={{ mt: 2 }}>
                <Chip label={uploadedFile.name} color="primary" onDelete={() => setUploadedFile(null)} sx={{ mb: 1 }} />
                <Button variant="contained" onClick={handleCsvImport}>Validate &amp; Import</Button>
              </Box>
            )}
          </Box>
          {importResults && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Import results (per row):</Typography>
              {importResults.map((r, i) => <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace' }}>{r}</Typography>)}
            </Box>
          )}
          <Alert severity="info">CSV import only (.xlsx is not parsed in-browser). Financial columns are in ₹ Crores and converted to canonical INR.</Alert>
        </Paper>
      )}

      {/* Submission History */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Submission History (all versions preserved)</Typography>
          <Typography variant="body2" color="text.secondary">{history.length} filings</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Versions</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Approved By</TableCell>
                <TableCell>Investment</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{row.period}</Typography>
                    {row.isLate && <Chip label="LATE" size="small" color="warning" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell><Chip label={row.status} size="small" color={statusChipColor(row.status)} /></TableCell>
                  <TableCell>
                    <Tooltip title="Amendment/version count">
                      <Chip icon={<History />} label={`v${row.versionCount || 1}`} size="small" variant="outlined" />
                    </Tooltip>
                  </TableCell>
                  <TableCell>{row.submitted}</TableCell>
                  <TableCell>{row.approved_by}</TableCell>
                  <TableCell>{row.data?.investmentAmount != null ? toCrDisplay(row.data.investmentAmount) : '-'}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {isDraft(row.status) && (
                        <Button size="small" startIcon={<Edit />} onClick={() => handleEdit(row)} variant="outlined" color="primary">Edit</Button>
                      )}
                      <Button size="small" startIcon={<Visibility />} onClick={() => handleView(row)} variant="outlined">View</Button>
                      <Button size="small" startIcon={<Send />} onClick={() => handleOpenQueries(row)} variant="outlined" color="warning">Queries</Button>
                      <Button size="small" startIcon={<Download />} onClick={() => handleDownloadSubmission(row)} variant="outlined" color="secondary">CSV</Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* View Submission Dialog + version history */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="sm" fullWidth>
        {viewDialog && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={600}>Submission: {viewDialog.period}</Typography>
                <Chip label={viewDialog.status} color={statusChipColor(viewDialog.status)} />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ py: 1 }}>
                {[
                  { label: 'Submitted', value: viewDialog.submitted },
                  { label: 'Approved By', value: viewDialog.approved_by },
                  { label: 'Investment', value: toCrDisplay(viewDialog.data?.investmentAmount) },
                  { label: 'Turnover', value: toCrDisplay(viewDialog.data?.annualTurnover) },
                  { label: 'Export Revenue', value: toCrDisplay(viewDialog.data?.exportRevenue) },
                  { label: 'R&D', value: toCrDisplay(viewDialog.data?.rdExpenditure) },
                  { label: 'Permanent Employees', value: viewDialog.data?.permanentEmployees ?? '-' },
                  { label: 'Contract Employees', value: viewDialog.data?.contractEmployees ?? '-' },
                  { label: 'SC/ST Employees', value: viewDialog.data?.scStEmployees ?? '-' },
                  { label: 'Women Employees', value: viewDialog.data?.womenEmployees ?? '-' },
                  { label: 'Water (KL)', value: viewDialog.data?.waterConsumption ?? '-' },
                  { label: 'Power (kWh)', value: viewDialog.data?.powerUsage ?? '-' },
                  { label: 'Waste (MT)', value: viewDialog.data?.wasteGenerated ?? '-' },
                  { label: 'Recycled (%)', value: viewDialog.data?.wasteRecycledPct ?? '-' },
                  { label: 'CSR Spent', value: toCrDisplay(viewDialog.data?.csrSpent) },
                  { label: 'Beneficiaries', value: viewDialog.data?.csrBeneficiaries ?? '-' },
                  ...((viewDialog.data?.productionItems || []).map((p, i) => ({ label: `Production: ${p.productName}`, value: `${p.quantity} ${p.unit} · ₹${(Number(p.productionValue) / CR).toFixed(2)} Cr` }))),
                ].map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{String(item.value)}</Typography>
                  </Box>
                ))}
              </Box>
              {viewVersions.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom><History sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5 }} />Version history (append-only)</Typography>
                  {viewVersions.map(v => (
                    <Box key={v.id} sx={{ p: 1.5, mb: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Chip size="small" label={`v${v.version_no} · ${v.change_kind}`} color={v.change_kind === 'amendment' ? 'warning' : 'default'} />
                        <Typography variant="caption">{new Date(v.filed_at).toLocaleString('en-IN')} · {v.filed_by_email || source(v.source)}</Typography>
                      </Box>
                      {v.amendment_reason && <Typography variant="body2" sx={{ mt: 0.5 }}>Reason: {v.amendment_reason}</Typography>}
                      {Array.isArray(v.diff) && v.diff.length > 0 && (
                        <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                          {v.diff.slice(0, 6).map((d, i) => (
                            <li key={i}><Typography variant="caption">{d.field}: {String(d.old ?? '—')} → {String(d.new ?? '—')}{d.change_pct !== null && d.change_pct !== undefined ? ` (${d.change_pct > 0 ? '+' : ''}${d.change_pct}%)` : ''}</Typography></li>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewDialog(null)}>Close</Button>
              <Button variant="contained" startIcon={<Download />} onClick={() => { handleDownloadSubmission(viewDialog); setViewDialog(null); }}>Download CSV</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Filing-Deficiency Query Dialog */}
      <Dialog open={!!queryDialog} onClose={() => setQueryDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Filing Queries — {queryDialog?.period}</DialogTitle>
        <DialogContent>
          {queryDialog && queryDialog.queries.length === 0 && (
            <Alert severity="success" sx={{ mt: 1 }}>No queries raised on this submission. An officer will raise a query here if any filing deficiency is found.</Alert>
          )}
          {queryDialog && queryDialog.queries.map((q) => (
            <Box key={q.id} sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Chip label={q.status} size="small" color={q.status === 'open' ? 'error' : q.status === 'responded' ? 'info' : 'success'} />
                <Typography variant="caption" color="text.secondary">{q.raised_at ? new Date(q.raised_at).toLocaleString('en-IN') : ''}</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Officer query:</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{q.query_text}</Typography>
              {q.response_text && (
                <Box sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1, mb: 1 }}>
                  <Typography variant="caption" fontWeight={600}>Your response:</Typography>
                  <Typography variant="body2">{q.response_text}</Typography>
                </Box>
              )}
              {q.status === 'open' && (
                <Box>
                  <TextField fullWidth size="small" multiline rows={2} label="Type your response…"
                    value={(queryDialog.responses && queryDialog.responses[q.id]) || ''}
                    onChange={(e) => setQueryDialog({ ...queryDialog, responses: { ...queryDialog.responses, [q.id]: e.target.value } })}
                    sx={{ mb: 1 }} />
                  <Button size="small" variant="contained" color="primary" startIcon={<Send />} onClick={() => handleRespondQuery(q.id)}>Submit Response</Button>
                </Box>
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions><Button onClick={() => setQueryDialog(null)}>Close</Button></DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

const source = (s) => `source: ${s || 'web'}`;
