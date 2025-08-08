'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Build as InterventionIcon,
  Send as SendIcon,
  Computer as SystemIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { CustomerRoute } from '../../../../components/auth/ProtectedRoute';

const steps = ['Select Type', 'System Selection', 'Schedule & Details', 'Review & Submit'];

export default function RequestInterventionPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  
  const [request, setRequest] = useState({
    type: '',
    priority: 'medium',
    systems: [] as string[],
    description: '',
    preferredWindow: 'after_hours',
    specificDate: null as Date | null,
    businessJustification: '',
    expectedDowntime: false,
    contactPerson: user?.email || '',
    additionalNotes: '',
    requiresEmergencyAccess: false,
    complianceRelated: false,
    threatLevel: 'low',
  });

  const interventionTypes = [
    {
      id: 'firewall_update',
      name: 'Firewall Policy Update',
      description: 'Update firewall rules, NAT policies, or VPN configurations',
      icon: <SystemIcon />,
    },
    {
      id: 'security_patch',
      name: 'Security Patch Deployment',
      description: 'Critical security patches for firewalls, IPS, or WAF systems',
      icon: <WarningIcon />,
    },
    {
      id: 'threat_response',
      name: 'Threat Incident Response',
      description: 'Respond to detected threats, breaches, or security incidents',
      icon: <WarningIcon />,
    },
    {
      id: 'compliance_audit',
      name: 'Compliance & Audit',
      description: 'Security compliance checks, audit log reviews, and reporting',
      icon: <InterventionIcon />,
    },
  ];

  const availableSystems = [
    'CP-FW-EDGE-01 (Check Point R81.20)',
    'PA-FW-DC-01 (Palo Alto PAN-OS 11.0)',
    'FORTI-GW-01 (FortiGate 7.4)',
    'ASA-FW-DMZ (Cisco ASA 9.18)',
    'WAF-PROD-01 (F5 BIG-IP 17.1)',
    'IPS-CORE-01 (Snort IPS 3.1)',
    'NGFW-BRANCH-01 (SonicWall TZ670)',
    'UTM-SITE-02 (Sophos XG 19.5)',
    'SD-WAN-EDGE (Cisco Viptela)',
    'SIEM-CENTRAL (Splunk Enterprise)',
    'EDR-ENDPOINT (CrowdStrike Falcon)',
    'DLP-GATEWAY (Forcepoint DLP)',
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = () => {
    // Submit the intervention request
    setSubmitted(true);
    
    // After 3 seconds, redirect to interventions list
    setTimeout(() => {
      router.push('/dashboard/interventions');
    }, 3000);
  };

  const handleSystemToggle = (system: string) => {
    setRequest(prev => ({
      ...prev,
      systems: prev.systems.includes(system)
        ? prev.systems.filter(s => s !== system)
        : [...prev.systems, system]
    }));
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Intervention Type
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Choose the type of intervention you need for your systems
            </Typography>
            
            <RadioGroup
              value={request.type}
              onChange={(e) => setRequest(prev => ({ ...prev, type: e.target.value }))}
            >
              <Grid container spacing={2}>
                {interventionTypes.map((type) => (
                  <Grid item xs={12} sm={6} key={type.id}>
                    <Card 
                      variant="outlined"
                      sx={{ 
                        cursor: 'pointer',
                        border: request.type === type.id ? 2 : 1,
                        borderColor: request.type === type.id ? 'primary.main' : 'divider'
                      }}
                      onClick={() => setRequest(prev => ({ ...prev, type: type.id }))}
                    >
                      <CardContent>
                        <FormControlLabel
                          value={type.id}
                          control={<Radio />}
                          label={
                            <Box>
                              <Box display="flex" alignItems="center" gap={1}>
                                {type.icon}
                                <Typography variant="subtitle1">{type.name}</Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {type.description}
                              </Typography>
                            </Box>
                          }
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </RadioGroup>

            <FormControl fullWidth sx={{ mt: 3 }}>
              <InputLabel>{t('table.headers.priority')}</InputLabel>
              <Select
                value={request.priority}
                label={t('table.headers.priority')}
                onChange={(e) => setRequest(prev => ({ ...prev, priority: e.target.value }))}
              >
                <MenuItem value="low">{t('vulnerabilities.low')}</MenuItem>
                <MenuItem value="medium">{t('vulnerabilities.medium')}</MenuItem>
                <MenuItem value="high">{t('vulnerabilities.high')}</MenuItem>
                <MenuItem value="critical">{t('vulnerabilities.critical')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Affected Systems
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Choose which systems require intervention
            </Typography>

            <Grid container spacing={2}>
              {availableSystems.map((system) => (
                <Grid item xs={12} sm={6} md={4} key={system}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      cursor: 'pointer',
                      border: request.systems.includes(system) ? 2 : 1,
                      borderColor: request.systems.includes(system) ? 'primary.main' : 'divider',
                      bgcolor: request.systems.includes(system) ? 'action.selected' : 'background.paper'
                    }}
                    onClick={() => handleSystemToggle(system)}
                  >
                    <CardContent>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={request.systems.includes(system)}
                            onChange={() => handleSystemToggle(system)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{system.split(' (')[0]}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {system.includes('(') ? system.split('(')[1].replace(')', '') : 'Active'}
                            </Typography>
                            <Typography variant="caption" color="success.main" display="block">
                              ● Online • Protected
                            </Typography>
                          </Box>
                        }
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {request.systems.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {request.systems.length} system(s) selected for intervention
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Schedule & Details
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Provide scheduling preferences and additional details
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Execution Window</InputLabel>
                  <Select
                    value={request.preferredWindow}
                    label="Preferred Execution Window"
                    onChange={(e) => setRequest(prev => ({ ...prev, preferredWindow: e.target.value }))}
                  >
                    <MenuItem value="business_hours">
                      {t('interventionReports.executionWindows.businessHours')}
                    </MenuItem>
                    <MenuItem value="after_hours">
                      {t('interventionReports.executionWindows.afterHours')}
                    </MenuItem>
                    <MenuItem value="weekend">
                      {t('interventionReports.executionWindows.weekend')}
                    </MenuItem>
                    <MenuItem value="emergency">
                      {t('interventionReports.executionWindows.emergency')}
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description of Issue/Request"
                  value={request.description}
                  onChange={(e) => setRequest(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Please describe the issue or reason for this intervention request..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Business Justification"
                  value={request.businessJustification}
                  onChange={(e) => setRequest(prev => ({ ...prev, businessJustification: e.target.value }))}
                  placeholder="Explain the business impact or reason for this request..."
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={request.expectedDowntime}
                      onChange={(e) => setRequest(prev => ({ ...prev, expectedDowntime: e.target.checked }))}
                    />
                  }
                  label="Expected downtime during intervention"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={request.requiresEmergencyAccess}
                      onChange={(e) => setRequest(prev => ({ ...prev, requiresEmergencyAccess: e.target.checked }))}
                    />
                  }
                  label="Requires emergency access protocols"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={request.complianceRelated}
                      onChange={(e) => setRequest(prev => ({ ...prev, complianceRelated: e.target.checked }))}
                    />
                  }
                  label="Compliance/audit related intervention"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Threat Level</InputLabel>
                  <Select
                    value={request.threatLevel}
                    label="Threat Level"
                    onChange={(e) => setRequest(prev => ({ ...prev, threatLevel: e.target.value }))}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contact Person Email"
                  value={request.contactPerson}
                  onChange={(e) => setRequest(prev => ({ ...prev, contactPerson: e.target.value }))}
                  type="email"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Request
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please review your intervention request before submitting
            </Typography>

            <Card variant="outlined">
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <InterventionIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Intervention Type"
                      secondary={interventionTypes.find(t => t.id === request.type)?.name || 'Not selected'}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <WarningIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('table.headers.priority')}
                      secondary={
                        <Chip 
                          label={t(`vulnerabilities.${request.priority}`)}
                          size="small"
                          color={
                            request.priority === 'critical' ? 'error' :
                            request.priority === 'high' ? 'warning' :
                            request.priority === 'medium' ? 'info' : 'success'
                          }
                        />
                      }
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <SystemIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Affected Systems"
                      secondary={request.systems.join(', ') || 'No systems selected'}
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Execution Window"
                      secondary={request.preferredWindow.replace('_', ' ').toUpperCase()}
                    />
                  </ListItem>
                </List>

                {request.description && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Description:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {request.description}
                    </Typography>
                  </Box>
                )}

                {(request.requiresEmergencyAccess || request.complianceRelated || (request.threatLevel && request.threatLevel !== 'low')) && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Special Requirements:
                    </Typography>
                    {request.requiresEmergencyAccess && (
                      <Typography variant="body2">• Emergency access protocols required</Typography>
                    )}
                    {request.complianceRelated && (
                      <Typography variant="body2">• Compliance/audit related intervention</Typography>
                    )}
                    {request.threatLevel && request.threatLevel !== 'low' && (
                      <Typography variant="body2">• Threat Level: {request.threatLevel.toUpperCase()}</Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mt: 2 }}>
              By submitting this request, you acknowledge that the intervention will be scheduled based on availability and priority.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <CustomerRoute>
        <DashboardLayout>
          <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, textAlign: 'center' }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Request Submitted Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your intervention request has been submitted and will be reviewed by our technical team.
              You will receive an email confirmation shortly.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirecting to interventions list...
            </Typography>
          </Box>
        </DashboardLayout>
      </CustomerRoute>
    );
  }

  return (
    <CustomerRoute>
      <DashboardLayout>
        <Box>
          {/* Header */}
          <Box mb={4}>
            <Button
              startIcon={<BackIcon />}
              onClick={() => router.push('/dashboard/interventions')}
              sx={{ mb: 2 }}
            >
              Back to Interventions
            </Button>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InterventionIcon color="primary" />
              {t('navigation.requestIntervention')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Submit a request for technical intervention on your systems
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step Content */}
          <Card>
            <CardContent sx={{ minHeight: 400 }}>
              {renderStepContent(activeStep)}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<BackIcon />}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                startIcon={<SendIcon />}
                disabled={!request.type || request.systems.length === 0}
              >
                Submit Request
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<NextIcon />}
                disabled={
                  (activeStep === 0 && !request.type) ||
                  (activeStep === 1 && request.systems.length === 0) ||
                  (activeStep === 2 && !request.description)
                }
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </DashboardLayout>
    </CustomerRoute>
  );
}