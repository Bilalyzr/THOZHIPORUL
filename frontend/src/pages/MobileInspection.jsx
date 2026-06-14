import { Box, Typography, Paper, TextField, Button, Grid, IconButton } from '@mui/material';
import { PhotoCamera, LocationOn, UploadFile } from '@mui/icons-material';

export default function MobileInspection() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <LocationOn sx={{ mr: 1, color: 'error.main' }} /> Field Inspection
      </Typography>
      
      <Paper sx={{ p: 2, mt: 2, borderTop: '4px solid #1976d2' }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Inspection Report</Typography>
        <Grid container spacing={2}>
           <Grid size={{ xs: 12 }}>
             <TextField fullWidth label="Industry / Unit Name" size="small" />
           </Grid>
           <Grid size={{ xs: 12 }}>
             <TextField fullWidth select label="Inspection Type" size="small" SelectProps={{ native: true }}>
               <option>Environmental</option>
               <option>Safety & Fire</option>
               <option>Construction</option>
             </TextField>
           </Grid>
           <Grid size={{ xs: 12 }}>
             <TextField fullWidth label="Inspector Notes" multiline rows={4} size="small" />
           </Grid>
        </Grid>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
           <Typography variant="body2" color="text.secondary" gutterBottom>Evidence Upload</Typography>
           <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
             <IconButton color="primary" component="label" sx={{ border: '1px solid', p: 2 }}>
               <input hidden accept="image/*" type="file" />
               <PhotoCamera fontSize="large" />
             </IconButton>
             <IconButton color="secondary" component="label" sx={{ border: '1px solid', p: 2 }}>
               <input hidden accept="application/pdf" type="file" />
               <UploadFile fontSize="large" />
             </IconButton>
           </Box>
        </Box>

        <Button variant="contained" fullWidth size="large" sx={{ mt: 3 }}>
          Submit Report
        </Button>
      </Paper>
    </Box>
  );
}
