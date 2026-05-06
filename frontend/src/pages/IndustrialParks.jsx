import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Card, CardContent, Button, Chip,
  Paper, TextField, InputAdornment, ToggleButton, ToggleButtonGroup,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Divider, Tooltip, Switch, FormControlLabel,
  List, ListItemButton, ListItemIcon, ListItemText, ClickAwayListener, Popper, IconButton
} from '@mui/material';
import {
  Search, Map as MapIcon, TableChart, LocationOn,
  Water, Bolt, ArrowForwardIos, Explore, Layers,
  SquareFoot, Factory, People, CurrencyRupee, MyLocation, Close, ArrowBack, Home, Lock as LockIcon
} from '@mui/icons-material';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const PARKS = [
  { id: 1, name: 'Oragadam Industrial Park', code: 'ORGDM', district: 'Kancheepuram', total_area: 2500, available_area: 340, status: 'active', score: 94, industries: 187, investment: 4200, employment: 23400, water_pct: 78, power_pct: 85, type: 'Automobile & Aerospace', lat: 12.795, lng: 79.988 },
  { id: 2, name: 'Sriperumbudur Industrial Park', code: 'SRPBR', district: 'Kancheepuram', total_area: 1800, available_area: 220, status: 'active', score: 91, industries: 156, investment: 3800, employment: 19800, water_pct: 82, power_pct: 88, type: 'Electronics & Manufacturing', lat: 12.972, lng: 79.941 },
  { id: 3, name: 'Hosur Industrial Park', code: 'HOSUR', district: 'Krishnagiri', total_area: 2100, available_area: 280, status: 'active', score: 88, industries: 143, investment: 3200, employment: 18500, water_pct: 70, power_pct: 80, type: 'Diversified Manufacturing', lat: 12.741, lng: 77.825 },
  { id: 4, name: 'Siruseri IT Park', code: 'SIRUS', district: 'Chengalpattu', total_area: 800, available_area: 50, status: 'active', score: 92, industries: 95, investment: 5600, employment: 42000, water_pct: 60, power_pct: 75, type: 'IT & Software', lat: 12.823, lng: 80.222 },
  { id: 5, name: 'Gangaikondan Industrial Park', code: 'GNGKN', district: 'Tirunelveli', total_area: 1200, available_area: 600, status: 'active', score: 72, industries: 34, investment: 850, employment: 4200, water_pct: 45, power_pct: 50, type: 'Chemicals & Processing', lat: 8.567, lng: 77.791 },
  { id: 6, name: 'Vallam-Vadagal Industrial Park', code: 'VLMVD', district: 'Kancheepuram', total_area: 950, available_area: 550, status: 'developing', score: 65, industries: 18, investment: 420, employment: 2100, water_pct: 30, power_pct: 40, type: 'Mixed Use', lat: 12.750, lng: 79.890 },
  { id: 7, name: 'Pillaipakkam Industrial Park', code: 'PLLPK', district: 'Kancheepuram', total_area: 700, available_area: 350, status: 'developing', score: 58, industries: 12, investment: 280, employment: 1400, water_pct: 25, power_pct: 35, type: 'Light Manufacturing', lat: 12.680, lng: 79.920 },
  { id: 8, name: 'Cheyyar Industrial Park', code: 'CHEYR', district: 'Tiruvannamalai', total_area: 1500, available_area: 1200, status: 'proposed', score: 35, industries: 5, investment: 120, employment: 600, water_pct: 15, power_pct: 20, type: 'Future Development', lat: 12.662, lng: 79.544 },
];

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
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('map');
  const [selectedPark, setSelectedPark] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tileLayer, setTileLayer] = useState('street');
  const [showAvailability, setShowAvailability] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const isAuthenticated = !!localStorage.getItem('token');

  // Search matches all fields
  const searchMatches = (p, q) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.district.toLowerCase().includes(s) ||
      p.code.toLowerCase().includes(s) || p.type.toLowerCase().includes(s);
  };

  const filtered = useMemo(() => PARKS.filter(p => {
    return searchMatches(p, search) && (statusFilter === 'all' || p.status === statusFilter);
  }), [search, statusFilter]);

  // Dropdown suggestions when typing
  const searchSuggestions = useMemo(() => {
    if (!search || search.length < 1) return [];
    return PARKS.filter(p => searchMatches(p, search));
  }, [search]);

  // Select a park from search
  const handleSearchSelect = (park) => {
    setSelectedPark(park);
    setSearch('');
    setSearchFocused(false);
    setViewMode('map');
  };

  const totals = {
    area: PARKS.reduce((s, p) => s + p.total_area, 0),
    available: PARKS.reduce((s, p) => s + p.available_area, 0),
    industries: PARKS.reduce((s, p) => s + p.industries, 0),
    employment: PARKS.reduce((s, p) => s + p.employment, 0),
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Hero Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1F4E79 100%)',
        color: 'white', pt: isAuthenticated ? { xs: 2, md: 4 } : { xs: 8, md: 14 }, pb: { xs: 3, md: 5 }, px: { xs: 1.5, sm: 2, md: 3 },
      }}>
        <Container maxWidth="lg">
          {/* Back to Home */}
          {!isAuthenticated && (
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/home')}
              sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.08)' } }}>
              Back to Home
            </Button>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Explore sx={{ fontSize: 28, color: '#4CAF50' }} />
            <Typography variant="overline" fontWeight={800} letterSpacing={3}>GIS INDUSTRIAL PARKS EXPLORER</Typography>
          </Box>
          <Typography variant="h3" fontWeight={900} sx={{ mb: 1, letterSpacing: '-0.02em', fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' } }}>
            Tamil Nadu's Industrial Landscape
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.7, fontWeight: 300, mb: 3, maxWidth: 700 }}>
            Interactive map with {PARKS.length} parks across {new Set(PARKS.map(p => p.district)).size} districts. Click any marker to explore.
          </Typography>

          <Grid container spacing={{ xs: 1, sm: 2 }}>
            {[
              { icon: <SquareFoot />, label: 'Total Land', value: `${totals.area.toLocaleString()} Acres` },
              { icon: <LocationOn />, label: 'Available', value: `${totals.available.toLocaleString()} Acres` },
              { icon: <Factory />, label: 'Industries', value: totals.industries.toLocaleString() },
              { icon: <People />, label: 'Employment', value: totals.employment.toLocaleString() },
            ].map((kpi, i) => (
              <Grid key={i} size={{ xs: 6, sm: 3 }}>
                <Paper sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, textAlign: 'center' }}>
                  <Box sx={{ color: '#4CAF50', mb: 0.5 }}>{kpi.icon}</Box>
                  <Typography variant="h5" fontWeight={800} color="white">{kpi.value}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{kpi.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Toolbar */}
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderRadius: 3 }}>
          {/* Search with live dropdown */}
          <ClickAwayListener onClickAway={() => setSearchFocused(false)}>
            <Box sx={{ flex: 1, minWidth: 220, position: 'relative' }} ref={searchRef}>
              <TextField size="small" fullWidth
                placeholder="Search parks, districts, types... (e.g. Oragadam, IT, Hosur)"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchFocused(true); }}
                onFocus={() => setSearchFocused(true)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setSearch(''); setSearchFocused(false); }}>
                        <Close sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {/* Search Results Dropdown */}
              {searchFocused && search && searchSuggestions.length > 0 && (
                <Paper sx={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200,
                  mt: 0.5, maxHeight: 320, overflow: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0',
                }}>
                  <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}>
                    {searchSuggestions.length} park{searchSuggestions.length !== 1 ? 's' : ''} found
                  </Typography>
                  <List dense disablePadding>
                    {searchSuggestions.map((park) => (
                      <ListItemButton key={park.id} onClick={() => handleSearchSelect(park)}
                        sx={{ px: 2, py: 1, '&:hover': { bgcolor: '#f0f7ff' } }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: STATUS_CONFIG[park.status].color, border: '2px solid white', boxShadow: 1 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight={700}>{park.name}</Typography>
                              <Chip label={park.code} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {park.district} | {park.type} | {park.industries} industries | Score: {park.score}/100
                            </Typography>
                          }
                        />
                        <Box sx={{ textAlign: 'right', ml: 1 }}>
                          <Typography variant="caption" fontWeight={700} color="primary">{park.available_area.toLocaleString()} ac</Typography>
                          <Typography variant="caption" display="block" color="text.secondary">available</Typography>
                        </Box>
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              )}
              {searchFocused && search && searchSuggestions.length === 0 && (
                <Paper sx={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200,
                  mt: 0.5, p: { xs: 2, sm: 3 }, textAlign: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0',
                }}>
                  <Typography variant="body2" color="text.secondary">No parks found for "{search}"</Typography>
                  <Typography variant="caption" color="text.disabled">Try: Oragadam, Hosur, IT, Manufacturing, Kancheepuram</Typography>
                </Paper>
              )}
            </Box>
          </ClickAwayListener>

          <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(e, v) => v && setStatusFilter(v)}>
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="active" sx={{ color: '#2E7D32' }}>Active</ToggleButton>
            <ToggleButton value="developing" sx={{ color: '#F57C00' }}>Developing</ToggleButton>
            <ToggleButton value="proposed" sx={{ color: '#1565C0' }}>Proposed</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}>
            <ToggleButton value="map"><Tooltip title="GIS Map"><MapIcon /></Tooltip></ToggleButton>
            <ToggleButton value="table"><Tooltip title="Table View"><TableChart /></Tooltip></ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        {/* GIS MAP VIEW */}
        {viewMode === 'map' && (
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid size={{ xs: 12, md: selectedPark ? 7 : 12 }}>
              <Paper sx={{ borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                {/* Map Layer Controls */}
                <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                    <Button key={key} size="small" variant={tileLayer === key ? 'contained' : 'outlined'}
                      onClick={() => setTileLayer(key)}
                      sx={{ bgcolor: tileLayer === key ? '#1F4E79' : 'white', color: tileLayer === key ? 'white' : '#1F4E79',
                        boxShadow: 2, minWidth: 'auto', px: 1.5, fontSize: '0.7rem', '&:hover': { bgcolor: tileLayer === key ? '#143656' : '#f0f4f8' } }}>
                      {layer.name}
                    </Button>
                  ))}
                </Box>

                {/* Availability Toggle */}
                <Box sx={{ position: 'absolute', bottom: 10, left: 10, zIndex: 1000 }}>
                  <Paper sx={{ p: 1, px: 1.5, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" fontWeight={700}>Map Overlays</Typography>
                    <FormControlLabel control={<Switch size="small" checked={showAvailability} onChange={(e) => setShowAvailability(e.target.checked)} />}
                      label={<Typography variant="caption">Show Plot Availability</Typography>} sx={{ m: 0 }} />
                    <Divider />
                    <Typography variant="caption" fontWeight={700} sx={{ mt: 0.5 }}>Legend</Typography>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cfg.color }} />
                        <Typography variant="caption">{cfg.label}</Typography>
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
                <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, height: '100%', borderTop: `4px solid ${STATUS_CONFIG[selectedPark.status].color}`, position: 'relative' }}>
                  <Button size="small" sx={{ position: 'absolute', top: 8, right: 8, minWidth: 'auto', p: 0.5 }}
                    onClick={() => setSelectedPark(null)}><Close /></Button>

                  <Chip label={STATUS_CONFIG[selectedPark.status].label} size="small"
                    sx={{ bgcolor: STATUS_CONFIG[selectedPark.status].bg, color: STATUS_CONFIG[selectedPark.status].color, fontWeight: 700, mb: 1 }} />
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>{selectedPark.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{selectedPark.district} District | {selectedPark.type}</Typography>

                  {/* Basic info - visible to everyone */}
                  <Grid container spacing={{ xs: 1, sm: 1.5 }} sx={{ mt: 2, mb: 2 }}>
                    {[
                      { label: 'Total Area', value: `${selectedPark.total_area.toLocaleString()} ac`, icon: <SquareFoot sx={{ fontSize: 16 }} />, color: '#1F4E79' },
                      { label: 'Industries', value: selectedPark.industries, icon: <Factory sx={{ fontSize: 16 }} />, color: '#7B1FA2' },
                      { label: 'Available Plots', value: `${selectedPark.available_area.toLocaleString()} ac`, icon: <LocationOn sx={{ fontSize: 16 }} />, color: '#2E7D32' },
                      { label: 'Occupancy', value: `${Math.round((1 - selectedPark.available_area / selectedPark.total_area) * 100)}%`, icon: <Layers sx={{ fontSize: 16 }} />, color: '#455A64' },
                    ].map((m, i) => (
                      <Grid key={i} size={{ xs: 6 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: m.color }}>{m.icon}</Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block' }}>{m.label}</Typography>
                            <Typography variant="body2" fontWeight={700}>{m.value}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Detailed info - only for authenticated users */}
                  {isAuthenticated ? (
                    <>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">Infra Score:</Typography>
                        <ScoreChip score={selectedPark.score} />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {selectedPark.lat.toFixed(3)}, {selectedPark.lng.toFixed(3)}
                        </Typography>
                      </Box>

                      <Grid container spacing={{ xs: 1, sm: 1.5 }} sx={{ mb: 2.5 }}>
                        {[
                          { label: 'Investment', value: `Rs.${selectedPark.investment.toLocaleString()} Cr`, icon: <CurrencyRupee sx={{ fontSize: 16 }} />, color: '#E65100' },
                          { label: 'Employment', value: selectedPark.employment.toLocaleString(), icon: <People sx={{ fontSize: 16 }} />, color: '#00838F' },
                        ].map((m, i) => (
                          <Grid key={i} size={{ xs: 6 }}>
                            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ color: m.color }}>{m.icon}</Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block' }}>{m.label}</Typography>
                                <Typography variant="body2" fontWeight={700}>{m.value}</Typography>
                              </Box>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>

                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Infrastructure Utilization</Typography>
                      <InfraBar label="Water Capacity" value={selectedPark.water_pct} icon={<Water sx={{ fontSize: 16, color: '#1565C0' }} />} />
                      <InfraBar label="Power Grid" value={selectedPark.power_pct} icon={<Bolt sx={{ fontSize: 16, color: '#F57C00' }} />} />

                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button variant="contained" size="small" fullWidth onClick={() => navigate('/services', { state: { parkId: selectedPark.id, serviceType: 'land_allotment' } })}>Apply for Plot</Button>
                        <Button variant="outlined" size="small" fullWidth onClick={() => navigate('/report-center')}>Full Analytics</Button>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Paper sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #dbeafe', textAlign: 'center' }}>
                        <LockIcon sx={{ color: '#1F4E79', mb: 0.5 }} />
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Login for detailed analytics</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                          Investment data, employment stats, infrastructure metrics, and plot applications require authentication.
                        </Typography>
                        <Button variant="contained" size="small" fullWidth onClick={() => navigate('/role-selection')}
                          sx={{ borderRadius: 2 }}>
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
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#1F4E79', color: 'white', fontWeight: 700 } }}>
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
                    <TableRow key={park.id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelectedPark(park); setViewMode('map'); }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_CONFIG[park.status].color, flexShrink: 0 }} />
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{park.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{park.type}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{park.district}</TableCell>
                      <TableCell><Chip label={STATUS_CONFIG[park.status].label} size="small" sx={{ bgcolor: STATUS_CONFIG[park.status].bg, color: STATUS_CONFIG[park.status].color, fontWeight: 600 }} /></TableCell>
                      <TableCell align="right">{park.total_area.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: park.available_area > 500 ? '#2E7D32' : 'inherit' }}>{park.available_area.toLocaleString()}</TableCell>
                      <TableCell align="right">{park.industries}</TableCell>
                      {isAuthenticated && <TableCell align="right">{park.investment.toLocaleString()}</TableCell>}
                      {isAuthenticated && <TableCell><ScoreChip score={park.score} /></TableCell>}
                      <TableCell><Button size="small" endIcon={<ArrowForwardIos sx={{ fontSize: 10 }} />}>View on Map</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
