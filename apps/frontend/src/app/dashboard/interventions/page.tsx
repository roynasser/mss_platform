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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  Badge,
  Avatar,
} from '@mui/material';
import {
  Build as InterventionIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  Warning as PendingIcon,
  Error as FailedIcon,
  PlayArrow as RunIcon,
  Timer as TimerIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CustomerRoute } from '../../../components/auth/ProtectedRoute';

interface Intervention {
  id: string;
  title: string;
  description: string;
  type: 'patch_management' | 'security_update' | 'configuration' | 'incident_response';
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  assignedTo?: string;
  scheduledDate?: string;
  completedDate?: string;
  estimatedDuration: number; // in minutes
  actualDuration?: number;
  costSaved?: number;
  affectedSystems: string[];
  createdAt: string;
  updatedAt: string;
}

export default function InterventionsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  useEffect(() => {
    // Simulate loading interventions
    setTimeout(() => {
      const mockInterventions: Intervention[] = [
        {
          id: 'int-001',
          title: 'Critical Security Patch Deployment',
          description: 'Deploy critical Windows security patches to all workstations',
          type: 'security_update',
          status: 'scheduled',
          priority: 'critical',
          requestedBy: 'System',
          assignedTo: 'Tech Team',
          scheduledDate: '2024-01-18T22:00:00Z',
          estimatedDuration: 120,
          affectedSystems: ['WS-001', 'WS-002', 'WS-003', 'WS-004'],
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'int-002',
          title: 'Firewall Rule Configuration',
          description: 'Update firewall rules for new application deployment',
          type: 'configuration',
          status: 'completed',
          priority: 'high',
          requestedBy: 'john.customer@techcorp.com',
          assignedTo: 'Senior Tech',
          scheduledDate: '2024-01-14T18:00:00Z',
          completedDate: '2024-01-14T19:30:00Z',
          estimatedDuration: 60,
          actualDuration: 90,
          costSaved: 450,
          affectedSystems: ['FW-01', 'FW-02'],
          createdAt: '2024-01-12T14:00:00Z',
          updatedAt: '2024-01-14T19:30:00Z',
        },
        {
          id: 'int-003',
          title: 'Ransomware Incident Response',
          description: 'Emergency response to potential ransomware detection',
          type: 'incident_response',
          status: 'in_progress',
          priority: 'critical',
          requestedBy: 'Security Team',
          assignedTo: 'Expert Tech',
          estimatedDuration: 240,
          affectedSystems: ['SRV-DB-01', 'SRV-APP-01'],
          createdAt: '2024-01-16T08:00:00Z',
          updatedAt: '2024-01-16T10:00:00Z',
        },
        {
          id: 'int-004',
          title: 'Monthly Patch Cycle',
          description: 'Regular monthly patching for all servers',
          type: 'patch_management',
          status: 'pending',
          priority: 'medium',
          requestedBy: 'Automated',
          estimatedDuration: 180,
          affectedSystems: ['SRV-01', 'SRV-02', 'SRV-03', 'SRV-04', 'SRV-05'],
          createdAt: '2024-01-16T00:00:00Z',
          updatedAt: '2024-01-16T00:00:00Z',
        },
      ];

      // Filter based on user role
      if (user?.role === 'customer') {
        setInterventions(mockInterventions.filter(i => 
          i.requestedBy === user.email || i.requestedBy === 'System' || i.requestedBy === 'Automated'
        ));
      } else {
        setInterventions(mockInterventions);
      }
      
      setLoading(false);
    }, 1000);
  }, [user]);

  const getStatusIcon = (status: Intervention['status']) => {
    switch (status) {
      case 'completed':
        return <CompletedIcon color="success" />;
      case 'in_progress':
        return <RunIcon color="info" />;
      case 'scheduled':
        return <ScheduleIcon color="primary" />;
      case 'failed':
        return <FailedIcon color="error" />;
      default:
        return <PendingIcon color="warning" />;
    }
  };

  const getStatusColor = (status: Intervention['status']): 'success' | 'info' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'scheduled': return 'default';
      case 'failed': return 'error';
      default: return 'warning';
    }
  };

  const getPriorityColor = (priority: Intervention['priority']): 'error' | 'warning' | 'info' | 'success' => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  };

  const handleRequestIntervention = () => {
    router.push('/dashboard/interventions/request');
  };

  if (loading) {
    return (
      <CustomerRoute>
        <DashboardLayout>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
            <Typography sx={{ mt: 2 }}>{t('common.loading')}...</Typography>
          </Box>
        </DashboardLayout>
      </CustomerRoute>
    );
  }

  // Calculate stats
  const stats = {
    total: interventions.length,
    pending: interventions.filter(i => i.status === 'pending').length,
    inProgress: interventions.filter(i => i.status === 'in_progress').length,
    completed: interventions.filter(i => i.status === 'completed').length,
    totalSaved: interventions.reduce((sum, i) => sum + (i.costSaved || 0), 0),
  };

  return (
    <CustomerRoute>
      <DashboardLayout>
        <Box>
        {/* Header */}
        <Box mb={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InterventionIcon color="primary" />
              {t('navigation.interventions')}
            </Typography>
            {user?.role === 'customer' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleRequestIntervention}
              >
                {t('navigation.requestIntervention')}
              </Button>
            )}
          </Box>
          <Typography variant="body1" color="text.secondary">
            {t('interventionReports.interventionSummary')}
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <InterventionIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{stats.total}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('common.total')} {t('navigation.interventions')}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <PendingIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{stats.pending}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('status.pending')}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                    <RunIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{stats.inProgress}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('status.inProgress')}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <MoneyIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">${stats.totalSaved}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('interventionReports.costSaved')}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Interventions Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('navigation.allInterventions')}
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('forms.labels.title')}</TableCell>
                    <TableCell>{t('common.type')}</TableCell>
                    <TableCell>{t('table.headers.priority')}</TableCell>
                    <TableCell>{t('common.status')}</TableCell>
                    <TableCell>{t('table.headers.assignedTo')}</TableCell>
                    <TableCell>{t('table.headers.date')}</TableCell>
                    <TableCell align="center">{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {interventions.map((intervention) => (
                    <TableRow key={intervention.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {intervention.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {intervention.affectedSystems.length} systems affected
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={intervention.type.replace('_', ' ')} 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={t(`vulnerabilities.${intervention.priority}`)}
                          size="small"
                          color={getPriorityColor(intervention.priority)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(intervention.status)}
                          <Chip 
                            label={t(`status.${intervention.status}`)}
                            size="small"
                            color={getStatusColor(intervention.status)}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {intervention.assignedTo || '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {intervention.scheduledDate 
                            ? format(new Date(intervention.scheduledDate), 'MMM dd, HH:mm')
                            : format(new Date(intervention.createdAt), 'MMM dd, yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={t('common.viewDetails')}>
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {interventions.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('table.noData')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
        </Box>
      </DashboardLayout>
    </CustomerRoute>
  );
}