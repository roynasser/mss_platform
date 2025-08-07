'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  Tooltip,
  LinearProgress,
  Alert,
  Badge,
  Paper,
  Divider,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Storage as ServerIcon,
  Router as NetworkIcon,
  Security as SecurityIcon,
  PlayArrow as ConnectIcon,
  Stop as DisconnectIcon,
  FiberManualRecord as RecordIcon,
  Refresh as RefreshIcon,
  Terminal as TerminalIcon,
  DesktopWindows as RDPIcon,
  DeveloperBoard as VNCIcon,
  History as HistoryIcon,
  CloudQueue as CloudIcon,
  VpnKey as SSHIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as OnlineIcon,
  Error as OfflineIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Assessment as MetricsIcon,
  ScreenShare as ScreenShareIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRouter } from 'next/navigation';

interface RemoteDevice {
  id: string;
  name: string;
  type: 'server' | 'workstation' | 'firewall' | 'switch' | 'router';
  ip: string;
  status: 'online' | 'offline' | 'maintenance';
  protocols: ('ssh' | 'rdp' | 'vnc' | 'https')[];
  customer: string;
  lastAccessed?: string;
  os?: string;
  critical?: boolean;
}

interface ActiveSession {
  id: string;
  deviceId: string;
  deviceName: string;
  protocol: string;
  startTime: string;
  duration: string;
  recording: boolean;
  customer: string;
}

interface SessionHistory {
  id: string;
  deviceName: string;
  customer: string;
  technician: string;
  startTime: string;
  endTime: string;
  duration: string;
  protocol: string;
  recorded: boolean;
  actions: number;
}

export const RemoteAccessHub: React.FC = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('ssh');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for devices
  const devices: RemoteDevice[] = [
    {
      id: '1',
      name: 'WEB-PROD-01',
      type: 'server',
      ip: '192.168.1.10',
      status: 'online',
      protocols: ['ssh', 'https'],
      customer: 'TechCorp Industries',
      lastAccessed: '2 hours ago',
      os: 'Ubuntu 22.04',
      critical: true,
    },
    {
      id: '2',
      name: 'DB-MASTER-01',
      type: 'server',
      ip: '192.168.1.20',
      status: 'online',
      protocols: ['ssh'],
      customer: 'TechCorp Industries',
      lastAccessed: '1 day ago',
      os: 'CentOS 8',
      critical: true,
    },
    {
      id: '3',
      name: 'DESKTOP-ACCT-05',
      type: 'workstation',
      ip: '192.168.2.45',
      status: 'online',
      protocols: ['rdp', 'vnc'],
      customer: 'FinanceFlow Corp',
      lastAccessed: '3 hours ago',
      os: 'Windows 11',
    },
    {
      id: '4',
      name: 'FW-EDGE-01',
      type: 'firewall',
      ip: '10.0.0.1',
      status: 'online',
      protocols: ['ssh', 'https'],
      customer: 'SecureNet Solutions',
      lastAccessed: '30 minutes ago',
      os: 'FortiOS 7.2',
      critical: true,
    },
    {
      id: '5',
      name: 'SW-CORE-01',
      type: 'switch',
      ip: '10.0.1.1',
      status: 'maintenance',
      protocols: ['ssh', 'https'],
      customer: 'DataStream Inc',
      lastAccessed: '1 week ago',
      os: 'Cisco IOS',
    },
    {
      id: '6',
      name: 'APP-SERVER-03',
      type: 'server',
      ip: '192.168.3.30',
      status: 'offline',
      protocols: ['ssh', 'rdp'],
      customer: 'CloudFirst Systems',
      lastAccessed: '2 days ago',
      os: 'Windows Server 2022',
    },
  ];

  // Mock active sessions
  const activeSessions: ActiveSession[] = [
    {
      id: 's1',
      deviceId: '1',
      deviceName: 'WEB-PROD-01',
      protocol: 'SSH',
      startTime: '10:30 AM',
      duration: '00:45:23',
      recording: true,
      customer: 'TechCorp Industries',
    },
    {
      id: 's2',
      deviceId: '3',
      deviceName: 'DESKTOP-ACCT-05',
      protocol: 'RDP',
      startTime: '11:15 AM',
      duration: '00:12:08',
      recording: true,
      customer: 'FinanceFlow Corp',
    },
  ];

  // Mock session history
  const sessionHistory: SessionHistory[] = [
    {
      id: 'h1',
      deviceName: 'DB-MASTER-01',
      customer: 'TechCorp Industries',
      technician: 'Sarah Tech',
      startTime: '2025-08-06 14:30',
      endTime: '2025-08-06 15:45',
      duration: '01:15:00',
      protocol: 'SSH',
      recorded: true,
      actions: 127,
    },
    {
      id: 'h2',
      deviceName: 'FW-EDGE-01',
      customer: 'SecureNet Solutions',
      technician: 'Mike Admin',
      startTime: '2025-08-06 09:00',
      endTime: '2025-08-06 09:30',
      duration: '00:30:00',
      protocol: 'HTTPS',
      recorded: true,
      actions: 45,
    },
  ];

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'server':
        return <ServerIcon />;
      case 'workstation':
        return <ComputerIcon />;
      case 'firewall':
        return <SecurityIcon />;
      case 'switch':
      case 'router':
        return <NetworkIcon />;
      default:
        return <ComputerIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getProtocolIcon = (protocol: string) => {
    switch (protocol.toLowerCase()) {
      case 'ssh':
        return <SSHIcon />;
      case 'rdp':
        return <RDPIcon />;
      case 'vnc':
        return <VNCIcon />;
      case 'https':
        return <CloudIcon />;
      default:
        return <TerminalIcon />;
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesCustomer = selectedCustomer === 'all' || device.customer === selectedCustomer;
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          device.ip.includes(searchQuery) ||
                          device.customer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCustomer && matchesSearch;
  });

  const customers = Array.from(new Set(devices.map(d => d.customer)));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Remote Access Hub
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Secure remote access to customer environments with full audit trail
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Available Devices
                  </Typography>
                  <Typography variant="h4">
                    {devices.filter(d => d.status === 'online').length}
                  </Typography>
                </Box>
                <OnlineIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active Sessions
                  </Typography>
                  <Typography variant="h4">
                    {activeSessions.length}
                  </Typography>
                </Box>
                <Badge badgeContent={activeSessions.length} color="error">
                  <ScreenShareIcon sx={{ fontSize: 40 }} color="primary" />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Recording
                  </Typography>
                  <Typography variant="h4">
                    {activeSessions.filter(s => s.recording).length}
                  </Typography>
                </Box>
                <RecordIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Customers
                  </Typography>
                  <Typography variant="h4">
                    {customers.length}
                  </Typography>
                </Box>
                <ComputerIcon sx={{ fontSize: 40 }} color="action" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
          <Tab label="Available Devices" icon={<ComputerIcon />} iconPosition="start" />
          <Tab label="Active Sessions" icon={<ScreenShareIcon />} iconPosition="start" />
          <Tab label="Session History" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Quick Connect" icon={<ConnectIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {selectedTab === 0 && (
        <Box>
          {/* Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search devices"
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <ComputerIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  label="Customer"
                >
                  <MenuItem value="all">All Customers</MenuItem>
                  {customers.map(customer => (
                    <MenuItem key={customer} value={customer}>{customer}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                sx={{ height: '56px' }}
              >
                Refresh Status
              </Button>
            </Grid>
          </Grid>

          {/* Device Grid */}
          <Grid container spacing={2}>
            {filteredDevices.map((device) => (
              <Grid item xs={12} md={6} lg={4} key={device.id}>
                <Card sx={{ 
                  height: '100%',
                  borderLeft: device.critical ? '4px solid' : 'none',
                  borderLeftColor: 'error.main',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getDeviceIcon(device.type)}
                        <Box>
                          <Typography variant="h6">
                            {device.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {device.ip}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={device.status}
                        color={getStatusColor(device.status) as any}
                        size="small"
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Customer: {device.customer}
                      </Typography>
                      {device.os && (
                        <Typography variant="body2" color="text.secondary">
                          OS: {device.os}
                        </Typography>
                      )}
                      {device.lastAccessed && (
                        <Typography variant="body2" color="text.secondary">
                          Last accessed: {device.lastAccessed}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      {device.protocols.map(protocol => (
                        <Chip
                          key={protocol}
                          label={protocol.toUpperCase()}
                          size="small"
                          icon={getProtocolIcon(protocol)}
                        />
                      ))}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<ConnectIcon />}
                        size="small"
                        disabled={device.status !== 'online'}
                        fullWidth
                        onClick={() => {
                          const protocol = device.protocols.includes('ssh') ? 'ssh' : device.protocols[0];
                          router.push(`/dashboard/remote-access/session?device=${device.name}&ip=${device.ip}&protocol=${protocol}&customer=${encodeURIComponent(device.customer)}&type=${device.type}`);
                        }}
                      >
                        Connect
                      </Button>
                      <IconButton size="small">
                        <InfoIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {selectedTab === 1 && (
        <Box>
          {/* Active Sessions */}
          {activeSessions.length === 0 ? (
            <Alert severity="info">No active remote sessions</Alert>
          ) : (
            <Grid container spacing={2}>
              {activeSessions.map((session) => (
                <Grid item xs={12} md={6} key={session.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">
                            {session.deviceName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {session.customer}
                          </Typography>
                        </Box>
                        {session.recording && (
                          <Chip
                            icon={<RecordIcon />}
                            label="Recording"
                            color="error"
                            size="small"
                          />
                        )}
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Protocol
                            </Typography>
                            <Typography variant="body1">
                              {session.protocol}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Duration
                            </Typography>
                            <Typography variant="body1">
                              {session.duration}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      <LinearProgress variant="determinate" value={70} sx={{ mb: 2 }} />

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          startIcon={<ScreenShareIcon />}
                          size="small"
                          fullWidth
                          onClick={() => {
                            // Use the active session data to navigate
                            const device = devices.find(d => d.id === session.deviceId);
                            if (device) {
                              const protocol = session.protocol.toLowerCase() as 'ssh' | 'rdp' | 'vnc';
                              router.push(`/dashboard/remote-access/session?device=${device.name}&ip=${device.ip}&protocol=${protocol}&customer=${encodeURIComponent(session.customer)}&type=${device.type}`);
                            }
                          }}
                        >
                          View Session
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DisconnectIcon />}
                          size="small"
                          fullWidth
                        >
                          Disconnect
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {selectedTab === 2 && (
        <Box>
          {/* Session History */}
          <Paper>
            <List>
              {sessionHistory.map((session, index) => (
                <React.Fragment key={session.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getProtocolIcon(session.protocol)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {session.deviceName}
                          </Typography>
                          <Chip label={session.customer} size="small" />
                          {session.recorded && (
                            <Chip
                              icon={<RecordIcon />}
                              label="Recorded"
                              size="small"
                              color="primary"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Technician: {session.technician} | Duration: {session.duration} | Actions: {session.actions}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {session.startTime} - {session.endTime}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<HistoryIcon />}
                      >
                        Playback
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < sessionHistory.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      )}

      {selectedTab === 3 && (
        <Box>
          {/* Quick Connect */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Connect
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Host / IP Address"
                    variant="outlined"
                    placeholder="192.168.1.100 or hostname.domain.com"
                  />
                  <FormControl fullWidth>
                    <InputLabel>Protocol</InputLabel>
                    <Select
                      value={selectedProtocol}
                      onChange={(e) => setSelectedProtocol(e.target.value)}
                      label="Protocol"
                    >
                      <MenuItem value="ssh">SSH</MenuItem>
                      <MenuItem value="rdp">RDP</MenuItem>
                      <MenuItem value="vnc">VNC</MenuItem>
                      <MenuItem value="https">HTTPS</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Port"
                    variant="outlined"
                    placeholder="22"
                    type="number"
                  />
                  <TextField
                    fullWidth
                    label="Username"
                    variant="outlined"
                  />
                  <FormControl fullWidth>
                    <InputLabel>Customer</InputLabel>
                    <Select label="Customer">
                      {customers.map(customer => (
                        <MenuItem key={customer} value={customer}>{customer}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Alert severity="info">
                    Session will be recorded for compliance
                  </Alert>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<ConnectIcon />}
                    fullWidth
                    onClick={() => {
                      // Quick connect functionality - for now navigate to SSH session with default values
                      router.push(`/dashboard/remote-access/session?device=QUICK-CONNECT&ip=192.168.1.100&protocol=${selectedProtocol}&customer=Quick Connect`);
                    }}
                  >
                    Connect
                  </Button>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Connection Templates
                </Typography>
                <List>
                  <ListItem button>
                    <ListItemIcon>
                      <ServerIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Production Web Server"
                      secondary="SSH - web-prod-01.techcorp.local:22"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem button>
                    <ListItemIcon>
                      <ComputerIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Accounting Workstation"
                      secondary="RDP - desktop-acct-05.finance.local:3389"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem button>
                    <ListItemIcon>
                      <SecurityIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Edge Firewall"
                      secondary="HTTPS - fw-edge-01.secure.net"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};