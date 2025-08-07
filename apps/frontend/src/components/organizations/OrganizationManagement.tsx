'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Avatar,
  Badge,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  TrendingUp as AnalyticsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
// Mock types for OrganizationManagement - these should be in the types file
type OrganizationType = 'customer' | 'mss_provider';
type OrganizationStatus = 'active' | 'suspended' | 'deleted';

interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  domain?: string;
  ssoEnabled: boolean;
  status: OrganizationStatus;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'technician' | 'admin';
  company?: string;
  isActive: boolean;
  mfaEnabled: boolean;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationManagementProps {
  userRole?: 'super_admin' | 'admin';
}

interface OrganizationWithStats extends Organization {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalReports: number;
    activeInterventions: number;
    lastActivity?: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`org-tabpanel-${index}`}
      aria-labelledby={`org-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const OrganizationManagement: React.FC<OrganizationManagementProps> = ({
  userRole = 'super_admin'
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithStats | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  const [orgDialog, setOrgDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit' | 'view';
    data: Partial<Organization>;
  }>({
    open: false,
    mode: 'create',
    data: {}
  });

  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockOrganizations: OrganizationWithStats[] = [
      {
        id: 'org-1',
        name: 'TechCorp Inc.',
        type: 'customer',
        domain: 'techcorp.com',
        ssoEnabled: true,
        status: 'active',
        settings: {
          mfaRequired: true,
          sessionTimeout: 30,
          notifications: true
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        createdBy: 'admin-1',
        stats: {
          totalUsers: 45,
          activeUsers: 42,
          totalReports: 128,
          activeInterventions: 3,
          lastActivity: '2024-01-15T14:30:00Z'
        }
      },
      {
        id: 'org-2',
        name: 'DataSys Ltd.',
        type: 'customer',
        domain: 'datasys.com',
        ssoEnabled: false,
        status: 'active',
        settings: {
          mfaRequired: false,
          sessionTimeout: 60,
          notifications: false
        },
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-14T16:20:00Z',
        createdBy: 'admin-1',
        stats: {
          totalUsers: 23,
          activeUsers: 20,
          totalReports: 67,
          activeInterventions: 1,
          lastActivity: '2024-01-14T11:15:00Z'
        }
      },
      {
        id: 'org-3',
        name: 'CloudNet Solutions',
        type: 'customer',
        domain: 'cloudnet.io',
        ssoEnabled: true,
        status: 'suspended',
        settings: {
          mfaRequired: true,
          sessionTimeout: 15,
          notifications: true
        },
        createdAt: '2024-01-08T00:00:00Z',
        updatedAt: '2024-01-12T09:45:00Z',
        createdBy: 'admin-2',
        stats: {
          totalUsers: 12,
          activeUsers: 0,
          totalReports: 34,
          activeInterventions: 0,
          lastActivity: '2024-01-12T08:30:00Z'
        }
      },
      {
        id: 'org-4',
        name: 'SecureBase Systems',
        type: 'customer',
        domain: 'securebase.net',
        ssoEnabled: false,
        status: 'active',
        settings: {
          mfaRequired: true,
          sessionTimeout: 45,
          notifications: true
        },
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z',
        createdBy: 'admin-1',
        stats: {
          totalUsers: 67,
          activeUsers: 58,
          totalReports: 203,
          activeInterventions: 5,
          lastActivity: '2024-01-15T13:45:00Z'
        }
      }
    ];
    
    setOrganizations(mockOrganizations);
    setLoading(false);
  };

  const handleOrgAction = (action: 'create' | 'edit' | 'view' | 'delete', org?: OrganizationWithStats) => {
    switch (action) {
      case 'create':
        setOrgDialog({
          open: true,
          mode: 'create',
          data: {
            type: 'customer',
            status: 'active',
            ssoEnabled: false
          }
        });
        break;
      
      case 'edit':
        if (org) {
          setOrgDialog({
            open: true,
            mode: 'edit',
            data: org
          });
        }
        break;
      
      case 'view':
        if (org) {
          setSelectedOrg(org);
          setTabValue(0);
        }
        break;
      
      case 'delete':
        if (org) {
          // Show confirmation dialog
          console.log('Delete organization:', org.id);
        }
        break;
    }
  };

  const handleOrgSave = () => {
    // Simulate API save
    console.log('Saving organization:', orgDialog.data);
    
    if (orgDialog.mode === 'create') {
      const newOrg: OrganizationWithStats = {
        id: `org-${Date.now()}`,
        name: orgDialog.data.name || '',
        type: orgDialog.data.type as OrganizationType || 'customer',
        domain: orgDialog.data.domain,
        ssoEnabled: orgDialog.data.ssoEnabled || false,
        status: orgDialog.data.status as OrganizationStatus || 'active',
        settings: orgDialog.data.settings || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-admin',
        stats: {
          totalUsers: 0,
          activeUsers: 0,
          totalReports: 0,
          activeInterventions: 0
        }
      };
      
      setOrganizations(prev => [...prev, newOrg]);
    } else if (orgDialog.mode === 'edit') {
      setOrganizations(prev => 
        prev.map(org => 
          org.id === orgDialog.data.id 
            ? { ...org, ...orgDialog.data, updatedAt: new Date().toISOString() }
            : org
        )
      );
    }
    
    setOrgDialog(prev => ({ ...prev, open: false }));
  };

  const getStatusIcon = (status: OrganizationStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon color="success" />;
      case 'suspended':
        return <WarningIcon color="warning" />;
      case 'deleted':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: OrganizationStatus): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'deleted':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesType = filters.type === 'all' || org.type === filters.type;
    const matchesStatus = filters.status === 'all' || org.status === filters.status;
    const matchesSearch = !filters.search || 
      org.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (org.domain && org.domain.toLowerCase().includes(filters.search.toLowerCase()));
    
    return matchesType && matchesStatus && matchesSearch;
  });

  if (loading && organizations.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BusinessIcon sx={{ mr: 1 }} />
            <Typography variant="h6">{t('admin.organizationManagement')}</Typography>
          </Box>
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>{t('common.loadingOrganizations')}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {/* Main Organizations List */}
        {!selectedOrg && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">{t('admin.organizations')}</Typography>
                    <Badge badgeContent={filteredOrganizations.length} color="primary" sx={{ ml: 2 }}>
                      <Box />
                    </Badge>
                  </Box>
                  {userRole === 'super_admin' && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => handleOrgAction('create')}
                    >
                      {t('admin.addOrganization')}
                    </Button>
                  )}
                </Box>

                {/* Filters */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t('common.search')}
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      placeholder={t('admin.nameOrDomain')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{t('common.type')}</InputLabel>
                      <Select
                        value={filters.type}
                        label={t('common.type')}
                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <MenuItem value="all">{t('common.allTypes')}</MenuItem>
                        <MenuItem value="customer">{t('common.customer')}</MenuItem>
                        <MenuItem value="mss_provider">{t('admin.mssProvider')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{t('common.status')}</InputLabel>
                      <Select
                        value={filters.status}
                        label={t('common.status')}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <MenuItem value="all">{t('common.allStatuses')}</MenuItem>
                        <MenuItem value="active">{t('common.active')}</MenuItem>
                        <MenuItem value="suspended">{t('common.suspended')}</MenuItem>
                        <MenuItem value="deleted">{t('common.deleted')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Organizations Table */}
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('admin.organization')}</TableCell>
                        <TableCell>{t('common.type')}</TableCell>
                        <TableCell>{t('common.status')}</TableCell>
                        <TableCell align="center">{t('common.users')}</TableCell>
                        <TableCell align="center">{t('common.reports')}</TableCell>
                        <TableCell align="center">{t('common.interventions')}</TableCell>
                        <TableCell>{t('common.lastActivity')}</TableCell>
                        <TableCell align="center">{t('common.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredOrganizations.map((org) => (
                        <TableRow key={org.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ width: 32, height: 32, mr: 2 }}>
                                {org.name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {org.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {org.domain || t('admin.noDomain')}
                                </Typography>
                              </Box>
                              {org.ssoEnabled && (
                                <Tooltip title={t('admin.ssoEnabled')}>
                                  <SecurityIcon sx={{ ml: 1, fontSize: '1rem', color: 'primary.main' }} />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={org.type === 'mss_provider' ? t('admin.mssProvider') : t('common.customer')} 
                              size="small"
                              color={org.type === 'mss_provider' ? 'secondary' : 'primary'}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getStatusIcon(org.status)}
                              <Chip 
                                label={org.status} 
                                size="small" 
                                color={getStatusColor(org.status)}
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {org.stats.activeUsers}/{org.stats.totalUsers}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t('common.activeTotal')}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {org.stats.totalReports}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {org.stats.activeInterventions}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {org.stats.lastActivity 
                                ? new Date(org.stats.lastActivity).toLocaleString()
                                : t('common.noActivity')}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={t('common.viewDetails')}>
                              <IconButton size="small" onClick={() => handleOrgAction('view', org)}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {userRole === 'super_admin' && (
                              <>
                                <Tooltip title={t('common.edit')}>
                                  <IconButton size="small" onClick={() => handleOrgAction('edit', org)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('common.delete')}>
                                  <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={() => handleOrgAction('delete', org)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {filteredOrganizations.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.noOrganizationsFound')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Organization Detail View */}
        {selectedOrg && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ width: 48, height: 48, mr: 2 }}>
                      {selectedOrg.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h5">{selectedOrg.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedOrg.domain} • {selectedOrg.type === 'mss_provider' ? t('admin.mssProvider') : t('common.customer')}
                      </Typography>
                    </Box>
                    <Chip 
                      label={selectedOrg.status} 
                      color={getStatusColor(selectedOrg.status)}
                      sx={{ ml: 2 }}
                    />
                  </Box>
                  <Box>
                    <Button onClick={() => setSelectedOrg(null)}>
                      {t('common.backToList')}
                    </Button>
                    {userRole === 'super_admin' && (
                      <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => handleOrgAction('edit', selectedOrg)}
                        sx={{ ml: 1 }}
                      >
                        {t('common.edit')}
                      </Button>
                    )}
                  </Box>
                </Box>

                <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
                  <Tab label={t('common.overview')} />
                  <Tab label={t('common.users')} />
                  <Tab label={t('common.settings')} />
                  <Tab label={t('common.activity')} />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PeopleIcon color="primary" sx={{ mr: 2 }} />
                            <Box>
                              <Typography variant="h4">{selectedOrg.stats.totalUsers}</Typography>
                              <Typography variant="body2" color="text.secondary">{t('admin.totalUsers')}</Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SecurityIcon color="success" sx={{ mr: 2 }} />
                            <Box>
                              <Typography variant="h4">{selectedOrg.stats.totalReports}</Typography>
                              <Typography variant="body2" color="text.secondary">{t('admin.securityReports')}</Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AnalyticsIcon color="warning" sx={{ mr: 2 }} />
                            <Box>
                              <Typography variant="h4">{selectedOrg.stats.activeInterventions}</Typography>
                              <Typography variant="body2" color="text.secondary">{t('admin.activeInterventions')}</Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircleIcon color="info" sx={{ mr: 2 }} />
                            <Box>
                              <Typography variant="h4">{selectedOrg.stats.activeUsers}</Typography>
                              <Typography variant="body2" color="text.secondary">{t('admin.activeUsers')}</Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <Typography variant="h6" gutterBottom>{t('admin.userManagement')}</Typography>
                  <Alert severity="info">
                    {t('admin.userManagementInfo')}
                  </Alert>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Typography variant="h6" gutterBottom>{t('admin.organizationSettings')}</Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <SecurityIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('admin.multiFactorAuthentication')}
                        secondary={selectedOrg.settings.mfaRequired ? t('admin.requiredForAllUsers') : t('admin.optional')}
                      />
                      <ListItemSecondaryAction>
                        <Chip 
                          label={selectedOrg.settings.mfaRequired ? t('admin.required') : t('admin.optional')}
                          color={selectedOrg.settings.mfaRequired ? 'success' : 'default'}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <SettingsIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('admin.ssoConfiguration')}
                        secondary={selectedOrg.ssoEnabled ? t('admin.ssoEnabledText') : t('admin.standardAuthentication')}
                      />
                      <ListItemSecondaryAction>
                        <Chip 
                          label={selectedOrg.ssoEnabled ? t('common.enabled') : t('common.disabled')}
                          color={selectedOrg.ssoEnabled ? 'success' : 'default'}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                  <Typography variant="h6" gutterBottom>{t('common.recentActivity')}</Typography>
                  <Alert severity="info">
                    {t('admin.activityLogInfo')}
                  </Alert>
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Organization Dialog */}
      <Dialog 
        open={orgDialog.open} 
        onClose={() => setOrgDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {orgDialog.mode === 'create' ? t('admin.addNewOrganization') : t('admin.editOrganization')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label={t('admin.organizationName')}
                value={orgDialog.data.name || ''}
                onChange={(e) => setOrgDialog(prev => ({
                  ...prev,
                  data: { ...prev.data, name: e.target.value }
                }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('admin.domain')}
                value={orgDialog.data.domain || ''}
                onChange={(e) => setOrgDialog(prev => ({
                  ...prev,
                  data: { ...prev.data, domain: e.target.value }
                }))}
                placeholder="example.com"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('common.type')}</InputLabel>
                <Select
                  value={orgDialog.data.type || 'customer'}
                  label={t('common.type')}
                  onChange={(e) => setOrgDialog(prev => ({
                    ...prev,
                    data: { ...prev.data, type: e.target.value as OrganizationType }
                  }))}
                >
                  <MenuItem value="customer">{t('common.customer')}</MenuItem>
                  <MenuItem value="mss_provider">{t('admin.mssProvider')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('common.status')}</InputLabel>
                <Select
                  value={orgDialog.data.status || 'active'}
                  label={t('common.status')}
                  onChange={(e) => setOrgDialog(prev => ({
                    ...prev,
                    data: { ...prev.data, status: e.target.value as OrganizationStatus }
                  }))}
                >
                  <MenuItem value="active">{t('common.active')}</MenuItem>
                  <MenuItem value="suspended">{t('common.suspended')}</MenuItem>
                  <MenuItem value="deleted">{t('common.deleted')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrgDialog(prev => ({ ...prev, open: false }))}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleOrgSave}
            disabled={!orgDialog.data.name}
          >
            {orgDialog.mode === 'create' ? t('admin.createOrganization') : t('admin.updateOrganization')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};