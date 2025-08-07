'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFormatters } from '../../hooks/useFormatters';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Build as InterventionIcon,
  AttachMoney as CostIcon,
  TrendingDown as SavingsIcon,
  Schedule as TimeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  ExpandMore as ExpandIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  CalendarToday as DateIcon,
  Engineering as TechnicianIcon,
  Business as BusinessHoursIcon,
  NightsStay as AfterHoursIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Computer as DeviceIcon,
  LocationOn as LocationIcon,
  Assignment as TaskIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface InterventionReport {
  id: string;
  title: string;
  date: string;
  type: 'patch' | 'update' | 'configuration' | 'security_fix' | 'maintenance';
  description: string;
  appliances: ApplianceIntervention[];
  totalCostSaved: number;
  totalTimeSaved: number;
  cveAddressed: string[];
  technicianLevel: 'junior' | 'senior' | 'expert';
  executionWindow: 'business_hours' | 'after_hours' | 'weekend' | 'emergency';
  status: 'completed' | 'scheduled' | 'in_progress';
  duration: number; // in hours
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  customerBenefit: string;
}

interface ApplianceIntervention {
  id: string;
  name: string;
  type: string;
  model: string;
  location: string;
  interventionTime: number; // in minutes
  manualCost: number;
  technicianCost: number;
  downtimeAvoided: number; // in hours
  cveFixed: string[];
  beforeVersion?: string;
  afterVersion?: string;
}

interface CostBreakdown {
  laborCost: number;
  downtimeCost: number;
  afterHoursSurcharge: number;
  seniorityMultiplier: number;
  totalManualCost: number;
  mssServiceCost: number;
  totalSaved: number;
  percentageSaved: number;
}

const getCVESummary = (cveId: string): string => {
  const cveData: { [key: string]: string } = {
    'CVE-2024-0132': 'Authentication bypass vulnerability in web management interface allowing remote code execution',
    'CVE-2024-0145': 'Buffer overflow in packet processing module leading to denial of service',
    'CVE-2024-0167': 'Privilege escalation vulnerability in configuration management system',
    'CVE-2024-0089': 'Cross-site scripting (XSS) vulnerability in administrative interface',
    'CVE-2024-0091': 'SQL injection vulnerability in user authentication module',
    'CVE-2024-0234': 'Authentication bypass in SSL/TLS certificate validation process',
    'CVE-2024-0235': 'Memory corruption vulnerability in firewall rule processing',
    'CVE-2024-0236': 'Directory traversal vulnerability allowing unauthorized file access',
    'CVE-2024-0301': 'BGP routing vulnerability allowing route hijacking attacks',
    'CVE-2024-0302': 'Denial of service vulnerability in routing engine protocol handling',
    'CVE-2024-0198': 'VPN authentication bypass vulnerability in SSL VPN implementation'
  };
  
  return cveData[cveId] || `Security vulnerability ${cveId} - Critical security issue requiring immediate patching`;
};

export const InterventionReports: React.FC = () => {
  const { t } = useLanguage();
  const { formatCurrency, formatDate, formatNumber } = useFormatters();
  const [reports, setReports] = useState<InterventionReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<InterventionReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Comprehensive demo data with realistic scenarios
  const demoReports: InterventionReport[] = [
    {
      id: 'int-001',
      title: 'Critical Security Patch Deployment - CheckPoint Firewalls',
      date: '2024-01-16',
      type: 'security_fix',
      description: 'Emergency deployment of critical security patches addressing zero-day vulnerabilities in CheckPoint firewall infrastructure. Patches applied during maintenance window with zero downtime using HA failover.',
      appliances: [
        {
          id: 'fw-001',
          name: 'CP-FW-DC1-Primary',
          type: 'Firewall',
          model: 'CheckPoint 6200',
          location: 'Data Center 1 - Rack A15',
          interventionTime: 45,
          manualCost: 650,
          technicianCost: 150,
          downtimeAvoided: 4,
          cveFixed: ['CVE-2024-0132', 'CVE-2024-0145', 'CVE-2024-0167'],
          beforeVersion: 'R81.10',
          afterVersion: 'R81.20'
        },
        {
          id: 'fw-002',
          name: 'CP-FW-DC1-Secondary',
          type: 'Firewall',
          model: 'CheckPoint 6200',
          location: 'Data Center 1 - Rack A16',
          interventionTime: 45,
          manualCost: 650,
          technicianCost: 150,
          downtimeAvoided: 4,
          cveFixed: ['CVE-2024-0132', 'CVE-2024-0145', 'CVE-2024-0167'],
          beforeVersion: 'R81.10',
          afterVersion: 'R81.20'
        },
        {
          id: 'fw-003',
          name: 'CP-FW-DC2-Primary',
          type: 'Firewall',
          model: 'CheckPoint 6500',
          location: 'Data Center 2 - Rack B10',
          interventionTime: 50,
          manualCost: 750,
          technicianCost: 175,
          downtimeAvoided: 4,
          cveFixed: ['CVE-2024-0132', 'CVE-2024-0145', 'CVE-2024-0167'],
          beforeVersion: 'R81.10',
          afterVersion: 'R81.20'
        },
        {
          id: 'fw-004',
          name: 'CP-FW-DC2-Secondary',
          type: 'Firewall',
          model: 'CheckPoint 6500',
          location: 'Data Center 2 - Rack B11',
          interventionTime: 50,
          manualCost: 750,
          technicianCost: 175,
          downtimeAvoided: 4,
          cveFixed: ['CVE-2024-0132', 'CVE-2024-0145', 'CVE-2024-0167'],
          beforeVersion: 'R81.10',
          afterVersion: 'R81.20'
        }
      ],
      totalCostSaved: 5200,
      totalTimeSaved: 8,
      cveAddressed: ['CVE-2024-0132', 'CVE-2024-0145', 'CVE-2024-0167'],
      technicianLevel: 'expert',
      executionWindow: 'emergency',
      status: 'completed',
      duration: 3.5,
      impactLevel: 'critical',
      customerBenefit: 'Prevented potential security breach and maintained 100% uptime during critical patch deployment'
    },
    {
      id: 'int-002',
      title: 'Cisco Switch Firmware Update - Campus Network',
      date: '2024-01-15',
      type: 'update',
      description: 'Comprehensive firmware update for all Cisco switches across campus network. Updates include security enhancements, performance improvements, and new management features.',
      appliances: Array.from({ length: 24 }, (_, i) => ({
        id: `switch-${i + 1}`,
        name: `CISCO-SW-${String(i + 1).padStart(3, '0')}`,
        type: 'Network Switch',
        model: 'Cisco Catalyst 9300',
        location: `Building ${Math.floor(i / 6) + 1} - Floor ${(i % 6) + 1}`,
        interventionTime: 30,
        manualCost: 350,
        technicianCost: 75,
        downtimeAvoided: 2,
        cveFixed: ['CVE-2024-0089', 'CVE-2024-0091'],
        beforeVersion: '16.12.4',
        afterVersion: '17.9.1'
      })),
      totalCostSaved: 15800,
      totalTimeSaved: 48,
      cveAddressed: ['CVE-2024-0089', 'CVE-2024-0091'],
      technicianLevel: 'senior',
      executionWindow: 'weekend',
      status: 'completed',
      duration: 12,
      impactLevel: 'high',
      customerBenefit: 'Network performance improved by 25%, new security features enabled, zero downtime during business hours'
    },
    {
      id: 'int-003',
      title: 'WiFi Access Point Security Hardening',
      date: '2024-01-14',
      type: 'configuration',
      description: 'Security configuration hardening for all wireless access points including WPA3 enablement, rogue AP detection, and client isolation.',
      appliances: Array.from({ length: 45 }, (_, i) => ({
        id: `ap-${i + 1}`,
        name: `AP-${String(i + 1).padStart(3, '0')}`,
        type: 'Access Point',
        model: 'Aruba AP-515',
        location: `Zone ${Math.floor(i / 5) + 1} - Position ${(i % 5) + 1}`,
        interventionTime: 15,
        manualCost: 150,
        technicianCost: 35,
        downtimeAvoided: 0.5,
        cveFixed: [],
        beforeVersion: '8.7.1.0',
        afterVersion: '8.10.0.0'
      })),
      totalCostSaved: 8500,
      totalTimeSaved: 22.5,
      cveAddressed: [],
      technicianLevel: 'junior',
      executionWindow: 'business_hours',
      status: 'completed',
      duration: 11.25,
      impactLevel: 'medium',
      customerBenefit: 'Enhanced wireless security posture, reduced risk of unauthorized access, improved guest network isolation'
    },
    {
      id: 'int-004',
      title: 'FortiGate Cluster Performance Optimization',
      date: '2024-01-13',
      type: 'maintenance',
      description: 'Performance tuning and optimization of FortiGate firewall cluster including policy cleanup, routing optimization, and hardware acceleration configuration.',
      appliances: [
        {
          id: 'fg-001',
          name: 'FG-3000D-Primary',
          type: 'Firewall',
          model: 'FortiGate 3000D',
          location: 'Core Network Room',
          interventionTime: 120,
          manualCost: 1500,
          technicianCost: 300,
          downtimeAvoided: 0,
          cveFixed: [],
          beforeVersion: '7.2.3',
          afterVersion: '7.2.5'
        },
        {
          id: 'fg-002',
          name: 'FG-3000D-Secondary',
          type: 'Firewall',
          model: 'FortiGate 3000D',
          location: 'Core Network Room',
          interventionTime: 120,
          manualCost: 1500,
          technicianCost: 300,
          downtimeAvoided: 0,
          cveFixed: [],
          beforeVersion: '7.2.3',
          afterVersion: '7.2.5'
        }
      ],
      totalCostSaved: 4200,
      totalTimeSaved: 8,
      cveAddressed: [],
      technicianLevel: 'expert',
      executionWindow: 'after_hours',
      status: 'completed',
      duration: 4,
      impactLevel: 'low',
      customerBenefit: 'Firewall throughput increased by 40%, reduced latency by 15ms, improved VPN performance'
    },
    {
      id: 'int-005',
      title: 'Palo Alto Networks Critical Update',
      date: '2024-01-12',
      type: 'patch',
      description: 'Critical security update for Palo Alto Networks firewalls addressing authentication bypass vulnerability.',
      appliances: Array.from({ length: 6 }, (_, i) => ({
        id: `pa-${i + 1}`,
        name: `PA-${i < 3 ? '5220' : '3220'}-${i + 1}`,
        type: 'Firewall',
        model: i < 3 ? 'PA-5220' : 'PA-3220',
        location: `Branch Office ${i + 1}`,
        interventionTime: 60,
        manualCost: 850,
        technicianCost: 200,
        downtimeAvoided: 3,
        cveFixed: ['CVE-2024-0234', 'CVE-2024-0235', 'CVE-2024-0236'],
        beforeVersion: '10.2.3',
        afterVersion: '10.2.4-h1'
      })),
      totalCostSaved: 7800,
      totalTimeSaved: 18,
      cveAddressed: ['CVE-2024-0234', 'CVE-2024-0235', 'CVE-2024-0236'],
      technicianLevel: 'senior',
      executionWindow: 'after_hours',
      status: 'completed',
      duration: 6,
      impactLevel: 'critical',
      customerBenefit: 'Mitigated critical authentication bypass vulnerability, maintained security compliance'
    },
    {
      id: 'int-006',
      title: 'Load Balancer Configuration Update',
      date: '2024-01-11',
      type: 'configuration',
      description: 'Configuration updates for F5 load balancers including SSL/TLS optimization, health check tuning, and traffic distribution improvements.',
      appliances: [
        {
          id: 'f5-001',
          name: 'F5-BIG-IP-i5800-01',
          type: 'Load Balancer',
          model: 'F5 BIG-IP i5800',
          location: 'Data Center 1',
          interventionTime: 90,
          manualCost: 1200,
          technicianCost: 250,
          downtimeAvoided: 2,
          cveFixed: [],
          beforeVersion: '15.1.5',
          afterVersion: '16.1.3'
        },
        {
          id: 'f5-002',
          name: 'F5-BIG-IP-i5800-02',
          type: 'Load Balancer',
          model: 'F5 BIG-IP i5800',
          location: 'Data Center 2',
          interventionTime: 90,
          manualCost: 1200,
          technicianCost: 250,
          downtimeAvoided: 2,
          cveFixed: [],
          beforeVersion: '15.1.5',
          afterVersion: '16.1.3'
        }
      ],
      totalCostSaved: 3700,
      totalTimeSaved: 7,
      cveAddressed: [],
      technicianLevel: 'expert',
      executionWindow: 'business_hours',
      status: 'scheduled',
      duration: 3,
      impactLevel: 'medium',
      customerBenefit: 'Improved application response time by 30%, enhanced SSL/TLS security, better traffic distribution'
    },
    {
      id: 'int-007',
      title: 'Juniper Router Security Patch',
      date: '2024-01-10',
      type: 'security_fix',
      description: 'Security patches for Juniper MX series routers addressing BGP vulnerabilities and routing engine issues.',
      appliances: Array.from({ length: 8 }, (_, i) => ({
        id: `mx-${i + 1}`,
        name: `JUNIPER-MX${i < 4 ? '480' : '240'}-${i + 1}`,
        type: 'Router',
        model: i < 4 ? 'MX480' : 'MX240',
        location: `POP ${i + 1}`,
        interventionTime: 75,
        manualCost: 950,
        technicianCost: 225,
        downtimeAvoided: 5,
        cveFixed: ['CVE-2024-0301', 'CVE-2024-0302'],
        beforeVersion: 'JUNOS 21.4R3',
        afterVersion: 'JUNOS 22.2R3'
      })),
      totalCostSaved: 11200,
      totalTimeSaved: 40,
      cveAddressed: ['CVE-2024-0301', 'CVE-2024-0302'],
      technicianLevel: 'expert',
      executionWindow: 'weekend',
      status: 'scheduled',
      duration: 10,
      impactLevel: 'high',
      customerBenefit: 'Protected against BGP hijacking attempts, improved routing stability, zero service interruption'
    },
    {
      id: 'int-008',
      title: 'SonicWall VPN Gateway Update',
      date: '2024-01-09',
      type: 'update',
      description: 'Firmware update for SonicWall VPN gateways improving performance and adding MFA support.',
      appliances: Array.from({ length: 3 }, (_, i) => ({
        id: `sw-vpn-${i + 1}`,
        name: `SonicWall-NSa-4700-${i + 1}`,
        type: 'VPN Gateway',
        model: 'NSa 4700',
        location: `Data Center ${i + 1}`,
        interventionTime: 45,
        manualCost: 550,
        technicianCost: 125,
        downtimeAvoided: 1,
        cveFixed: ['CVE-2024-0198'],
        beforeVersion: 'SonicOS 7.0.1',
        afterVersion: 'SonicOS 7.1.0'
      })),
      totalCostSaved: 2625,
      totalTimeSaved: 3,
      cveAddressed: ['CVE-2024-0198'],
      technicianLevel: 'senior',
      executionWindow: 'after_hours',
      status: 'in_progress',
      duration: 2.25,
      impactLevel: 'medium',
      customerBenefit: 'Enhanced VPN security with MFA, improved connection stability, 20% performance increase'
    }
  ];

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setReports(demoReports);
      setLoading(false);
    }, 1000);
  }, [timeRange, typeFilter]);

  const calculateCostBreakdown = (report: InterventionReport): CostBreakdown => {
    const baseLabor = report.appliances.reduce((sum, app) => sum + app.manualCost, 0);
    const downtimeCost = report.appliances.reduce((sum, app) => sum + (app.downtimeAvoided * 500), 0);
    
    let afterHoursSurcharge = 0;
    if (report.executionWindow === 'after_hours') {
      afterHoursSurcharge = baseLabor * 0.5;
    } else if (report.executionWindow === 'weekend') {
      afterHoursSurcharge = baseLabor * 1.0;
    } else if (report.executionWindow === 'emergency') {
      afterHoursSurcharge = baseLabor * 1.5;
    }
    
    let seniorityMultiplier = 1;
    if (report.technicianLevel === 'senior') {
      seniorityMultiplier = 1.5;
    } else if (report.technicianLevel === 'expert') {
      seniorityMultiplier = 2.0;
    }
    
    const totalManualCost = (baseLabor * seniorityMultiplier) + afterHoursSurcharge + downtimeCost;
    const mssServiceCost = report.appliances.reduce((sum, app) => sum + app.technicianCost, 0);
    const totalSaved = totalManualCost - mssServiceCost;
    const percentageSaved = Math.round((totalSaved / totalManualCost) * 100);
    
    return {
      laborCost: baseLabor,
      downtimeCost,
      afterHoursSurcharge,
      seniorityMultiplier,
      totalManualCost,
      mssServiceCost,
      totalSaved,
      percentageSaved
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'scheduled': return 'info';
      default: return 'default';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };


  const filteredReports = reports.filter(report => {
    if (typeFilter !== 'all' && report.type !== typeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>{t('common.loading')}...</Typography>
      </Box>
    );
  }

  const totalSavings = reports.reduce((sum, report) => sum + report.totalCostSaved, 0);
  const totalInterventions = reports.reduce((sum, report) => sum + report.appliances.length, 0);
  const totalCVEsFixed = new Set(reports.flatMap(r => r.cveAddressed)).size;
  const totalHoursSaved = reports.reduce((sum, report) => sum + report.totalTimeSaved, 0);

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InterventionIcon color="primary" />
          {t('reports.intervention.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('reports.intervention.description')}
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <SavingsIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{formatCurrency(totalSavings)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('reports.intervention.costSaved')}
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
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <DeviceIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{totalInterventions}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('reports.intervention.devicesUpdated')}
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
                  <SecurityIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{totalCVEsFixed}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('reports.intervention.cveFixed')}
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
                  <TimeIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{Math.round(totalHoursSaved)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('reports.intervention.timeSaved')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('common.timeRange')}</InputLabel>
          <Select
            value={timeRange}
            label={t('common.timeRange')}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="7d">{t('common.timeRange.7d')}</MenuItem>
            <MenuItem value="30d">{t('common.timeRange.30d')}</MenuItem>
            <MenuItem value="90d">{t('common.timeRange.90d')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('common.type')}</InputLabel>
          <Select
            value={typeFilter}
            label={t('common.type')}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="all">{t('common.allTypes')}</MenuItem>
            <MenuItem value="patch">{t('interventionType.patch')}</MenuItem>
            <MenuItem value="update">{t('interventionType.update')}</MenuItem>
            <MenuItem value="configuration">{t('interventionType.configuration')}</MenuItem>
            <MenuItem value="security_fix">{t('interventionType.securityFix')}</MenuItem>
            <MenuItem value="maintenance">{t('interventionType.maintenance')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Cost Savings Alert */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="h6">
          {t('reports.intervention.savedMessage', { amount: formatCurrency(totalSavings) })}
        </Typography>
        <Typography variant="body2">
          {t('reports.intervention.benefitDescription', { devices: formatNumber(totalInterventions) })}
        </Typography>
      </Alert>

      {/* Reports List */}
      <Grid container spacing={3}>
        {filteredReports.map((report) => {
          const costBreakdown = calculateCostBreakdown(report);
          const isExpanded = expandedReport === report.id;
          
          return (
            <Grid item xs={12} key={report.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {report.title}
                      </Typography>
                      <Box display="flex" gap={1} mb={1}>
                        <Chip 
                          icon={<DateIcon />}
                          label={formatDate(new Date(report.date))} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          icon={<DeviceIcon />}
                          label={`${formatNumber(report.appliances.length)} ${t('common.devices')}`} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          icon={<TechnicianIcon />}
                          label={t(`technicianLevel.${report.technicianLevel}`)} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          icon={report.executionWindow === 'business_hours' ? <BusinessHoursIcon /> : <AfterHoursIcon />}
                          label={t(`executionWindow.${report.executionWindow}`)} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Box display="flex" flexDirection="column" alignItems="end" gap={1}>
                      <Chip
                        label={t(`status.${report.status}`)}
                        color={getStatusColor(report.status)}
                      />
                      <Chip
                        label={`${t('common.impact')}: ${t(`severity.${report.impactLevel}`)}`}
                        size="small"
                        color={getImpactColor(report.impactLevel)}
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {report.description}
                  </Typography>

                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={12} sm={3}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="success.main">
                          {formatCurrency(costBreakdown.totalSaved)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('reports.intervention.costSaved')} ({costBreakdown.percentageSaved}%)
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Box textAlign="center">
                        <Typography variant="h5">
                          {formatNumber(report.totalTimeSaved)}h
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('reports.intervention.timeSaved')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Box textAlign="center">
                        <Typography variant="h5">
                          {formatNumber(report.cveAddressed.length)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('reports.intervention.cveFixed')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Box textAlign="center">
                        <Typography variant="h5">
                          {formatNumber(report.duration)}h
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('common.duration')}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {report.cveAddressed.length > 0 && (
                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      {report.cveAddressed.map(cve => (
                        <Tooltip
                          key={cve}
                          title={getCVESummary(cve)}
                          placement="top"
                        >
                          <Chip
                            label={cve}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  )}

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      <strong>{t('reports.intervention.customerBenefit')}:</strong> {report.customerBenefit}
                    </Typography>
                    <Button 
                      size="small" 
                      onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                      endIcon={isExpanded ? <ExpandIcon sx={{ transform: 'rotate(180deg)' }} /> : <ExpandIcon />}
                    >
                      {isExpanded ? t('common.hideDetails') : t('common.viewDetails')}
                    </Button>
                  </Box>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <Box mt={3}>
                      <Divider sx={{ mb: 2 }} />
                      
                      {/* Cost Breakdown */}
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>
                            {t('reports.intervention.costBreakdown')}
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableBody>
                                <TableRow>
                                  <TableCell>{t('reports.intervention.baseLaborCost')}</TableCell>
                                  <TableCell align="right">{formatCurrency(costBreakdown.laborCost)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>{t('reports.intervention.seniorityMultiplier')} ({t(`technicianLevel.${report.technicianLevel}`)})</TableCell>
                                  <TableCell align="right">×{costBreakdown.seniorityMultiplier}</TableCell>
                                </TableRow>
                                {costBreakdown.afterHoursSurcharge > 0 && (
                                  <TableRow>
                                    <TableCell>{t('reports.intervention.afterHoursSurcharge')}</TableCell>
                                    <TableCell align="right">{formatCurrency(costBreakdown.afterHoursSurcharge)}</TableCell>
                                  </TableRow>
                                )}
                                <TableRow>
                                  <TableCell>{t('reports.intervention.downtimeCostAvoided')}</TableCell>
                                  <TableCell align="right">{formatCurrency(costBreakdown.downtimeCost)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell><strong>{t('reports.intervention.totalManualCost')}</strong></TableCell>
                                  <TableCell align="right"><strong>{formatCurrency(costBreakdown.totalManualCost)}</strong></TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>{t('reports.intervention.mssServiceCost')}</TableCell>
                                  <TableCell align="right">{formatCurrency(costBreakdown.mssServiceCost)}</TableCell>
                                </TableRow>
                                <TableRow sx={{ bgcolor: 'success.light' }}>
                                  <TableCell><strong>{t('reports.intervention.amountSaved')}</strong></TableCell>
                                  <TableCell align="right">
                                    <Typography color="success.main" fontWeight="bold">
                                      {formatCurrency(costBreakdown.totalSaved)}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Grid>

                        {/* Appliances List */}
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>
                            {t('reports.intervention.devicesUpdated')} ({t('common.first')} 5 {t('common.of')} {formatNumber(report.appliances.length)})
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>{t('common.device')}</TableCell>
                                  <TableCell>{t('common.location')}</TableCell>
                                  <TableCell>{t('common.time')}</TableCell>
                                  <TableCell>{t('common.saved')}</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {report.appliances.slice(0, 5).map((appliance) => (
                                  <TableRow key={appliance.id}>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight="medium">
                                        {appliance.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {appliance.model}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption">
                                        {appliance.location}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>{formatNumber(appliance.interventionTime)}m</TableCell>
                                    <TableCell>
                                      {formatCurrency(appliance.manualCost - appliance.technicianCost)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          {report.appliances.length > 5 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              {t('common.andMore', { count: formatNumber(report.appliances.length - 5), items: t('common.devices').toLowerCase() })}
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};