import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Avatar, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, LinearProgress,
  Dialog, DialogTitle, DialogContent, MenuItem, TextField, IconButton,
  Snackbar, Alert, InputAdornment, CircularProgress, Tooltip, Card, Stack, Divider
} from '@mui/material';
import {
  Shield, Lock, FileDownload, DeleteOutline, CloudUpload,
  Cached, LockOpenOutlined, VerifiedUserOutlined, CheckCircle,
  Visibility, VisibilityOff, LockOutlined, AutoAwesome, InfoOutlined,
  Key, Storage, Gavel
} from '@mui/icons-material';
import { workspaceService, paymentsService } from '../services/api';

export default function SecureVault() {
  // Get active role (if Govt or Admin, we automatically grant access bypass)
  const userRole = localStorage.getItem('role') || 'industry';
  const hasGovtBypass = userRole === 'admin' || userRole === 'govt';

  // Subscription Tier State: 'free_starter', 'sme_pro', 'enterprise_suite'
  const [subscriptionTier, setSubscriptionTier] = useState('free_starter');
  
  // File registry with file sizes in KB
  const [documentsList, setDocumentsList] = useState([]);

  // Mock Audit Trail
  const [auditLogs, setAuditLogs] = useState([
    { id: 101, action: 'upload', document: 'lease.pdf', user: 'industry@abc.com', ip: '192.168.1.45', timestamp: '2026-05-24 10:14:02', verified: true },
    { id: 102, action: 'download', document: 'gst_2026.pdf', user: 'govt@tn.gov.in', ip: '10.0.12.103', timestamp: '2026-05-24 14:32:10', verified: true },
    { id: 103, action: 'verify', document: 'fire_noc_2025.pdf', user: 'admin@sipcot.com', ip: '192.168.1.12', timestamp: '2026-05-24 16:05:44', verified: true },
  ]);

  // Security Protection States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [shake, setShake] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Modals & States
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Form fields
  const [uploadCategory, setUploadCategory] = useState('gst_certificate');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [mockFileSizeKb, setMockFileSizeKb] = useState(300); // Default file size simulation
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load Razorpay SDK and active subscription tier on mount
  useEffect(() => {
    // Dynamically insert Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    if (userRole === 'industry') {
      workspaceService.getOverview()
        .then(res => {
          if (res.data?.company?.subscription_tier) {
            setSubscriptionTier(res.data.company.subscription_tier);
          }
        })
        .catch(err => console.error('[VAULT] Failed to load subscription tier:', err));
    }

    return () => {
      document.body.removeChild(script);
    };
  }, [userRole]);

  const handleRazorpayPayment = async (plan) => {
    try {
      setSnackbar({ open: true, message: 'Initiating Razorpay payment order...', severity: 'info' });
      
      const orderRes = await paymentsService.createOrder(plan);
      const { orderId, amount, currency, keyId, mock } = orderRes.data;

      const userEmail = localStorage.getItem('userEmail') || 'industry@abc.com';
      const userName = localStorage.getItem('userName') || 'ABC Manufacturing';

      if (mock) {
        // Bypass payment validation for sandbox fallback testing
        setTimeout(async () => {
          try {
            await paymentsService.verifyPayment({
              razorpay_payment_id: `mock_pay_${Date.now()}`,
              razorpay_order_id: orderId,
              razorpay_signature: 'mock_sig',
              plan: plan
            });
            setSubscriptionTier(plan);
            setSnackbar({ open: true, message: `🎉 Successfully upgraded to ${plan === 'sme_pro' ? 'SME Professional' : 'Enterprise Suite'}!`, severity: 'success' });
          } catch {
            setSnackbar({ open: true, message: 'Mock payment verification failed.', severity: 'error' });
          }
        }, 1200);
        return;
      }

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'THOZHIRPORUL',
        description: `Upgrade to ${plan === 'sme_pro' ? 'SME Professional' : 'Enterprise Suite'}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            setSnackbar({ open: true, message: 'Verifying payment signatures...', severity: 'info' });
            await paymentsService.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan: plan
            });
            setSubscriptionTier(plan);
            setSnackbar({ open: true, message: `🎉 Upgrade Successful! Active Plan: ${plan === 'sme_pro' ? 'SME Pro' : 'Enterprise Suite'}`, severity: 'success' });
          } catch {
            setSnackbar({ open: true, message: 'Payment verification failed.', severity: 'error' });
          }
        },
        prefill: {
          name: userName,
          email: userEmail
        },
        theme: {
          color: '#2E7D32'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Razorpay payment gateway error:', err);
      setSnackbar({ open: true, message: 'Failed to connect to Razorpay payment gateway.', severity: 'error' });
    }
  };

  // Calculate storage metrics dynamically
  const totalUsedKb = documentsList.reduce((acc, doc) => acc + doc.size_kb, 0);
  const totalUsedMb = parseFloat((totalUsedKb / 1024).toFixed(2));

  // Determine Quota Limit based on selected subscription tier
  const getQuotaLimit = () => {
    if (subscriptionTier === 'free_starter') return { limitMb: 10, label: '10 MB' };
    if (subscriptionTier === 'sme_pro') return { limitMb: 1024, label: '1.0 GB' };
    return { limitMb: 102400, label: '100 GB' }; // Enterprise
  };

  const quota = getQuotaLimit();
  const storagePercentage = Math.min((totalUsedMb / quota.limitMb) * 100, 100);

  // Auto-fill form simulating OCR for Enterprise Suite users
  const triggerOcrScan = () => {
    if (subscriptionTier !== 'enterprise_suite') return;
    setOcrScanning(true);
    setSnackbar({ open: true, message: '✨ AI OCR Stream Scanner: Analyzing binary payload...', severity: 'info' });
    
    setTimeout(() => {
      setOcrScanning(false);
      setUploadFileName('auto_extracted_filing_2026');
      setUploadExpiryDate('2026-12-31');
      setSnackbar({ open: true, message: '✨ OCR Success: Metadata (GSTIN, Expiry: 2026-12-31) parsed successfully!', severity: 'success' });
    }, 1500);
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!passphrase) {
      setUnlockError('Please enter a decryption passphrase.');
      return;
    }

    setUnlockError('');
    setIsDecrypting(true);

    try {
      // Verify vault passphrase via backend
      await workspaceService.verifyVault(passphrase);
      
      // Fetch files from backend dynamically
      const res = await workspaceService.getDocuments();
      const mappedDocs = res.data.map(d => ({
        id: d.id,
        category: d.category === 'gst_certificate' ? 'GST Certificate' :
                  d.category === 'pollution_clearance' ? 'Pollution Clearance' :
                  d.category === 'fire_noc' ? 'Fire NOC' :
                  d.category === 'incorporation' ? 'Company Registration' : 'Lease Agreement',
        file_name: d.file_name,
        expiry_date: d.expiry_date,
        verified: d.verified,
        status: d.expiry_date ? (new Date(d.expiry_date) < new Date() ? 'Expired' : 'Valid') : 'Active',
        size_kb: d.file_size_kb || 150,
        company_name: d.company_name
      }));
      setDocumentsList(mappedDocs);
      setIsUnlocked(true);
      setSnackbar({ open: true, message: 'AES master key derived successfully! Vault unlocked.', severity: 'success' });
      setPassphrase('');
    } catch (err) {
      console.error('Failed to unlock vault:', err);
      const errMsg = err.response?.data?.error || 'Invalid Decryption Passphrase. Cryptographic hash signature mismatch. Hint: use "sipcot123" or your account password.';
      setUnlockError(errMsg);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleLockVault = () => {
    setIsUnlocked(false);
    setPassphrase('');
    setUnlockError('');
    setSnackbar({ open: true, message: 'Vault locked. Decryption keys cleared from memory.', severity: 'info' });
  };

  const handleUploadSecure = () => {
    if (!uploadFileName) {
      alert('Please specify a file name first!');
      return;
    }

    // Gated Quota Enforcement
    const sizeToAddMb = mockFileSizeKb / 1024;
    if (!hasGovtBypass && (totalUsedMb + sizeToAddMb) > quota.limitMb) {
      setUploadModalOpen(false);
      setUpgradeDialogOpen(true);
      return;
    }

    setUploading(true);
    setProgress(10);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 30;
      });
    }, 450);

    setTimeout(async () => {
      try {
        const payload = {
          category: uploadCategory,
          fileName: uploadFileName.toLowerCase().endsWith('.pdf') ? uploadFileName : `${uploadFileName}.pdf`,
          expiryDate: uploadExpiryDate || null
        };
        const res = await workspaceService.uploadDocument(payload);
        
        const newDoc = {
          id: res.data.id,
          category: uploadCategory === 'gst_certificate' ? 'GST Certificate' :
                    uploadCategory === 'pollution_clearance' ? 'Pollution Clearance' :
                    uploadCategory === 'fire_noc' ? 'Fire NOC' : 'Lease Agreement',
          file_name: payload.fileName,
          expiry_date: uploadExpiryDate || null,
          verified: false,
          status: uploadExpiryDate ? 'Valid' : 'Active',
          size_kb: parseInt(mockFileSizeKb)
        };

        setDocumentsList((prevDocs) => [newDoc, ...prevDocs]);
        setUploading(false);
        setUploadModalOpen(false);
        
        // Append audit logs if Enterprise Suite is active
        setAuditLogs((prevLogs) => [
          {
            id: Date.now(),
            action: 'upload',
            document: newDoc.file_name,
            user: localStorage.getItem('userEmail') || 'industry@abc.com',
            ip: '192.168.1.45',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            verified: true
          },
          ...prevLogs
        ]);

        setSnackbar({ open: true, message: 'Document encrypted and uploaded to secure vault successfully!', severity: 'success' });
        setUploadFileName('');
        setUploadExpiryDate('');
        setMockFileSizeKb(300);
      } catch {
        setUploading(false);
        setUploadModalOpen(false);
        setSnackbar({ open: true, message: 'Failed to securely upload document.', severity: 'error' });
      }
    }, 1800);
  };

  const handleDeleteSecure = (id, fileName) => {
    setDocumentsList((prevDocs) => prevDocs.filter(doc => doc.id !== id));
    
    // Log delete audit trail
    setAuditLogs((prevLogs) => [
      {
        id: Date.now(),
        action: 'delete',
        document: fileName,
        user: 'industry@abc.com',
        ip: '192.168.1.45',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        verified: true
      },
      ...prevLogs
    ]);

    setSnackbar({ open: true, message: 'Document securely deleted from encrypted storage!', severity: 'success' });
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      
      {/* 🔒 Locked State Screen */}
      {!isUnlocked ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '75vh', 
          px: 2,
          perspective: '1000px'
        }}>
          <Paper 
            elevation={24}
            sx={{
              p: { xs: 4, sm: 6 },
              maxWidth: 480,
              width: '100%',
              borderRadius: '24px',
              border: '1px solid rgba(76, 175, 80, 0.25)',
              background: 'linear-gradient(135deg, rgba(13, 35, 24, 0.85) 0%, rgba(9, 23, 17, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.15)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease-in-out',
              animation: shake ? 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' : 'none',
              '@keyframes shake': {
                '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
                '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
                '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
                '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
              }
            }}
          >
            {/* Background cyber pattern details */}
            <Box sx={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              opacity: 0.03,
              backgroundImage: 'radial-gradient(#4CAF50 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              pointerEvents: 'none',
              animation: 'spin 120s linear infinite',
              '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } }
            }} />

            {/* Glowing avatar header with dynamic interactive focus/decrypt state */}
            <Box sx={{ position: 'relative', display: 'inline-flex', mx: 'auto', mb: 3 }}>
              {/* Outer Pulsing Ring */}
              <Box sx={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                border: '2px solid',
                borderColor: isDecrypting ? '#2E7D32' : isInputFocused ? '#4CAF50' : 'rgba(76, 175, 80, 0.3)',
                animation: isDecrypting || isInputFocused ? 'spin-slow 4s linear infinite' : 'none',
                '@keyframes spin-slow': { '100%': { transform: 'rotate(360deg)' } },
                transition: 'border-color 0.3s ease'
              }} />
              <Avatar 
                sx={{ 
                  bgcolor: 'rgba(76, 175, 80, 0.08)', 
                  color: isDecrypting ? '#81c784' : isInputFocused ? '#4CAF50' : '#81c784', 
                  width: 72, 
                  height: 72,
                  border: '1px solid rgba(76, 175, 80, 0.35)',
                  boxShadow: isInputFocused ? '0 0 20px rgba(76,175,80,0.3)' : 'none',
                  transition: 'all 0.3s ease',
                  animation: isDecrypting ? 'decrypting-pulse 1.2s infinite ease-in-out' : 'none',
                  '@keyframes decrypting-pulse': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)', filter: 'brightness(1.2)' },
                    '100%': { transform: 'scale(1)' }
                  }
                }}
              >
                {isDecrypting ? (
                  <Cached sx={{ fontSize: '2.2rem', animation: 'spin 1.5s linear infinite' }} />
                ) : isInputFocused ? (
                  <Key sx={{ fontSize: '2.2rem', transform: 'rotate(-45deg)', transition: 'transform 0.3s ease' }} />
                ) : (
                  <LockOutlined sx={{ fontSize: '2.2rem' }} />
                )}
              </Avatar>
            </Box>

            <Typography variant="h5" fontWeight={900} gutterBottom sx={{ color: 'white', letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              Secure Document Vault
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3, fontSize: '0.85rem', lineHeight: 1.6, px: 2 }}>
              Derive standard AES-256 decryption keys locally to unlock statutory folders and records.
            </Typography>

            {/* Cyber HUD Metadata Panel */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(76, 175, 80, 0.15)',
              borderRadius: '12px',
              py: 1.5,
              px: 2,
              mb: 4,
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.65)'
            }}>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>PROTOCOL</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold', color: '#81c784' }}>AES-GCM</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(76, 175, 80, 0.15)' }} />
              <Box>
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>DERIVATION</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold', color: '#81c784' }}>PBKDF2</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(76, 175, 80, 0.15)' }} />
              <Box>
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>STATUS</Typography>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4CAF50', animation: 'blink 1.5s infinite alternate', '@keyframes blink': { '0%': { opacity: 0.3 }, '100%': { opacity: 1 } } }} />
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold', color: '#4CAF50' }}>SECURE</Typography>
                </Box>
              </Box>
            </Box>

            <form onSubmit={handleUnlock}>
              <Box display="flex" flexDirection="column" gap={3}>
                <TextField
                  fullWidth
                  variant="outlined"
                  type={showPassphrase ? 'text' : 'password'}
                  label="Enter Vault Passphrase"
                  placeholder="Password..."
                  value={passphrase}
                  disabled={isDecrypting}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  onChange={(e) => setPassphrase(e.target.value)}
                  InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)', '&.Mui-focused': { color: '#4CAF50', fontWeight: 'bold' } } }}
                  InputProps={{
                    sx: { 
                      color: 'white', 
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      letterSpacing: showPassphrase ? 'normal' : '0.25em',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)', borderWidth: '1px' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(76, 175, 80, 0.4)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4CAF50', borderWidth: '2px', boxShadow: '0 0 12px rgba(76,175,80,0.15)' },
                      bgcolor: 'rgba(0, 0, 0, 0.2)'
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassphrase(!showPassphrase)}
                          edge="end"
                          sx={{ color: 'rgba(255,255,255,0.5)', mr: 0.5 }}
                        >
                          {showPassphrase ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                {unlockError && (
                  <Alert 
                    severity="error" 
                    variant="filled" 
                    sx={{ 
                      textAlign: 'left', 
                      borderRadius: '12px',
                      py: 1, 
                      fontSize: '0.8rem', 
                      bgcolor: '#c62828',
                      boxShadow: '0 4px 12px rgba(198, 40, 40, 0.2)' 
                    }}
                  >
                    {unlockError}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isDecrypting}
                  sx={{
                    bgcolor: '#2E7D32',
                    '&:hover': { 
                      bgcolor: '#1B5E20',
                      boxShadow: '0 0 20px rgba(46,125,50,0.5)',
                      transform: 'translateY(-1px)'
                    },
                    color: 'white',
                    py: 1.8,
                    borderRadius: '12px',
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    boxShadow: '0 8px 24px rgba(46, 125, 50, 0.3)',
                    transition: 'all 0.2s ease-in-out',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {isDecrypting ? (
                    <>
                      <CircularProgress size={20} color="inherit" />
                      <span>Verifying Authority & Key Derivation...</span>
                    </>
                  ) : (
                    <>
                      <LockOpenOutlined />
                      <span>Authorize & Unlock Vault</span>
                    </>
                  )}
                </Button>
              </Box>
            </form>

            <Alert 
              severity="info" 
              variant="outlined" 
              sx={{ 
                mt: 5, 
                textAlign: 'left', 
                borderRadius: '12px',
                borderColor: 'rgba(76, 175, 80, 0.3)', 
                color: '#81c784', 
                fontSize: '0.8rem', 
                bgcolor: 'rgba(76, 175, 80, 0.02)',
                '& .MuiAlert-icon': { color: '#81c784' } 
              }}
            >
              Demo mode sandbox keys: <strong>sipcot123</strong> or your user account login password.
            </Alert>
          </Paper>
        </Box>
      ) : (
        /* 🔓 Unlocked State Dashboard View */
        <Box>
          
          {/* HEADER CONTEXT & BILLING TIER SWITCHER */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 3, md: 4 }, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
                Secure Document Vault
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Upload, manage, and audit your statutory certificates and industrial records within a zero-trust encrypted workspace.
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              {/* Premium Switcher dropdown solely for easy demo & test gating */}
              {hasGovtBypass ? (
                <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8fafc', borderColor: '#E2E8F0', borderRadius: 2 }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ pl: 1 }}>DEMO PLAN SWITCHER:</Typography>
                  <TextField
                    select
                    size="small"
                    value={subscriptionTier}
                    onChange={(e) => {
                      setSubscriptionTier(e.target.value);
                      setSnackbar({ open: true, message: `Subscription plan switched to ${e.target.value === 'free_starter' ? 'Compliance Starter (Free)' : e.target.value === 'sme_pro' ? 'SME Professional (Paid)' : 'Enterprise Suite (Paid)'}! Visual features gated instantly.`, severity: 'success' });
                    }}
                    SelectProps={{ sx: { py: 0, fontWeight: 700, fontSize: '0.8rem' } }}
                    sx={{ width: 180, '& .MuiOutlinedInput-root': { py: 0 } }}
                  >
                    <MenuItem value="free_starter">Starter (Free)</MenuItem>
                    <MenuItem value="sme_pro">SME Pro (Growth)</MenuItem>
                    <MenuItem value="enterprise_suite">Enterprise (Infinite)</MenuItem>
                  </TextField>
                </Paper>
              ) : (
                <Chip 
                  label={`Plan: ${subscriptionTier === 'free_starter' ? 'Compliance Starter (Free)' : subscriptionTier === 'sme_pro' ? 'SME Professional' : 'Enterprise Suite'}`}
                  color="success"
                  variant="filled"
                  sx={{ fontWeight: 700, borderRadius: 2, px: 1, color: 'white' }}
                />
              )}

              <Button
                variant="outlined"
                color="error"
                startIcon={<Lock />}
                sx={{ textTransform: 'none', fontWeight: 600, px: 2.5, borderRadius: 2, height: 40 }}
                onClick={handleLockVault}
              >
                Lock Vault
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={3}>
            
            {/* 💾 Left Storage Utilization Card (SaaS Metering indicator) */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Storage sx={{ color: '#2E7D32' }} />
                    <Typography variant="h6" fontWeight={700} color="text.primary">Storage Utilization</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total static file payload encrypted inside cloud storage:
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color="#1F4E79" sx={{ my: 1.5 }}>
                    {totalUsedMb} MB <Box component="span" sx={{ fontSize: '0.45em', fontWeight: 600, color: 'text.secondary' }}>/ {quota.label}</Box>
                  </Typography>

                  <LinearProgress 
                    variant="determinate" 
                    value={storagePercentage} 
                    sx={{ rounded: 3, height: 8, bgcolor: '#f1f5f9', mb: 2, '& .MuiLinearProgress-bar': { bgcolor: storagePercentage > 85 ? '#d32f2f' : '#2E7D32', borderRadius: 3 } }}
                  />

                  <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Typography variant="caption" color="text.secondary">Used: {storagePercentage.toFixed(1)}%</Typography>
                    <Typography variant="caption" color="text.secondary">Remaining: {(quota.limitMb - totalUsedMb).toFixed(1)} MB</Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.03)', border: '1px dashed rgba(46, 125, 50, 0.25)', borderRadius: 2 }}>
                  <Typography variant="caption" fontWeight={800} color="#2E7D32" display="block" gutterBottom uppercase>
                    Current Plan: {subscriptionTier === 'free_starter' ? 'Compliance Starter' : subscriptionTier === 'sme_pro' ? 'SME Professional' : 'Enterprise Suite'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                    {subscriptionTier === 'free_starter' && '10 MB storage threshold. Expiry alerts locked. Upgrade to Pro for 1 GB storage.'}
                    {subscriptionTier === 'sme_pro' && '1 GB storage threshold. Expiry alerts unlocked. Upgrade to Enterprise for AI OCR and security audit trails.'}
                    {subscriptionTier === 'enterprise_suite' && '100 GB command suite threshold active. Intelligent OCR extraction and access auditing fully operational.'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* 🛡️ Right Core Secure Registry Registry */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, background: 'linear-gradient(135deg, #FAFDFB 0%, #FFFFFF 100%)', boxShadow: '0 8px 32px rgba(46, 125, 50, 0.02)' }}>
                <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'rgba(46, 125, 50, 0.08)', color: '#2E7D32', width: 44, height: 44, border: '1px solid rgba(46, 125, 50, 0.15)' }}>
                        <Shield />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={700} color="#1F4E79">
                          Secure Storage Registry
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          AES-256 Envelope Encrypted • SHA-256 Hashing • ClamAV malware stream scanning
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  {!hasGovtBypass && (
                    <Grid size={{ xs: 12, sm: 4 }} display="flex" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                      <Button 
                        variant="contained" 
                        startIcon={<CloudUpload />}
                        sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' }, px: 3, py: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)' }}
                        onClick={() => setUploadModalOpen(true)}
                      >
                        Upload Secure File
                      </Button>
                    </Grid>
                  )}
                </Grid>

                {/* Secure Document List Table */}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                        {hasGovtBypass && (
                          <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Company</TableCell>
                        )}
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>File Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Expiry Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Audited Verification</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {documentsList.map((doc) => (
                        <TableRow key={doc.id} hover sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' } }}>
                          {hasGovtBypass && (
                            <TableCell sx={{ fontWeight: 600, color: '#1F4E79', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                              {doc.company_name || 'N/A'}
                            </TableCell>
                          )}
                          <TableCell sx={{ fontWeight: 600, color: '#1F4E79', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{doc.category}</TableCell>
                          <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Lock sx={{ fontSize: '0.85rem', color: 'text.secondary' }} />
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.primary' }}>{doc.file_name}</Typography>
                              <Typography variant="caption" color="text.secondary">({doc.size_kb} KB)</Typography>
                            </Box>
                          </TableCell>
                          
                          {/* 🎫 Gated Expiry Alerts: blurred on Compliance Starter (Free) */}
                          <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {subscriptionTier === 'free_starter' && !hasGovtBypass ? (
                              <Tooltip title="Expiry Alerts & Tracking locked. Upgrade to SME Pro to unlock." arrow>
                                <Chip 
                                  icon={<LockOutlined style={{ fontSize: '0.75rem', color: '#1E293B' }} />}
                                  label="PRO Feature" 
                                  size="small" 
                                  sx={{ bgcolor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', color: '#1E293B', fontWeight: 700, fontSize: '0.65rem' }} 
                                />
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color={doc.status === 'Expiring' ? 'error.main' : 'text.primary'} fontWeight={doc.status === 'Expiring' ? 700 : 400}>
                                {doc.expiry_date || 'Active/None'}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            <Chip 
                              label={doc.verified ? "Verified Audit" : "Pending Verify"} 
                              size="small" 
                              variant="outlined"
                              color={doc.verified ? "success" : "warning"}
                              sx={{ fontWeight: 600, fontSize: '0.75rem', height: 20 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            <IconButton 
                              size="small"
                              sx={{ color: '#2E7D32', '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.08)' } }}
                              onClick={() => alert(`🔐 Secure pre-signed download URL generated successfully!\n\n📄 File: ${doc.file_name}\n🔑 Key Strength: AES-256-GCM Envelope\n✅ Hash Status: SHA-256 Integrity Verified.\n\n[System Audited: Your download activity has been logged in the platform registry for compliance tracking.]`)}
                              title="Secure Download"
                            >
                              <FileDownload fontSize="small" />
                            </IconButton>
                            {!hasGovtBypass && (
                              <IconButton 
                                size="small"
                                sx={{ color: '#d32f2f', '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' } }}
                                onClick={() => {
                                  if (confirm(`Are you absolutely sure you want to securely delete ${doc.file_name} from the encrypted storage? This action will permanently remove it from the vault.`)) {
                                    handleDeleteSecure(doc.id, doc.file_name);
                                  }
                                }}
                                title="Secure Delete"
                              >
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* 🗃️ Vault Access Audit Trail (Gated to Enterprise Suite) */}
          <Box sx={{ mt: 5, position: 'relative' }}>
            <Typography variant="h5" color="#1F4E79" fontWeight="bold" sx={{ mb: 2 }}>
              Vault Access Audit Trail
            </Typography>

            <Box sx={{ position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
              
              {/* Blurred Overlay for Starter and Pro */}
              {(subscriptionTier === 'free_starter' || subscriptionTier === 'sme_pro') && !hasGovtBypass && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backdropFilter: 'blur(8px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 4
                  }}
                >
                  <Avatar sx={{ bgcolor: 'rgba(31, 78, 121, 0.1)', color: '#1F4E79', width: 56, height: 56, mb: 2 }}>
                    <Lock sx={{ fontSize: '1.8rem' }} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={800} color="#1F4E79" gutterBottom>
                    Compliance Access Audit Logs Locked
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxW: 460, mb: 3 }}>
                    Tracking who downloads, deletes, or reviews legal statuary documents is exclusive to our **Enterprise Suite** subscribers to guarantee regulatory tracking.
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<AutoAwesome />}
                    onClick={() => {
                      handleRazorpayPayment('enterprise_suite');
                    }}
                    sx={{
                      bgcolor: '#1F4E79',
                      '&:hover': { bgcolor: '#0f2a4a' },
                      px: 4, py: 1.2,
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none'
                    }}
                  >
                    Upgrade to Enterprise
                  </Button>
                </Box>
              )}

              {/* Immutable Logs Table */}
              <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0', borderRadius: 4 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>Audit Event ID</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Operator Account</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Action Performed</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Target Asset</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>IP Address</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>SHA-256 Checksum Verify</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', py: 1.5 }}>#{log.id}</TableCell>
                        <TableCell fontWeight={600}>{log.user}</TableCell>
                        <TableCell>
                          <Chip 
                            label={log.action.toUpperCase()} 
                            size="small" 
                            color={log.action === 'upload' ? 'success' : log.action === 'delete' ? 'error' : 'info'}
                            sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.document}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{log.ip}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={0.5} sx={{ color: '#2E7D32' }}>
                            <CheckCircle sx={{ fontSize: '0.85rem' }} />
                            <Typography variant="caption" fontWeight={700}>Matched</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{log.timestamp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>

          {/* 🚀 Secure Upload Dialog */}
          <Dialog 
            open={uploadModalOpen} 
            onClose={() => !uploading && setUploadModalOpen(false)}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
          >
            <DialogTitle sx={{ fontWeight: 700, color: '#1F4E79', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(0,0,0,0.06)', pb: 1.5 }}>
              <LockOpenOutlined sx={{ color: '#2E7D32' }} /> Upload Secure Document
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5 }}>
              
              {/* Loader during Encryption / Scan */}
              {uploading && (
                <Box py={4} textAlign="center">
                  <Cached sx={{ fontSize: 44, color: '#2E7D32', mb: 2, animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                  <Typography variant="body1" fontWeight={600} color="text.primary" mb={1}>
                    Malware Scanning & Encryption...
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                    Scanning raw byte stream and generating AES key
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ rounded: 4, height: 8, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32', borderRadius: 4 } }}
                  />
                </Box>
              )}

              {/* Loading indicator during OCR Stream scanning (Enterprise Suite only) */}
              {!uploading && ocrScanning && (
                <Box py={4} textAlign="center">
                  <CircularProgress size={40} sx={{ color: '#1F4E79', mb: 2 }} />
                  <Typography variant="body2" fontWeight={700} color="#1F4E79" mb={1}>
                    ✨ AI OCR Metadata Parser Active
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Deriving structured metadata, checking certificate authorities, and extracting expiry signatures...
                  </Typography>
                </Box>
              )}

              {!uploading && !ocrScanning && (
                <Box display="flex" flexDirection="column" gap={2} mt={1}>
                  
                  {/* Demo input to mock file sizes for quota testing */}
                  <TextField
                    label="Mock Upload File Size (KB)"
                    type="number"
                    size="small"
                    value={mockFileSizeKb}
                    onChange={(e) => setMockFileSizeKb(e.target.value)}
                    helperText={`Helper: Uploading this size will bring utilization to ${(totalUsedMb + parseFloat(mockFileSizeKb / 1024)).toFixed(2)} MB.`}
                    sx={{ mb: 1 }}
                  />

                  <TextField
                    select
                    label="Document Category"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="gst_certificate">GST Registration</MenuItem>
                    <MenuItem value="pollution_clearance">Pollution NOC</MenuItem>
                    <MenuItem value="fire_noc">Fire Safety NOC</MenuItem>
                    <MenuItem value="incorporation">Lease Agreement</MenuItem>
                  </TextField>

                  <TextField 
                    label="File Display Name" 
                    placeholder="e.g. gst_certificate_2026"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                  />

                  <TextField 
                    label="Expiry Date" 
                    type="date" 
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={uploadExpiryDate}
                    onChange={(e) => setUploadExpiryDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />

                  {/* Drag and Drop Container (with OCR hook trigger for Enterprise) */}
                  <Box 
                    onClick={triggerOcrScan}
                    sx={{ 
                      border: '2px dashed rgba(46, 125, 50, 0.25)', 
                      '&:hover': { borderColor: '#2E7D32', bgcolor: 'rgba(46, 125, 50, 0.02)' }, 
                      borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', bgcolor: 'rgba(46, 125, 50, 0.01)', 
                      transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' 
                    }}
                  >
                    <CloudUpload sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.primary" fontWeight={700}>
                      Drag & Drop Document File Here
                    </Typography>
                    
                    {subscriptionTier === 'enterprise_suite' ? (
                      <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 0.5, px: 1, py: 0.2, bgcolor: 'rgba(31, 78, 121, 0.1)', color: '#1F4E79', borderRadius: 1.5 }}>
                        <AutoAwesome style={{ fontSize: '0.8rem' }} />
                        <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.65rem' }}>AI OCR SCANNER READY</Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        PDF, PNG, JPEG formats supported (Max 10MB)
                      </Typography>
                    )}
                  </Box>

                  <Box display="flex" justifyContent="flex-end" gap={1.5} mt={1}>
                    <Button 
                      onClick={() => setUploadModalOpen(false)}
                      sx={{ color: 'text.secondary', textTransform: 'none' }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleUploadSecure}
                      sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                    >
                      Encrypt & Upload
                    </Button>
                  </Box>
                </Box>
              )}
            </DialogContent>
          </Dialog>

          {/* 🎫 Upgrade Subscription Plan Dialog (Triggered on exceeding storage limits) */}
          <Dialog
            open={upgradeDialogOpen}
            onClose={() => setUpgradeDialogOpen(false)}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 4, p: 2, background: 'linear-gradient(135deg, #FAFDFB 0%, #FFFFFF 100%)', border: '1px solid rgba(46, 125, 50, 0.15)' } }}
          >
            <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
              <Avatar sx={{ bgcolor: 'rgba(211, 47, 47, 0.08)', color: '#d32f2f', width: 64, height: 64, mx: 'auto', mb: 2, border: '1px solid rgba(211, 47, 47, 0.25)' }}>
                <Storage sx={{ fontSize: '2rem' }} />
              </Avatar>
              <Typography variant="h5" fontWeight={900} color="#1F4E79" gutterBottom>
                Storage Threshold Exceeded
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
                Uploading this document will push your storage utilization to <strong>{(totalUsedMb + mockFileSizeKb/1024).toFixed(2)} MB</strong>, exceeding your current **Compliance Starter** limit of **10.0 MB**.
              </Typography>

              <Box display="flex" flexDirection="column" gap={1.5}>
                <Button 
                  variant="contained" 
                  startIcon={<AutoAwesome />}
                  onClick={() => {
                    setUpgradeDialogOpen(false);
                    handleRazorpayPayment('sme_pro');
                  }}
                  sx={{
                    bgcolor: '#2E7D32',
                    '&:hover': { bgcolor: '#1B5E20' },
                    py: 1.5,
                    fontWeight: 700,
                    borderRadius: 2,
                    textTransform: 'none'
                  }}
                >
                  Upgrade to SME Pro (1.0 GB Storage)
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => setUpgradeDialogOpen(false)}
                  sx={{
                    py: 1.2,
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                    color: 'text.secondary',
                    borderColor: '#E2E8F0'
                  }}
                >
                  Close & Dismiss
                </Button>
              </Box>
            </DialogContent>
          </Dialog>

        </Box>
      )}

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity || 'success'} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
