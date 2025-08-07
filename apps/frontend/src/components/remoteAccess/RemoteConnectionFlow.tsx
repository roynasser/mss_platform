'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Fade,
  Grow,
  FormControlLabel,
  Checkbox,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Person as PersonIcon,
  VpnKey as VpnKeyIcon,
  Computer as ComputerIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Wifi as VpnIcon,
  Security as SecurityIcon,
  Terminal as TerminalIcon,
  Key as KeyIcon,
  LockOpen as LockOpenIcon,
  CloudQueue as CloudIcon,
  Storage as ServerIcon,
  Router as NetworkIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface RemoteConnectionFlowProps {
  deviceName: string;
  deviceIp: string;
  deviceType?: 'server' | 'workstation' | 'firewall' | 'switch' | 'router';
  customer: string;
  onConnect: (identity: string, vpnId: string) => void;
  onCancel: () => void;
}

interface VPNConfig {
  id: string;
  name: string;
  region: string;
  status: 'available' | 'busy' | 'offline';
  latency: number;
  load: number;
}

interface Identity {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  lastUsed?: string;
  requiresMFA?: boolean;
}

export const RemoteConnectionFlow: React.FC<RemoteConnectionFlowProps> = ({
  deviceName,
  deviceIp,
  deviceType = 'server',
  customer,
  onConnect,
  onCancel,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedIdentity, setSelectedIdentity] = useState<string>('');
  const [selectedVPN, setSelectedVPN] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [connectionSteps, setConnectionSteps] = useState<Array<{text: string, status: 'pending' | 'running' | 'completed' | 'error'}>>([]);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  // Mock VPN configurations
  const vpnConfigs: VPNConfig[] = [
    { id: 'vpn1', name: 'US-East-1', region: 'Virginia', status: 'available', latency: 12, load: 35 },
    { id: 'vpn2', name: 'US-West-2', region: 'Oregon', status: 'available', latency: 45, load: 62 },
    { id: 'vpn3', name: 'EU-Central-1', region: 'Frankfurt', status: 'available', latency: 78, load: 28 },
    { id: 'vpn4', name: 'AP-Southeast-1', region: 'Singapore', status: 'busy', latency: 120, load: 89 },
  ];

  // Mock identities
  const identities: Identity[] = [
    { 
      id: 'tech1', 
      username: 'technician', 
      role: 'Technician', 
      permissions: ['read', 'execute', 'restart'],
      lastUsed: '2 hours ago'
    },
    { 
      id: 'admin1', 
      username: 'admin', 
      role: 'Administrator', 
      permissions: ['read', 'write', 'execute', 'delete', 'restart'],
      lastUsed: '1 day ago',
      requiresMFA: true
    },
    { 
      id: 'root1', 
      username: 'root', 
      role: 'Super User', 
      permissions: ['all'],
      lastUsed: '3 days ago',
      requiresMFA: true
    },
    { 
      id: 'service1', 
      username: 'service-account', 
      role: 'Service Account', 
      permissions: ['read', 'execute'],
      lastUsed: 'Never'
    },
  ];

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'server': return <ServerIcon />;
      case 'workstation': return <ComputerIcon />;
      case 'firewall': return <SecurityIcon />;
      case 'switch':
      case 'router': return <NetworkIcon />;
      default: return <ComputerIcon />;
    }
  };

  const handleIdentitySelect = () => {
    if (!selectedIdentity || !acceptedTerms) return;
    
    // Auto-select best VPN if not selected
    if (!selectedVPN) {
      const bestVPN = vpnConfigs
        .filter(vpn => vpn.status === 'available')
        .sort((a, b) => a.latency - b.latency)[0];
      if (bestVPN) {
        setSelectedVPN(bestVPN.id);
      }
    }
    
    const identity = identities.find(i => i.id === selectedIdentity);
    if (identity?.requiresMFA) {
      setShowMFA(true);
    } else {
      setActiveStep(1);
      startConnection();
    }
  };

  const handleMFASubmit = () => {
    if (mfaCode.length === 6) {
      setShowMFA(false);
      setActiveStep(1);
      startConnection();
    }
  };

  const startConnection = () => {
    const steps = [
      'Initializing secure connection...',
      'Connecting to VPN gateway...',
      'Authenticating VPN credentials...',
      'Establishing VPN tunnel...',
      'VPN connection established',
      'Resolving target device...',
      'Connecting to ' + deviceName + '...',
      'Authenticating user credentials...',
      'Setting up session recording...',
      'Loading terminal environment...',
      'Connection successful!'
    ];

    setConnectionSteps(steps.map(text => ({ text, status: 'pending' })));

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setConnectionSteps(prev => prev.map((step, idx) => {
          if (idx === currentStep) return { ...step, status: 'running' };
          if (idx < currentStep) return { ...step, status: 'completed' };
          return step;
        }));
        
        setConnectionStatus(steps[currentStep]);
        setConnectionProgress((currentStep + 1) / steps.length * 100);
        
        if (currentStep === steps.length - 1) {
          setTimeout(() => {
            setConnectionSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
            setTimeout(() => {
              const identity = identities.find(i => i.id === selectedIdentity);
              onConnect(identity?.username || 'technician', selectedVPN);
            }, 500);
          }, 500);
        }
        
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  };

  const steps = ['Select Identity & VPN', 'Establishing Connection'];

  return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
      <Paper elevation={3} sx={{ maxWidth: 900, width: '90%', p: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Remote Access Connection
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            {getDeviceIcon()}
            <Box>
              <Typography variant="h6">{deviceName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {customer} • {deviceIp}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          <Step>
            <StepLabel>
              <Typography variant="h6">Select Identity & Configure Access</Typography>
            </StepLabel>
            <StepContent>
              <Grid container spacing={3}>
                {/* Identity Selection */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    1. Select Identity
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Choose the identity you'll use to access this device
                  </Alert>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Identity</InputLabel>
                    <Select
                      value={selectedIdentity}
                      onChange={(e) => setSelectedIdentity(e.target.value)}
                      label="Identity"
                    >
                      {identities.map(identity => (
                        <MenuItem key={identity.id} value={identity.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <PersonIcon fontSize="small" />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1">{identity.username}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {identity.role} • Last used: {identity.lastUsed}
                              </Typography>
                            </Box>
                            {identity.requiresMFA && (
                              <Chip label="MFA" size="small" color="warning" />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedIdentity && (
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Identity Permissions
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {identities.find(i => i.id === selectedIdentity)?.permissions.map(perm => (
                            <Chip key={perm} label={perm} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Grid>

                {/* VPN Selection */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    2. VPN Gateway (Optional)
                  </Typography>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Auto-selects optimal VPN based on latency
                  </Alert>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>VPN Gateway</InputLabel>
                    <Select
                      value={selectedVPN}
                      onChange={(e) => setSelectedVPN(e.target.value)}
                      label="VPN Gateway"
                    >
                      <MenuItem value="">
                        <em>Auto-select best</em>
                      </MenuItem>
                      {vpnConfigs.map(vpn => (
                        <MenuItem key={vpn.id} value={vpn.id} disabled={vpn.status !== 'available'}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <VpnIcon fontSize="small" />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1">{vpn.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {vpn.region} • {vpn.latency}ms • Load: {vpn.load}%
                              </Typography>
                            </Box>
                            <Chip 
                              label={vpn.status} 
                              size="small" 
                              color={vpn.status === 'available' ? 'success' : vpn.status === 'busy' ? 'warning' : 'error'}
                            />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedVPN && (
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Connection Details
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemIcon><SecurityIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Encryption" secondary="AES-256-GCM" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><LockOpenIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Authentication" secondary="Certificate + Password" />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  )}
                </Grid>

                {/* Terms and Conditions */}
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Important Security Notice
                    </Typography>
                    <Typography variant="body2">
                      • All sessions are recorded for security and compliance
                      <br />
                      • Unauthorized access attempts will be reported
                      <br />
                      • Session will timeout after 30 minutes of inactivity
                    </Typography>
                  </Alert>
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                      />
                    }
                    label="I understand and accept the security policies and session recording"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={handleIdentitySelect}
                  disabled={!selectedIdentity || !acceptedTerms}
                  startIcon={<VpnKeyIcon />}
                >
                  Connect
                </Button>
                <Button onClick={onCancel}>
                  Cancel
                </Button>
              </Box>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>
              <Typography variant="h6">Establishing Secure Connection</Typography>
            </StepLabel>
            <StepContent>
              <Box sx={{ width: '100%', mb: 3 }}>
                <LinearProgress variant="determinate" value={connectionProgress} sx={{ height: 8, borderRadius: 4 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {connectionStatus}
                </Typography>
              </Box>

              <List>
                {connectionSteps.map((step, index) => (
                  <Fade in={true} key={index} timeout={500}>
                    <ListItem>
                      <ListItemIcon>
                        {step.status === 'completed' ? (
                          <CheckIcon color="success" />
                        ) : step.status === 'running' ? (
                          <CircularProgress size={20} />
                        ) : step.status === 'error' ? (
                          <ErrorIcon color="error" />
                        ) : (
                          <Box sx={{ width: 20, height: 20 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={step.text}
                        primaryTypographyProps={{
                          color: step.status === 'completed' ? 'success.main' : 
                                 step.status === 'running' ? 'primary.main' : 
                                 'text.secondary'
                        }}
                      />
                    </ListItem>
                  </Fade>
                ))}
              </List>

              {connectionProgress === 100 && (
                <Grow in={true}>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">
                      Connection Established Successfully!
                    </Typography>
                    <Typography variant="body2">
                      Redirecting to terminal session...
                    </Typography>
                  </Alert>
                </Grow>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </Paper>

      {/* MFA Dialog */}
      <Dialog open={showMFA} onClose={() => setShowMFA(false)}>
        <DialogTitle>
          Multi-Factor Authentication Required
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter the 6-digit code from your authenticator app
          </Alert>
          <TextField
            fullWidth
            label="MFA Code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMFA(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleMFASubmit} disabled={mfaCode.length !== 6}>
            Verify
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};