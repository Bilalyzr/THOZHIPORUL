import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardContent, Button, Chip,
  Paper, TextField, InputAdornment, ToggleButton, ToggleButtonGroup,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Divider, Tooltip, Switch, FormControlLabel,
  List, ListItemButton, ListItemIcon, ListItemText, ClickAwayListener, Popper, IconButton,
  CircularProgress
} from '@mui/material';
import UnifiedNav from '../components/UnifiedNav';
import UnifiedFooter from '../components/UnifiedFooter';
import PageHero from '../components/PageHero';
import { parkService } from '../services/api';
import {
  Search, Map as MapIcon, TableChart, LocationOn,
  Water, Bolt, ArrowForwardIos, Explore, Layers,
  SquareFoot, Factory, People, CurrencyRupee, MyLocation, Close, ArrowBack, Home, Lock as LockIcon
} from '@mui/icons-material';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { keyframes } from '@emotion/react';

// Fallback "type" label derived from park status (API does not provide a sector/type field)
const TYPE_BY_STATUS = {
  active: 'Operational Industrial Park',
  developing: 'Under Development',
  proposed: 'Proposed Development',
};

// Map a raw API park record to the UI shape used throughout this page.
// The API returns numeric columns as strings, so we coerce with Number().
// `maxWater`/`maxPower` are the fleet-wide maxima, used to derive relative
// water/power utilization bars from the real capacity figures the API returns.
const mapPark = (p, maxWater, maxPower) => {
  const num = (v) => (v == null ? 0 : Number(v));
  const totalArea = num(p.total_area_acres);
  const developedArea = num(p.developed_area_acres);
  const waterKl = num(p.water_capacity_kl);
  const powerMw = num(p.power_capacity_mw);
  // Normalise the DB status enum ('under_development') to a STATUS_CONFIG key so
  // downstream STATUS_CONFIG[park.status] lookups never resolve to undefined.
  const rawStatus = p.status || 'active';
  const status = rawStatus === 'under_development' ? 'developing'
    : (['active', 'developing', 'proposed'].includes(rawStatus) ? rawStatus : 'active');
  return {
    id: p.id,
    name: p.name,
    code: p.code || '',
    district: p.district || '',
    total_area: totalArea,
    available_area: num(p.available_area_acres),
    status,
    score: num(p.infrastructure_score),
    industries: num(p.total_industries),
    investment: num(p.total_investment_cr),
    employment: num(p.total_employment),
    lat: num(p.latitude),
    lng: num(p.longitude),
    // Derived / fallback fields (API does not expose these directly)
    type: TYPE_BY_STATUS[status] || 'Industrial Park',
    // Relative infrastructure utilization: real capacity normalized to fleet max
    water_pct: maxWater > 0 ? Math.round((waterKl / maxWater) * 100) : 0,
    power_pct: maxPower > 0 ? Math.round((powerMw / maxPower) * 100) : 0,
    developed_area: developedArea,
  };
};

const STATUS_CONFIG = {
  active: { color: '#2E7D32', label: 'Active', bg: '#e8f5e9' },
  developing: { color: '#F57C00', label: 'Under Development', bg: '#fff3e0' },
  proposed: { color: '#1565C0', label: 'Proposed', bg: '#e3f2fd' },
};

const TILE_LAYERS = {
  street: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', name: 'Street' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', name: 'Satellite' },
  terrain: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', name: 'Terrain' },
};

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const TN_CENTER = [11.1, 78.6];
const TN_ZOOM = 7;

// Component to fly map to a selected park
function FlyToMarker({ park }) {
  const map = useMap();
  useEffect(() => {
    if (park) {
      map.flyTo([park.lat, park.lng], 11, { duration: 1.2 });
    }
  }, [park, map]);
  return null;
}

// Reset map view
function ResetView() {
  const map = useMap();
  return (
    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
      <Button variant="contained" size="small" startIcon={<MyLocation />}
        sx={{ bgcolor: 'white', color: '#1F4E79', boxShadow: 2, '&:hover': { bgcolor: '#f0f4f8' } }}
        onClick={() => map.flyTo(TN_CENTER, TN_ZOOM, { duration: 0.8 })}>
        Reset View
      </Button>
    </Box>
  );
}

const ScoreChip = ({ score }) => {
  const color = score >= 85 ? '#2E7D32' : score >= 70 ? '#F57C00' : '#d32f2f';
  return <Chip label={`${score}/100`} size="small" sx={{ bgcolor: color, color: 'white', fontWeight: 700 }} />;
};

const InfraBar = ({ label, value, icon }) => (
  <Box sx={{ mb: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {icon}
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
      </Box>
      <Typography variant="body2" fontWeight={700}>{value}%</Typography>
    </Box>
    <LinearProgress variant="determinate" value={value}
      sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200',
        '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: value >= 80 ? '#d32f2f' : value >= 60 ? '#F57C00' : '#2E7D32' }
      }} />
  </Box>
);

export default function IndustrialParks() {
  const navigate = useNavigate();
  const [parks, setParks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('map');
  const [selectedPark, setSelectedPark] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tileLayer, setTileLayer] = useState('street');
  const [showAvailability, setShowAvailability] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const isAuthenticated = !!localStorage.getItem('token');

  // Fetch real park data from the backend on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await parkService.getAll();
        const rows = Array.isArray(data) ? data : [];
        const maxWater = rows.reduce((m, p) => Math.max(m, Number(p.water_capacity_kl) || 0), 0);
        const maxPower = rows.reduce((m, p) => Math.max(m, Number(p.power_capacity_mw) || 0), 0);
        if (active) setParks(rows.map((p) => mapPark(p, maxWater, maxPower)));
      } catch (err) {
        console.error('Failed to load industrial parks:', err);
        if (active) {
          setError('Unable to load industrial parks right now. Please try again later.');
          setParks([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Search matches all fields
  const searchMatches = (p, q) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.district.toLowerCase().includes(s) ||
      p.code.toLowerCase().includes(s) || p.type.toLowerCase().includes(s);
  };

  const filtered = useMemo(() => parks.filter(p => {
    return searchMatches(p, search) && (statusFilter === 'all' || p.status === statusFilter);
  }), [parks, search, statusFilter]);

  // Dropdown suggestions when typing
  const searchSuggestions = useMemo(() => {
    if (!search || search.length < 1) return [];
    return parks.filter(p => searchMatches(p, search));
  }, [parks, search]);

  // Select a park from search
  const handleSearchSelect = (park) => {
    setSelectedPark(park);
    setSearch('');
    setSearchFocused(false);
    setViewMode('map');
  };

  const totals = useMemo(() => ({
    area: parks.reduce((s, p) => s + p.total_area, 0),
    available: parks.reduce((s, p) => s + p.available_area, 0),
    industries: parks.reduce((s, p) => s + p.industries, 0),
    employment: parks.reduce((s, p) => s + p.employment, 0),
  }), [parks]);

  const districtCount = useMemo(() => new Set(parks.map((p) => p.district)).size, [parks]);

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {!isAuthenticated && <UnifiedNav transparent={false} />}

      {/* ── Premium Hero (public view only) ── */}
      {!isAuthenticated ? (
        <PageHero
          icon={<Explore />}
          label="GIS Parks Explorer"
          title="Tamil Nadu"
          titleHighlight="Industrial Parks"
          subtitle={`Interactive map with ${parks.length} parks across ${districtCount} districts. Explore infrastructure, compliance scores, and available land.`}
          accentColor="#2E7D32"
          accentColor2="#1F4E79"
          bgImage="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=60&w=1600"
        >
          {/* KPI stat strip inside hero */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
            {[
              { icon: <SquareFoot sx={{ fontSize: 20 }} />, label: 'Total Land', value: `${totals.area.toLocaleString()} Ac` },
              { icon: <LocationOn sx={{ fontSize: 20 }} />, label: 'Available', value: `${totals.available.toLocaleString()} Ac` },
              { icon: <Factory sx={{ fontSize: 20 }} />, label: 'Industries', value: totals.industries.toLocaleString() },
              { icon: <People sx={{ fontSize: 20 }} />, label: 'Employment', value: totals.employment.toLocaleString() },
            ].map((kpi, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 3, py: 1.5,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease',
                  animation: `${fadeInUp} 0.5s ease-out ${i * 0.08}s both`,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.18)', transform: 'translateY(-3px)' },
                }}
              >
                <Box sx={{ color: '#81C784' }}>{kpi.icon}</Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{kpi.value}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>{kpi.label}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </PageHero>
      ) : (
        /* Compact header for authenticated users inside dashboard */
        <Box sx={{
          background: 'linear-gradient(135deg, #060d1a 0%, #0d2435 50%, #0a1e14 100%)',
          color: 'white',
          pt: { xs: 4, md: 6 }, pb: { xs: 6, md: 8 },
          px: { xs: 2, md: 3 }, position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: '-20%', right: '-5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(46,125,50,0.25) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
            <Chip label="GIS PARKS EXPLORER" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.1em', px: 2, py: 1 }} />
            <Typography variant="h4" fontWeight={900} sx={{ mb: 1, letterSpacing: '-0.02em' }}>
              Tamil Nadu <Box component="span" sx={{ background: 'linear-gradient(90deg, #4CAF50, #81C784)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Industrial Parks</Box>
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, maxWidth: 600, lineHeight: 1.7 }}>
              {parks.length} parks across {districtCount} districts — explore, search, and analyze.
            </Typography>
          </Container>
        </Box>
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
            <CircularProgress sx={{ color: '#1F4E79' }} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>Loading industrial parks…</Typography>
          </Box>
        )}

        {/* Error state */}
        {!loading && error && (
          <Paper sx={{ p: 4, mb: 4, textAlign: 'center', borderRadius: 4, border: '1px solid rgba(211,47,47,0.15)', bgcolor: 'rgba(211,47,47,0.03)' }}>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#d32f2f', mb: 0.5 }}>Could not load parks</Typography>
            <Typography variant="body2" color="text.secondary">{error}</Typography>
          </Paper>
        )}

        {/* Empty state (loaded successfully but no parks returned) */}
        {!loading && !error && parks.length === 0 && (
          <Paper sx={{ p: 4, mb: 4, textAlign: 'center', borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }}>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#0F172A', mb: 0.5 }}>No industrial parks available</Typography>
            <Typography variant="body2" color="text.secondary">There are currently no parks to display.</Typography>
          </Paper>
        )}

        {!loading && (
        <>
        {/* Toolbar */}
        <Paper sx={{
          p: 2.5, mb: 4,
          display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap',
          borderRadius: 4,
          bgcolor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.9)',
        }}>
          {/* Search with live dropdown */}
          <ClickAwayListener onClickAway={() => setSearchFocused(false)}>
            <Box sx={{ flex: 1, minWidth: 220, position: 'relative' }} ref={searchRef}>
              <TextField size="small" fullWidth
                placeholder="Search parks, districts, types... (e.g. Oragadam, IT, Hosur)"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchFocused(true); }}
                onFocus={() => setSearchFocused(true)}
                InputProps={{
                  startAdornment: <InputAdornment position="start" sx={{ color: '#1F4E79' }}><Search /></InputAdornment>,
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setSearch(''); setSearchFocused(false); }}>
                        <Close sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: '#f8fafc',
                    transition: 'all 0.3s ease',
                    '& fieldset': { borderColor: '#e2e8f0' },
                    '&:hover fieldset': { borderColor: '#1F4E79' },
                    '&.Mui-focused fieldset': { borderColor: '#1F4E79', borderWidth: '1.5px' }
                  }
                }}
              />
              {/* Search Results Dropdown */}
              {searchFocused && search && searchSuggestions.length > 0 && (
                <Paper sx={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200,
                  mt: 1, maxHeight: 350, overflow: 'auto',
                  borderRadius: 3.5,
                  boxShadow: '0 16px 48px rgba(31, 78, 121, 0.15)', 
                  border: '1px solid rgba(31, 78, 121, 0.08)',
                  bgcolor: 'white'
                }}>
                  <Typography variant="caption" sx={{ px: 2.5, pt: 2, pb: 0.8, display: 'block', color: 'text.secondary', fontWeight: 700, letterSpacing: '0.02em' }}>
                    {searchSuggestions.length} park{searchSuggestions.length !== 1 ? 's' : ''} found
                  </Typography>
                  <List dense disablePadding>
                    {searchSuggestions.map((park) => (
                      <ListItemButton key={park.id} onClick={() => handleSearchSelect(park)}
                        sx={{ 
                          px: 2.5, py: 1.5, 
                          transition: 'all 0.2s ease',
                          '&:hover': { bgcolor: 'rgba(31, 78, 121, 0.04)' } 
                        }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: STATUS_CONFIG[park.status].color, border: '2px solid white', boxShadow: 1 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight={800} color="#0F172A">{park.name}</Typography>
                              <Chip label={park.code} size="small" variant="outlined" 
                                sx={{ 
                                  height: 18, fontSize: '0.65rem', fontWeight: 700, 
                                  color: '#1F4E79', borderColor: 'rgba(31,78,121,0.2)' 
                                }} 
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                              {park.district} | {park.type} | {park.industries} industries | Score: {park.score}/100
                            </Typography>
                          }
                        />
                        <Box sx={{ textAlign: 'right', ml: 1 }}>
                          <Typography variant="caption" fontWeight={800} color="primary" sx={{ display: 'block' }}>{park.available_area.toLocaleString()} ac</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>available</Typography>
                        </Box>
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              )}
              {searchFocused && search && searchSuggestions.length === 0 && (
                <Paper sx={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200,
                  mt: 1, p: 3, textAlign: 'center',
                  borderRadius: 3.5,
                  boxShadow: '0 16px 48px rgba(31, 78, 121, 0.12)', 
                  border: '1px solid rgba(31, 78, 121, 0.08)',
                  bgcolor: 'white'
                }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>No parks found for "{search}"</Typography>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>Try: Oragadam, Hosur, IT, Manufacturing, Kancheepuram</Typography>
                </Paper>
              )}
            </Box>
          </ClickAwayListener>

          <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(e, v) => v && setStatusFilter(v)}
            sx={{
              bgcolor: '#f1f5f9',
              p: 0.5,
              borderRadius: 3,
              border: 'none',
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 2.5,
                px: 2,
                py: 0.75,
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'none',
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'white' }
                }
              }
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="active" sx={{ '&.Mui-selected': { color: '#2E7D32 !important' } }}>Active</ToggleButton>
            <ToggleButton value="developing" sx={{ '&.Mui-selected': { color: '#F57C00 !important' } }}>Developing</ToggleButton>
            <ToggleButton value="proposed" sx={{ '&.Mui-selected': { color: '#1565C0 !important' } }}>Proposed</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}
            sx={{
              bgcolor: '#f1f5f9',
              p: 0.5,
              borderRadius: 3,
              border: 'none',
              ml: { xs: 0, sm: 'auto' },
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 2.5,
                p: 0.75,
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  color: '#1F4E79',
                  '&:hover': { bgcolor: 'white' }
                }
              }
            }}
          >
            <ToggleButton value="map"><Tooltip title="GIS Map"><MapIcon sx={{ fontSize: 20 }} /></Tooltip></ToggleButton>
            <ToggleButton value="table"><Tooltip title="Table View"><TableChart sx={{ fontSize: 20 }} /></Tooltip></ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        {/* GIS MAP VIEW */}
        {viewMode === 'map' && (
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid size={{ xs: 12, md: selectedPark ? 7 : 12 }}>
              <Paper sx={{ 
                borderRadius: 4.5, 
                overflow: 'hidden', 
                position: 'relative',
                boxShadow: '0 16px 40px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.06)'
              }}>
                {/* Map Layer Controls */}
                <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                    <Button key={key} size="small" variant={tileLayer === key ? 'contained' : 'outlined'}
                      onClick={() => setTileLayer(key)}
                      sx={{ 
                        bgcolor: tileLayer === key ? '#1F4E79' : 'white', 
                        color: tileLayer === key ? 'white' : '#1F4E79',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)', 
                        minWidth: 'auto', px: 2, py: 0.6, fontSize: '0.72rem', fontWeight: 700, borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': { bgcolor: tileLayer === key ? '#143656' : '#f8fafc', transform: 'translate3d(0, -1px, 0)' } 
                      }}>
                      {layer.name}
                    </Button>
                  ))}
                </Box>

                {/* Availability Toggle */}
                <Box sx={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000 }}>
                  <Paper sx={{ p: 2, borderRadius: 3.5, display: 'flex', flexDirection: 'column', gap: 1, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <Typography variant="caption" fontWeight={800} sx={{ letterSpacing: '0.04em', textTransform: 'uppercase', color: '#1F4E79' }}>Map Overlays</Typography>
                    <FormControlLabel control={<Switch size="small" checked={showAvailability} onChange={(e) => setShowAvailability(e.target.checked)} />}
                      label={<Typography variant="caption" sx={{ fontWeight: 600 }}>Show Plot Availability</Typography>} sx={{ m: 0 }} />
                    <Divider sx={{ my: 0.5 }} />
                    <Typography variant="caption" fontWeight={800} sx={{ letterSpacing: '0.04em', textTransform: 'uppercase', color: '#1F4E79' }}>Legend</Typography>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cfg.color, boxShadow: `0 1px 4px ${cfg.color}50` }} />
                        <Typography variant="caption" sx={{ fontWeight: 550, color: 'text.secondary' }}>{cfg.label}</Typography>
                      </Box>
                    ))}
                  </Paper>
                </Box>

                <MapContainer
                  center={TN_CENTER}
                  zoom={TN_ZOOM}
                  style={{ height: selectedPark ? 520 : 560, width: '100%' }}
                  zoomControl={true}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url={TILE_LAYERS[tileLayer].url}
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <ResetView />
                  <FlyToMarker park={selectedPark} />

                  {filtered.map((park) => {
                    const isSelected = selectedPark?.id === park.id;
                    const radius = Math.max(8, Math.min(22, park.industries / 10 + 5));
                    return (
                      <CircleMarker
                        key={park.id}
                        center={[park.lat, park.lng]}
                        radius={radius}
                        pathOptions={{
                          color: isSelected ? '#F57C00' : 'white',
                          weight: isSelected ? 3 : 2,
                          fillColor: STATUS_CONFIG[park.status].color,
                          fillOpacity: isSelected ? 1 : 0.85,
                        }}
                        eventHandlers={{ click: () => setSelectedPark(park) }}
                      >
                        <LeafletTooltip direction="top" offset={[0, -radius]} opacity={0.95} permanent={false}>
                          <Box sx={{ minWidth: 180, p: 0.5 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 0.3 }}>{park.name}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{park.type} | {park.district}</Typography>
                            <Divider sx={{ my: 0.5 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography sx={{ fontSize: '0.7rem' }}>Industries: <b>{park.industries}</b></Typography>
                              <Typography sx={{ fontSize: '0.7rem' }}>Score: <b>{park.score}</b></Typography>
                            </Box>
                            {showAvailability && (
                              <Typography sx={{ fontSize: '0.7rem', color: '#2E7D32', mt: 0.3 }}>
                                Available: <b>{park.available_area} acres</b>
                              </Typography>
                            )}
                          </Box>
                        </LeafletTooltip>

                        {/* Availability ring overlay */}
                        {showAvailability && (
                          <Popup>
                            <Box sx={{ minWidth: 200 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{park.name}</Typography>
                              <Typography sx={{ fontSize: '0.75rem', color: '#666', mb: 1 }}>{park.district}</Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <span style={{ fontSize: '0.75rem' }}>Total Area:</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{park.total_area.toLocaleString()} ac</span>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <span style={{ fontSize: '0.75rem' }}>Available:</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E7D32' }}>{park.available_area.toLocaleString()} ac</span>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.75rem' }}>Occupancy:</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{Math.round((1 - park.available_area / park.total_area) * 100)}%</span>
                              </Box>
                            </Box>
                          </Popup>
                        )}
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </Paper>
            </Grid>

            {/* Detail Side Panel */}
            {selectedPark && (
              <Grid size={{ xs: 12, md: 5 }}>
                <Paper sx={{ 
                  p: { xs: 2.5, sm: 3.5 }, 
                  borderRadius: 4.5, 
                  height: '100%', 
                  borderTop: `4px solid ${STATUS_CONFIG[selectedPark.status].color}`, 
                  position: 'relative',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.06)'
                }}>
                  <Button size="small" sx={{ position: 'absolute', top: 12, right: 12, minWidth: 'auto', p: 0.5 }}
                    onClick={() => setSelectedPark(null)}><Close /></Button>

                  <Chip label={STATUS_CONFIG[selectedPark.status].label} size="small"
                    sx={{ bgcolor: STATUS_CONFIG[selectedPark.status].bg, color: STATUS_CONFIG[selectedPark.status].color, fontWeight: 800, mb: 1.5, borderRadius: 2 }} />
                  <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5, color: '#0F172A' }}>{selectedPark.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 550 }}>{selectedPark.district} District | {selectedPark.type}</Typography>

                  {/* Basic info - visible to everyone */}
                  <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mt: 1, mb: 3 }}>
                    {[
                      { label: 'Total Area', value: `${selectedPark.total_area.toLocaleString()} ac`, icon: <SquareFoot sx={{ fontSize: 16 }} />, color: '#1F4E79' },
                      { label: 'Industries', value: selectedPark.industries, icon: <Factory sx={{ fontSize: 16 }} />, color: '#2E7D32' },
                      { label: 'Available Plots', value: `${selectedPark.available_area.toLocaleString()} ac`, icon: <LocationOn sx={{ fontSize: 16 }} />, color: '#2E7D32' },
                      { label: 'Occupancy', value: `${Math.round((1 - selectedPark.available_area / selectedPark.total_area) * 100)}%`, icon: <Layers sx={{ fontSize: 16 }} />, color: '#1F4E79' },
                    ].map((m, i) => (
                      <Grid key={i} size={{ xs: 6 }}>
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: '#f8fafc', 
                          borderRadius: 3, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          border: '1px solid #f1f5f9',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translate3d(0, -2px, 0)',
                            bgcolor: 'white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                            borderColor: 'rgba(31,78,121,0.12)'
                          }
                        }}>
                          <Box sx={{ color: m.color, display: 'flex' }}>{m.icon}</Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.3 }}>{m.label}</Typography>
                            <Typography variant="body2" fontWeight={800}>{m.value}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Detailed info - only for authenticated users */}
                  {isAuthenticated ? (
                    <>
                      <Divider sx={{ mb: 2.5 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Infra Score:</Typography>
                        <ScoreChip score={selectedPark.score} />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontWeight: 550 }}>
                          {selectedPark.lat.toFixed(3)}, {selectedPark.lng.toFixed(3)}
                        </Typography>
                      </Box>

                      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
                        {[
                          { label: 'Investment', value: `Rs.${selectedPark.investment.toLocaleString()} Cr`, icon: <CurrencyRupee sx={{ fontSize: 16 }} />, color: '#E65100' },
                          { label: 'Employment', value: selectedPark.employment.toLocaleString(), icon: <People sx={{ fontSize: 16 }} />, color: '#00838F' },
                        ].map((m, i) => (
                          <Grid key={i} size={{ xs: 6 }}>
                            <Box sx={{ 
                              p: 2, 
                              bgcolor: '#f8fafc', 
                              borderRadius: 3, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1.5,
                              border: '1px solid #f1f5f9',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translate3d(0, -2px, 0)',
                                bgcolor: 'white',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                                borderColor: 'rgba(31,78,121,0.12)'
                              }
                            }}>
                              <Box sx={{ color: m.color, display: 'flex' }}>{m.icon}</Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', mb: 0.3 }}>{m.label}</Typography>
                                <Typography variant="body2" fontWeight={800}>{m.value}</Typography>
                              </Box>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>

                      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: '#0F172A', letterSpacing: '0.02em' }}>Infrastructure Utilization</Typography>
                      <InfraBar label="Water Capacity" value={selectedPark.water_pct} icon={<Water sx={{ fontSize: 16, color: '#1565C0' }} />} />
                      <InfraBar label="Power Grid" value={selectedPark.power_pct} icon={<Bolt sx={{ fontSize: 16, color: '#F57C00' }} />} />

                      <Divider sx={{ my: 3 }} />
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
                        <Button 
                          variant="contained" 
                          size="medium" 
                          fullWidth 
                          onClick={() => navigate('/services', { state: { parkId: selectedPark.id, serviceType: 'land_allotment' } })}
                          sx={{
                            borderRadius: 2.5,
                            py: 1.2,
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #1F4E79, #2E7D32)',
                            boxShadow: '0 6px 16px rgba(31,78,121,0.2)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translate3d(0, -2px, 0)',
                              boxShadow: '0 10px 24px rgba(31,78,121,0.3)'
                            }
                          }}
                        >
                          Apply for Plot
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="medium" 
                          fullWidth 
                          onClick={() => navigate('/report-center')}
                          sx={{
                            borderRadius: 2.5,
                            py: 1.2,
                            fontWeight: 800,
                            borderColor: '#1F4E79',
                            color: '#1F4E79',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translate3d(0, -2px, 0)',
                              borderColor: '#1F4E79',
                              bgcolor: 'rgba(31,78,121,0.04)'
                            }
                          }}
                        >
                          Full Analytics
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Paper sx={{
                        p: 4,
                        bgcolor: 'rgba(31, 78, 121, 0.02)',
                        borderRadius: 4.5,
                        border: '1px solid rgba(31, 78, 121, 0.1)',
                        textAlign: 'center',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)'
                      }}>
                        <LockIcon sx={{ color: '#1F4E79', fontSize: 32, mb: 1.5 }} />
                        <Typography variant="body1" fontWeight={850} sx={{ color: '#1F4E79', mb: 1 }}>
                          Detailed Analytics Locked
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3, px: 1.5, lineHeight: 1.6, fontWeight: 550, fontSize: '0.8rem' }}>
                          Investment data, employment statistics, infrastructure metrics, and plot applications require secure authentication.
                        </Typography>
                        <Button variant="contained" size="large" fullWidth onClick={() => navigate('/role-selection')}
                          sx={{
                            borderRadius: 2.5, py: 1.6, fontWeight: 800,
                            background: 'linear-gradient(135deg, #1F4E79, #2E7D32)',
                            boxShadow: '0 8px 24px rgba(31,78,121,0.25)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translate3d(0, -2px, 0)',
                              boxShadow: '0 12px 32px rgba(31,78,121,0.35)'
                            }
                          }}>
                          Login to THOZHIRPORUL
                        </Button>
                      </Paper>
                    </>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f8fafc', color: '#475569', fontWeight: 800, borderBottom: '2px solid #e2e8f0', py: 2.2 } }}>
                    <TableCell>Park</TableCell>
                    <TableCell>District</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Area (Acres)</TableCell>
                    <TableCell align="right">Available</TableCell>
                    <TableCell align="right">Industries</TableCell>
                    {isAuthenticated && <TableCell align="right">Investment (Cr)</TableCell>}
                    {isAuthenticated && <TableCell>Infra Score</TableCell>}
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((park) => (
                    <TableRow key={park.id} hover 
                      onClick={() => { setSelectedPark(park); setViewMode('map'); }}
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(31, 78, 121, 0.03) !important',
                        }
                      }}>
                      <TableCell sx={{ py: 2.2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_CONFIG[park.status].color, flexShrink: 0, boxShadow: `0 1px 4px ${STATUS_CONFIG[park.status].color}40` }} />
                          <Box>
                            <Typography variant="body2" fontWeight={800} color="#0F172A">{park.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 550 }}>{park.type}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2.2, fontWeight: 550 }}>{park.district}</TableCell>
                      <TableCell sx={{ py: 2.2 }}><Chip label={STATUS_CONFIG[park.status].label} size="small" sx={{ bgcolor: STATUS_CONFIG[park.status].bg, color: STATUS_CONFIG[park.status].color, fontWeight: 750, borderRadius: 2 }} /></TableCell>
                      <TableCell align="right" sx={{ py: 2.2, fontWeight: 600 }}>{park.total_area.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ py: 2.2, fontWeight: 700, color: park.available_area > 500 ? '#2E7D32' : 'inherit' }}>{park.available_area.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ py: 2.2, fontWeight: 600 }}>{park.industries}</TableCell>
                      {isAuthenticated && <TableCell align="right" sx={{ py: 2.2, fontWeight: 700, color: 'text.primary' }}>{park.investment.toLocaleString()}</TableCell>}
                      {isAuthenticated && <TableCell sx={{ py: 2.2 }}><ScoreChip score={park.score} /></TableCell>}
                      <TableCell sx={{ py: 2.2 }}><Button size="small" endIcon={<ArrowForwardIos sx={{ fontSize: 10 }} />} sx={{ fontWeight: 700 }}>View on Map</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
        </>
        )}
      </Container>
      {!isAuthenticated && <UnifiedFooter />}
    </Box>
  );
}
