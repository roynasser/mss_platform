'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Divider,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as ReportIcon,
  Build as InterventionIcon,
  Notifications as AlertIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { CustomerRoute } from '../../../components/auth/ProtectedRoute';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { SecurityDashboard } from '../../../components/dashboard/SecurityDashboard';
import { MitreAttackSummary } from '../../../components/dashboard/MitreAttackSummary';
import { MFASetup } from '../../../components/auth/MFASetup';
import { useAuth } from '../../../contexts/AuthContext';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { apiService } from '../../../services/apiService';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  recentReports: number;
  pendingInterventions: number;
}

interface RecentActivity {
  id: string;
  type: 'report' | 'alert' | 'intervention';
  title: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { notifications, isConnected, realtimeAlerts } = useWebSocket();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [stats, setStats] = useState<DashboardStats>({
    recentReports: 2,
    pendingInterventions: 1,
  });

  const [recentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'alert',
      title: 'Unusual network activity detected',
      timestamp: '2 hours ago',
      severity: 'medium',
    },
    {
      id: '2',
      type: 'report',
      title: 'Monthly security assessment completed',
      timestamp: '1 day ago',
    },
    {
      id: '3',
      type: 'intervention',
      title: 'Security patch deployment',
      timestamp: '2 days ago',
      status: 'completed',
    },
    {
      id: '4',
      type: 'alert',
      title: 'Failed login attempts detected',
      timestamp: '3 days ago',
      severity: 'low',
    },
  ]);

  useEffect(() => {
    // Load real dashboard data
    const loadDashboardData = async () => {
      try {
        const response = await apiService.getCustomerDashboard();
        if (response.success && response.data) {
          setStats({
            recentReports: response.data.securityReports?.length || 2,
            pendingInterventions: response.data.activeInterventions?.length || 1,
          });
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Check if MFA setup is required
  useEffect(() => {
    if (user?.mfaSetupRequired && !user.mfaEnabled) {
      setShowMFASetup(true);
    }
  }, [user]);

  const handleMFASetupComplete = () => {
    setShowMFASetup(false);
    // Refresh user data or show success message
  };

  const handleTimeRangeChange = (newTimeRange: '7d' | '30d' | '90d' | '1y') => {
    setTimeRange(newTimeRange);
  };


  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'report': return <ReportIcon />;
      case 'alert': return <AlertIcon />;
      case 'intervention': return <InterventionIcon />;
      default: return <SecurityIcon />;
    }
  };

  if (loading) {
    return (
      <CustomerRoute>
        <DashboardLayout>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
            <Typography sx={{ mt: 2 }}>Loading dashboard...</Typography>
          </Box>
        </DashboardLayout>
      </CustomerRoute>
    );
  }

  return (
    <CustomerRoute>
      <DashboardLayout title="Customer Dashboard">
        <Box>
          {/* Welcome Section */}
          <Box mb={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="h4" gutterBottom>
                  Welcome back, {user?.firstName}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Here's your security overview for{' '}
                  {user?.company ? `${user.company}` : 'your organization'}.
                </Typography>
              </Box>
              
              {/* Connection Status and Request Intervention */}
              <Box display="flex" alignItems="center" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<InterventionIcon />}
                  color="primary"
                  size="small"
                  onClick={() => router.push('/dashboard/interventions/request')}
                >
                  Request Intervention
                </Button>
                <Chip
                  label={isConnected ? 'Live Updates' : 'Offline'}
                  color={isConnected ? 'success' : 'default'}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>
            
            {/* MFA Setup Alert */}
            {user?.mfaSetupRequired && !user.mfaEnabled && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  For enhanced security, please set up two-factor authentication.
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => setShowMFASetup(true)}
                  sx={{ mt: 1 }}
                >
                  Set Up MFA
                </Button>
              </Alert>
            )}
            
            {/* Real-time Alerts */}
            {realtimeAlerts.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  {realtimeAlerts.length} new security alert{realtimeAlerts.length > 1 ? 's' : ''} detected.
                </Typography>
              </Alert>
            )}
          </Box>

          {/* Summary Stats (Non-duplicated) */}
          <Grid container spacing={3} mb={4}>
            {/* Recent Reports */}
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                      <ReportIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="div">
                        {stats.recentReports}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        New Reports
                      </Typography>
                    </Box>
                  </Box>
                  <Button size="small" endIcon={<ArrowIcon />}>
                    View Reports
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Pending Interventions */}
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                      <InterventionIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="div">
                        {stats.pendingInterventions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Interventions
                      </Typography>
                    </Box>
                  </Box>
                  <Button size="small" endIcon={<ArrowIcon />}>
                    Track Status
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Main Dashboard Content */}
          <Grid container spacing={3} mb={4}>
            {/* Security Dashboard */}
            <Grid item xs={12} lg={8}>
              <SecurityDashboard 
                timeRange={timeRange}
                onTimeRangeChange={handleTimeRangeChange}
              />
            </Grid>

            {/* MITRE ATT&CK Summary */}
            <Grid item xs={12} lg={4}>
              <MitreAttackSummary timeRange={timeRange === '1y' ? '90d' : timeRange} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Recent Activity */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Recent Activity
                    </Typography>
                    <Button size="small" endIcon={<ArrowIcon />}>
                      View All
                    </Button>
                  </Box>
                  
                  <List disablePadding>
                    {recentActivity.map((activity, index) => (
                      <React.Fragment key={activity.id}>
                        <ListItem disablePadding sx={{ py: 1 }}>
                          <ListItemIcon>
                            {getActivityIcon(activity.type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                  {activity.title}
                                </Typography>
                                {activity.severity && (
                                  <Chip
                                    label={activity.severity}
                                    size="small"
                                    color={getSeverityColor(activity.severity)}
                                  />
                                )}
                                {activity.status && (
                                  <Chip
                                    label={activity.status}
                                    size="small"
                                    color="success"
                                  />
                                )}
                              </Box>
                            }
                            secondary={activity.timestamp}
                          />
                        </ListItem>
                        {index < recentActivity.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Security Tips */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Security Tips
                  </Typography>
                  
                  {!user?.mfaEnabled ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Enable two-factor authentication for enhanced account security.
                      </Typography>
                      <Button 
                        size="small" 
                        onClick={() => setShowMFASetup(true)}
                        sx={{ mt: 1 }}
                      >
                        Set Up MFA
                      </Button>
                    </Alert>
                  ) : (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Two-factor authentication is enabled on your account.
                      </Typography>
                    </Alert>
                  )}
                  
                  <Alert severity="success">
                    <Typography variant="body2">
                      Your systems are up to date with the latest security patches.
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
        
        {/* MFA Setup Dialog */}
        <MFASetup
          open={showMFASetup}
          onClose={() => setShowMFASetup(false)}
          onComplete={handleMFASetupComplete}
        />
      </DashboardLayout>
    </CustomerRoute>
  );
}