import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Tooltip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Snackbar, Alert, LinearProgress, Badge, Divider,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Memory, PlayArrow, CheckCircle, Cancel, Science, Assessment, Schedule,
  Warning, ArrowForward, Refresh, Stop, ChevronRight, Terminal, Insights,
  TrendingUp, Security, Bolt, Speed
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine, Legend
} from 'recharts';
import { agentService, intelligenceService } from '../services/api';

const STATUS_COLORS = {
  running: '#1976d2', waiting_approval: '#f57c00', completed: '#2e7d32',
  failed: '#d32f2f', cancelled: '#9e9e9e', expired: '#757575'
};
const RISK_COLORS = { low: '#2e7d32', medium: '#f57c00', high: '#d32f2f', critical: '#b71c1c' };

// ════════════════════════════════════════════════════════════
// AI INSIGHTS — NL Query with chart rendering
// ════════════════════════════════════════════════════════════
function AIInsightsPanel() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [history, setHistory] = useState([]);

  const suggestions = [
    'Show me anomalies',
    'How many parks are in the system?',
    'What is the total investment?',
    'Which industries have not submitted Q3 data?',
    'What is the projected power demand for the next four quarters?',
    'Top performers by compliance score'
  ];

  const ask = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await agentService.query(query);
      setAnswer(res);
      setHistory(prev => [{ q: query, at: new Date().toISOString() }, ...prev.slice(0, 4)]);
    } catch (err) {
      setAnswer({ error: err.response?.data?.error || 'Query failed' });
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (data) => {
    if (!data?.query?.rows?.length) return null;
    const rows = data.query.rows;
    const cols = data.query.sql_shape?.columns || Object.keys(rows[0]);
    const labelCol = cols.find(c => typeof rows[0][c] === 'string') || cols[0];
    const valueCol = cols.find(c => typeof rows[0][c] === 'number' && c !== labelCol) || cols[1];
    if (!valueCol) return null;
    const chartData = rows.slice(0, 12).map(r => ({
      name: String(r[labelCol] || '').slice(0, 20),
      value: Number(r[valueCol]) || 0
    }));

    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" angle={-35} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <ChartTooltip />
          <Bar dataKey="value" fill="#1F4E79" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderForecastChart = (fc) => {
    if (!fc?.projection?.length) return null;
    const history = (fc.history || []).slice(-6).map(h => ({
      period: `${h.year}-Q${h.quarter}`, value: h.value, type: 'Historical'
    }));
    const projected = fc.projection.map(p => ({ period: p.period, value: p.value, type: 'Forecast' }));
    const band = fc.band || [];
    const all = [...history, ...projected];

    return (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={all}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <ChartTooltip />
          <Legend />
          <Area dataKey="value" stroke="#1F4E79" fill="#1F4E7920" strokeWidth={2} name={fc.metric} />
          {band.length > 0 && (
            <>
              <Line dataKey="high" stroke="#2E7D3240" strokeWidth={0} name="Upper bound" dot={false} />
              <Line dataKey="low" stroke="#2E7D3240" strokeWidth={0} name="Lower bound" dot={false} />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <TextField
          fullWidth size="small" placeholder="Ask in English or Tamil…"
          value={question} onChange={e => setQuestion(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && ask()}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
        />
        <Button variant="contained" onClick={() => ask()} disabled={loading || !question.trim()}
          endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
          sx={{ borderRadius: 2, px: 3, bgcolor: '#1F4E79' }}>
          Ask
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        {suggestions.map(s => (
          <Chip key={s} label={s} size="small" variant="outlined" onClick={() => { setQuestion(s); ask(s); }}
            sx={{ fontSize: '0.75rem', borderColor: '#1F4E7930', color: '#1F4E79', '&:hover': { bgcolor: '#1F4E7908' } }} />
        ))}
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {answer && !answer.error && (
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', mb: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CheckCircle sx={{ fontSize: 18, color: '#2E7D32' }} />
              <Typography variant="subtitle2" fontWeight={700}>
                {answer.result?.summary || 'Answer'}
              </Typography>
            </Box>
            {answer.result?.data?.query && renderChart(answer.result.data)}
            {answer.result?.data?.forecast && renderForecastChart(answer.result.data.forecast)}
            {answer.result?.data?.query?.citation && (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                Source: {answer.result.data.query.citation}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {answer?.error && (
        <Alert severity="error" sx={{ mb: 2 }}>{answer.error}</Alert>
      )}

      {history.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.disabled" sx={{ mb: 1, display: 'block' }}>
            Recent questions
          </Typography>
          {history.map((h, i) => (
            <Chip key={i} label={h.q.slice(0, 40)} size="small" sx={{ mr: 1, mb: 1, fontSize: '0.7rem' }}
              onClick={() => { setQuestion(h.q); ask(h.q); }} />
          ))}
        </Box>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// FORECAST CENTER — Q+1 to Q+4 with capacity comparison
// ════════════════════════════════════════════════════════════
function ForecastPanel() {
  const [metric, setMetric] = useState('power');
  const [scope, setScope] = useState('state');
  const [data, setData] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fc, cap] = await Promise.all([
        intelligenceService.getForecast(metric, scope, null, 4),
        intelligenceService.getCapacity()
      ]);
      setData(fc.data);
      setCapacity(cap.data);
    } catch { /* keep old */ }
    finally { setLoading(false); }
  }, [metric, scope]);

  useEffect(() => { load(); }, [load]);

  const chartData = data ? [
    ...(data.history || []).slice(-8).map(h => ({
      period: `${h.year}-Q${h.quarter}`, value: h.value, band: null, type: 'Historical'
    })),
    ...(data.projection || []).map((p, i) => ({
      period: p.period, value: p.value,
      low: data.band?.[i]?.low, high: data.band?.[i]?.high, type: 'Forecast'
    }))
  ] : [];

  const capData = capacity?.parks?.slice(0, 8) || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Metric</InputLabel>
          <Select value={metric} onChange={e => setMetric(e.target.value)} label="Metric">
            <MenuItem value="power">Power (kWh)</MenuItem>
            <MenuItem value="water">Water (KL)</MenuItem>
            <MenuItem value="employment">Employment</MenuItem>
            <MenuItem value="investment">Investment</MenuItem>
            <MenuItem value="turnover">Turnover</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Scope</InputLabel>
          <Select value={scope} onChange={e => setScope(e.target.value)} label="Scope">
            <MenuItem value="state">State-wide</MenuItem>
          </Select>
        </FormControl>
        <Button size="small" onClick={load} startIcon={<Refresh />} sx={{ borderRadius: 2 }}>
          Refresh
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {data && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {metric.toUpperCase()} Forecast — Q+1 to Q+4
                  </Typography>
                  <Chip label={data.data_status === 'OK' ? data.model : 'INSUFFICIENT DATA'}
                    size="small" color={data.data_status === 'OK' ? 'success' : 'warning'} />
                </Box>
                {data.data_status === 'OK' ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip />
                      <Legend />
                      <Area dataKey="value" stroke="#1F4E79" fill="#1F4E7915" strokeWidth={2} name={metric} />
                      <Line dataKey="high" stroke="#2E7D3240" dot={false} name="Upper" />
                      <Line dataKey="low" stroke="#D32F2F40" dot={false} name="Lower" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Alert severity="warning">
                    {data.minimum_required} — only {data.available_points} quarter(s) of data available.
                    No forecast is produced rather than an unreliable one.
                  </Alert>
                )}
                {data.backtest && (
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                    Backtest: {data.backtest.note}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  Capacity vs Projected Demand
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Park</TableCell>
                        <TableCell align="center">Power Risk</TableCell>
                        <TableCell align="center">Water Risk</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {capData.map(p => (
                        <TableRow key={p.park_id} hover>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{p.name?.slice(0, 25)}</TableCell>
                          <TableCell align="center">
                            <Chip label={p.resources?.power?.risk || '—'} size="small"
                              sx={{ bgcolor: RISK_COLORS[p.resources?.power?.risk] + '15', color: RISK_COLORS[p.resources?.power?.risk], fontSize: '0.65rem' }} />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={p.resources?.water?.risk || '—'} size="small"
                              sx={{ bgcolor: RISK_COLORS[p.resources?.water?.risk] + '15', color: RISK_COLORS[p.resources?.water?.risk], fontSize: '0.65rem' }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// APPROVAL QUEUE
// ════════════════════════════════════════════════════════════
function ApprovalQueuePanel() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await agentService.getTasks();
      setTasks(res.data?.approvals || []);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const decide = async (approvalId, workflowId, decision) => {
    try {
      if (decision === 'approve') {
        await agentService.approveWorkflow(workflowId, { approvalId });
      } else {
        await agentService.rejectWorkflow(workflowId, { approvalId });
      }
      setSnackbar({ open: true, message: `Recommendation ${decision}d`, severity: 'success' });
      load();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed', severity: 'error' });
    }
  };

  if (loading) return <LinearProgress />;
  if (!tasks.length) return <Alert severity="info">No pending approvals. All recommendations have been reviewed.</Alert>;

  return (
    <Box>
      {tasks.map(t => (
        <Card key={t.approval_id} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', mb: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {t.requested_action}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Workflow: {t.workflow_type} · Risk: {t.risk_level} · Expires: {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : '—'}
                </Typography>
              </Box>
              <Chip label={t.risk_level} size="small"
                sx={{ bgcolor: RISK_COLORS[t.risk_level] + '15', color: RISK_COLORS[t.risk_level], fontWeight: 700 }} />
            </Box>
            {t.recommendation && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                <strong>AI Recommendation:</strong> {t.recommendation}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}
                onClick={() => decide(t.approval_id, t.workflow_id, 'approve')}
                sx={{ borderRadius: 2 }}>
                Approve
              </Button>
              <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
                onClick={() => decide(t.approval_id, t.workflow_id, 'reject')}
                sx={{ borderRadius: 2 }}>
                Reject
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// AGENT WORKFLOWS LIST
// ════════════════════════════════════════════════════════════
function WorkflowsPanel() {
  const [workflows, setWorkflows] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [steps, setSteps] = useState(null);
  const isOpen = selected !== null;

  const load = async () => {
    setLoading(true);
    try {
      const [wf, m] = await Promise.all([agentService.getWorkflows({ limit: 30 }), agentService.getMetrics()]);
      setWorkflows(wf.data?.workflows || []);
      setMetrics(m.data?.metrics || null);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const viewSteps = async (id) => {
    setSelected(id);
    try {
      const res = await agentService.getWorkflowSteps(id);
      setSteps(res.data);
    } catch { setSteps(null); }
  };

  if (loading) return <LinearProgress />;

  return (
    <Box>
      {metrics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Runs', value: metrics.agent_runs_total, icon: <Memory />, color: '#1F4E79' },
            { label: 'Failures', value: metrics.agent_failures_total, icon: <Warning />, color: '#D32F2F' },
            { label: 'Tool Calls', value: metrics.tool_calls_total, icon: <Bolt />, color: '#F57C00' },
            { label: 'Model Calls', value: metrics.model_calls_total, icon: <Science />, color: '#7B1FA2' },
            { label: 'Avg Duration', value: `${metrics.avg_workflow_duration_ms || 0}ms`, icon: <Speed />, color: '#2E7D32' },
            { label: 'Pending Approvals', value: metrics.approvals_pending, icon: <Schedule />, color: '#F57C00' },
          ].map((m, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <Box sx={{ color: m.color, mb: 1 }}>{m.icon}</Box>
                <Typography variant="h6" fontWeight={800} color={m.color}>{m.value}</Typography>
                <Typography variant="caption" color="text.secondary">{m.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Risk</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Ended</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workflows.map(wf => (
              <TableRow key={wf.workflow_id} hover>
                <TableCell>
                  <Chip label={wf.workflow_type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                </TableCell>
                <TableCell>
                  <Chip label={wf.status} size="small"
                    sx={{ bgcolor: STATUS_COLORS[wf.status] + '15', color: STATUS_COLORS[wf.status], fontSize: '0.65rem' }} />
                </TableCell>
                <TableCell>
                  {wf.risk_level && (
                    <Chip label={wf.risk_level} size="small"
                      sx={{ bgcolor: RISK_COLORS[wf.risk_level] + '15', color: RISK_COLORS[wf.risk_level], fontSize: '0.65rem' }} />
                  )}
                </TableCell>
                <TableCell>{new Date(wf.started_at).toLocaleString()}</TableCell>
                <TableCell>{wf.ended_at ? new Date(wf.ended_at).toLocaleString() : '—'}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View execution trace">
                    <IconButton size="small" onClick={() => viewSteps(wf.workflow_id)}>
                      <ChevronRight fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {wf.status === 'running' && (
                    <Tooltip title="Cancel">
                      <IconButton size="small" color="error" onClick={async () => {
                        await agentService.cancelWorkflow(wf.workflow_id).catch(() => {});
                        load();
                      }}>
                        <Stop fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {steps && (
        <Dialog open={isOpen} onClose={() => { setSelected(null); setSteps(null); }} maxWidth="md" fullWidth>
          <DialogTitle>Workflow Execution Trace</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Steps ({steps.steps?.length || 0})</Typography>
              {steps.steps?.map((s, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Chip label={s.status} size="small" color={s.status === 'succeeded' ? 'success' : s.status === 'failed' ? 'error' : 'default'} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{s.node_name}</Typography>
                  <Typography variant="caption" color="text.disabled">{s.latency_ms}ms</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Tool Calls ({steps.tool_calls?.length || 0})</Typography>
              {steps.tool_calls?.map((tc, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Chip label={tc.status} size="small" color={tc.status === 'succeeded' ? 'success' : 'error'} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{tc.tool_name}</Typography>
                  <Typography variant="caption" color="text.disabled">{tc.latency_ms}ms</Typography>
                </Box>
              ))}
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Model Runs ({steps.model_runs?.length || 0})</Typography>
              {steps.model_runs?.map((mr, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, py: 1 }}>
                  <Chip label={mr.status} size="small" color={mr.status === 'succeeded' ? 'success' : 'default'} />
                  <Typography variant="body2">{mr.model} ({mr.provider})</Typography>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setSelected(null); setSteps(null); }}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function AgentCenter() {
  const [tab, setTab] = useState(0);
  const [capabilities, setCapabilities] = useState(null);

  useEffect(() => {
    agentService.getCapabilities()
      .then(res => setCapabilities(res.data))
      .catch(() => {});
  }, []);

  const modelStatus = capabilities?.model_runtime;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: '#7B1FA210', color: '#7B1FA2' }}>
            <Memory sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              VazhiPorul AI — Agent Center
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {capabilities ? `${capabilities.agents?.length || 0} agents · ${capabilities.tools?.length || 0} tools · ${capabilities.workflows?.length || 0} workflows` : 'Loading capabilities…'}
            </Typography>
          </Box>
        </Box>
        {modelStatus && (
          <Chip
            icon={modelStatus.status === 'OK' ? <CheckCircle /> : <Warning />}
            label={modelStatus.status === 'OK' ? 'LLM Active' : 'Deterministic Mode'}
            color={modelStatus.status === 'OK' ? 'success' : 'warning'}
            size="small" variant="outlined"
          />
        )}
      </Box>

      {modelStatus?.status !== 'OK' && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Running in <strong>deterministic mode</strong> — no LLM runtime detected. All agents work correctly
          using rule-based logic. Install <code>ollama pull qwen2.5:7b-instruct</code> to activate AI enhancement.
        </Alert>
      )}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab icon={<Insights />} label="AI Insights" />
        <Tab icon={<TrendingUp />} label="Forecast Center" />
        <Tab icon={<Schedule />} label="Approvals" />
        <Tab icon={<Terminal />} label="Workflows" />
      </Tabs>

      {tab === 0 && <AIInsightsPanel />}
      {tab === 1 && <ForecastPanel />}
      {tab === 2 && <ApprovalQueuePanel />}
      {tab === 3 && <WorkflowsPanel />}
    </Box>
  );
}
