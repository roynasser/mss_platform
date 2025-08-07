'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Build as InterventionIcon,
  People as CustomersIcon,
  Assignment as ReportIcon,
  Computer as RemoteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Launch as LaunchIcon,
  Edit as EditIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { TechnicianRoute } from '../../../components/auth/ProtectedRoute';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';

interface TechnicianStats {
  assignedInterventions: number;
  activeCustomers: number;
  pendingReports: number;
  scheduledSessions: number;
}

interface ActiveIntervention {
  id: string;
  customerName: string;
  customerCompany: string;
  title: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'assigned' | 'in_progress' | 'scheduled';
  scheduledAt?: string;
}

interface CustomerEnvironment {
  id: string;
  customerName: string;
  company: string;
  status: 'online' | 'offline' | 'maintenance';
  lastAccess: string;
  securityScore: number;
}

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TechnicianStats>({
    assignedInterventions: 5,
    activeCustomers: 12,
    pendingReports: 3,
    scheduledSessions: 2,
  });

  const [activeInterventions] = useState<ActiveIntervention[]>([
    {
      id: '1',
      customerName: 'John Smith',
      customerCompany: 'TechCorp Inc.',
      title: 'Security patch deployment',
      type: 'security_patch',
      priority: 'high',
      status: 'in_progress',
    },
    {
      id: '2',
      customerName: 'Sarah Johnson',
      customerCompany: 'DataSys Ltd.',
      title: 'Network anomaly investigation',
      type: 'incident_response',
      priority: 'urgent',
      status: 'assigned',
    },
    {
      id: '3',
      customerName: 'Mike Davis',
      customerCompany: 'CloudNet Solutions',
      title: 'Remote desktop support',
      type: 'remote_access',
      priority: 'medium',
      status: 'scheduled',
      scheduledAt: '2024-01-15T14:00:00Z',
    },
  ]);

  const [customerEnvironments] = useState<CustomerEnvironment[]>([
    {
      id: '1',
      customerName: 'John Smith',
      company: 'TechCorp Inc.',
      status: 'online',
      lastAccess: '5 minutes ago',
      securityScore: 87,
    },
    {
      id: '2',
      customerName: 'Sarah Johnson',
      company: 'DataSys Ltd.',
      status: 'online',
      lastAccess: '12 minutes ago',
      securityScore: 92,
    },
    {
      id: '3',
      customerName: 'Mike Davis',
      company: 'CloudNet Solutions',
      status: 'maintenance',
      lastAccess: '2 hours ago',
      securityScore: 78,
    },
    {
      id: '4',
      customerName: 'Lisa Anderson',
      company: 'SecureBase Systems',
      status: 'offline',
      lastAccess: '1 day ago',
      securityScore: 85,
    },
  ]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <InterventionIcon color="primary" />;
      case 'assigned': return <WarningIcon color="warning" />;
      case 'scheduled': return <ScheduleIcon color="info" />;
      default: return <CheckIcon />;
    }
  };

  if (loading) {
    return (
      <TechnicianRoute>
        <DashboardLayout>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
            <Typography sx={{ mt: 2 }}>Loading dashboard...</Typography>
          </Box>
        </DashboardLayout>
      </TechnicianRoute>
    );
  }

  return (
    <TechnicianRoute>
      <DashboardLayout title="Technician Dashboard">
        <Box>
          {/* Welcome Section */}
          <Box mb={4}>
            <Typography variant="h4" gutterBottom>
              Welcome back, {user?.firstName}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Manage customer environments and interventions from your technician portal.
            </Typography>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <InterventionIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="div">
                        {stats.assignedInterventions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Assigned Interventions
                      </Typography>
                    </Box>
                  </Box>
                  <Button size="small" endIcon={<ArrowIcon />}>
                    Manage All
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                      <CustomersIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="div">
                        {stats.activeCustomers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Customers
                      </Typography>
                    </Box>
                  </Box>
                  <Button size="small" endIcon={<ArrowIcon />}>
                    View All
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                      <ReportIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="div">
                        {stats.pendingReports}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Reports
                      </Typography>
                    </Box>
                  </Box>
                  <Button size="small" endIcon={<ArrowIcon />}>
                    Review
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                      <RemoteIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="div">
                        {stats.scheduledSessions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Scheduled Sessions
                      </Typography>
                    </Box>
                  </Box>
                  <Button size="small" endIcon={<ArrowIcon />}>
                    View Schedule
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Active Interventions */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6">
                      Active Interventions
                    </Typography>
                    <Button size="small" endIcon={<ArrowIcon />}>
                      Manage All
                    </Button>
                  </Box>
                  
                  <List disablePadding>
                    {activeInterventions.map((intervention, index) => (
                      <React.Fragment key={intervention.id}>
                        <ListItem
                          disablePadding
                          secondaryAction={
                            <Box display="flex" gap={1}>
                              <Tooltip title="Edit intervention">
                                <IconButton size="small">
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<RemoteIcon />}
                                onClick={() => router.push('/dashboard/remote-access')}
                              >
                                Work on this
                              </Button>
                            </Box>
                          }
                        >
                          <ListItemIcon>
                            {getStatusIcon(intervention.status)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1} mb={0.5} component="div">
                                <Typography variant="body2" fontWeight="medium" component="span">
                                  {intervention.title}
                                </Typography>
                                <Chip
                                  label={intervention.priority}
                                  size="small"
                                  color={getPriorityColor(intervention.priority)}
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  {intervention.customerName} • {intervention.customerCompany}
                                </Typography>
                                <Chip
                                  label={intervention.status.replace('_', ' ')}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mt: 0.5 }}
                                />
                                {intervention.scheduledAt && (
                                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                    Scheduled: {new Date(intervention.scheduledAt).toLocaleString()}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < activeInterventions.length - 1 && <Divider sx={{ my: 1 }} />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>


            {/* Customer Environments */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6">
                      Customer Environments
                    </Typography>
                    <Button size="small" endIcon={<ArrowIcon />}>
                      View All
                    </Button>
                  </Box>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Customer</TableCell>
                          <TableCell>Company</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Security Score</TableCell>
                          <TableCell>Last Access</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customerEnvironments.map((env) => (
                          <TableRow key={env.id}>
                            <TableCell>{env.customerName}</TableCell>
                            <TableCell>{env.company}</TableCell>
                            <TableCell>
                              <Chip
                                label={env.status}
                                size="small"
                                color={getStatusColor(env.status)}
                              />
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <LinearProgress
                                  variant="determinate"
                                  value={env.securityScore}
                                  sx={{ width: 60, height: 6, borderRadius: 3 }}
                                  color={env.securityScore >= 80 ? 'success' : 
                                         env.securityScore >= 60 ? 'warning' : 'error'}
                                />
                                <Typography variant="caption">
                                  {env.securityScore}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{env.lastAccess}</TableCell>
                            <TableCell align="center">
                              <Tooltip title="Access environment">
                                <IconButton size="small" color="primary">
                                  <LaunchIcon />
                                </IconButton>
                              </Tooltip>
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
        </Box>
      </DashboardLayout>
    </TechnicianRoute>
  );
}