'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Button,
  Toolbar,
  AppBar,
  Menu,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
  Grid,
} from '@mui/material';
import {
  Close as CloseIcon,
  FiberManualRecord as RecordIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  FileUpload as UploadIcon,
  FileDownload as DownloadIcon,
  Keyboard as KeyboardIcon,
  Mouse as MouseIcon,
  Settings as SettingsIcon,
  Screenshot as ScreenshotIcon,
  Terminal as TerminalIcon,
  DesktopWindows as DesktopIcon,
  RestartAlt as ReconnectIcon,
  SignalCellularAlt as SignalIcon,
  Timer as TimerIcon,
  Security as SecurityIcon,
  Share as ShareIcon,
  Help as HelpIcon,
  MoreVert as MoreIcon,
  Wifi as VpnIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

interface RemoteSessionTerminalProps {
  deviceName: string;
  deviceIp: string;
  protocol: 'ssh' | 'rdp' | 'vnc';
  customer: string;
  initialIdentity?: string;
  vpnConnected?: boolean;
  onClose?: () => void;
}

export const RemoteSessionTerminal: React.FC<RemoteSessionTerminalProps> = ({
  deviceName,
  deviceIp,
  protocol,
  customer,
  initialIdentity = 'technician',
  vpnConnected: initialVpnConnected = true,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');
  const [terminalContent, setTerminalContent] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showFileTransfer, setShowFileTransfer] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [showIdentitySelector, setShowIdentitySelector] = useState(false);
  const [vpnConnected, setVpnConnected] = useState(initialVpnConnected);
  const [selectedIdentity, setSelectedIdentity] = useState(initialIdentity);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Simulate terminal output
  useEffect(() => {
    const initialContent = [
      `VPN: ${vpnConnected ? 'Connected' : 'Disconnected'} | Identity: ${selectedIdentity}`,
      `Connected to ${deviceName} (${deviceIp})`,
      'Last login: Wed Aug 7 10:30:45 2025 from 10.0.0.5',
      '',
      `Type 'cheat' or 'help' to see available commands`,
      '',
      `[${selectedIdentity}@${deviceName} ~]$ `,
    ];
    setTerminalContent(initialContent);
  }, [deviceName, deviceIp, vpnConnected, selectedIdentity]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate connection quality changes
  useEffect(() => {
    const qualityTimer = setInterval(() => {
      const qualities: ('excellent' | 'good' | 'fair' | 'poor')[] = ['excellent', 'good', 'fair', 'poor'];
      const randomQuality = qualities[Math.floor(Math.random() * 2)]; // Mostly excellent or good
      setConnectionQuality(randomQuality);
    }, 10000);
    return () => clearInterval(qualityTimer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'primary';
      case 'fair':
        return 'warning';
      case 'poor':
        return 'error';
    }
  };

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const newContent = [
        ...terminalContent,
        currentCommand,
      ];
      
      const cmd = currentCommand.toLowerCase().trim();
      const args = cmd.split(' ');
      
      // Simulate firewall/networking command responses
      if (cmd === 'show version' || cmd === 'show ver') {
        newContent.push('Model: Check Point Security Gateway R81.20');
        newContent.push('Version: R81.20 - Build 631');
        newContent.push('Kernel: 3.10.0-957.21.3.el7');
        newContent.push('Platform: Open Server');
        newContent.push('Serial Number: CP123456789');
        newContent.push('Uptime: 45 days, 12:34:56');
        newContent.push('License Status: Valid until 2026-12-31');
      } else if (cmd === 'show interfaces' || cmd === 'show int') {
        newContent.push('eth0     Link UP, 1000 Mbps, Full Duplex');
        newContent.push('         IP: 10.0.0.1/24');
        newContent.push('         RX: 1,234,567,890 bytes (1.2 GB)');
        newContent.push('         TX: 987,654,321 bytes (987 MB)');
        newContent.push('eth1     Link UP, 1000 Mbps, Full Duplex');
        newContent.push('         IP: 192.168.1.1/24');
        newContent.push('         RX: 456,789,012 bytes (456 MB)');
        newContent.push('         TX: 234,567,890 bytes (234 MB)');
        newContent.push('eth2     Link DOWN');
      } else if (cmd === 'show route' || cmd === 'show ip route') {
        newContent.push('Destination      Gateway         Interface  Type');
        newContent.push('0.0.0.0/0       10.0.0.254      eth0       Static');
        newContent.push('10.0.0.0/24     0.0.0.0         eth0       Connected');
        newContent.push('192.168.1.0/24  0.0.0.0         eth1       Connected');
        newContent.push('172.16.0.0/16   10.0.0.2        eth0       Static');
        newContent.push('10.10.0.0/16    10.0.0.3        eth0       OSPF');
      } else if (cmd === 'show policy' || cmd === 'show security-policy') {
        newContent.push('Rule  Name            Source        Destination   Service    Action   Hits');
        newContent.push('1     Allow_Internal  Internal_Net  Any          Any        Accept   1,234,567');
        newContent.push('2     Web_Access     Any           Web_Servers   HTTP/HTTPS Accept   567,890');
        newContent.push('3     Block_P2P      Any           Any          P2P_Apps   Drop     45,678');
        newContent.push('4     VPN_Access     VPN_Users     Internal_Net  Any        Accept   23,456');
        newContent.push('5     Default_Drop   Any           Any          Any        Drop     789,012');
      } else if (cmd === 'show nat' || cmd === 'show nat-policy') {
        newContent.push('NAT Rules:');
        newContent.push('Rule  Type    Source          Destination     Translation');
        newContent.push('1     Hide    192.168.1.0/24  Internet        10.0.0.1');
        newContent.push('2     Static  Any             10.0.0.10:443   192.168.1.100:443');
        newContent.push('3     Static  Any             10.0.0.11:80    192.168.1.101:80');
        newContent.push('Active NAT Sessions: 3,456');
      } else if (cmd === 'show vpn' || cmd === 'show crypto ipsec sa') {
        newContent.push('VPN Status:');
        newContent.push('Tunnel   Remote IP       Status    Uptime        TX/RX');
        newContent.push('VPN-1    203.0.113.10   UP        5d 12h 34m    1.2GB/3.4GB');
        newContent.push('VPN-2    198.51.100.20  UP        2d 6h 15m     567MB/890MB');
        newContent.push('VPN-3    192.0.2.30     DOWN      -             -');
        newContent.push('Active VPN Users: 127');
      } else if (cmd === 'show log' || cmd === 'show log tail') {
        const now = new Date();
        newContent.push(`${now.toISOString()} ACCEPT  src=192.168.1.50 dst=8.8.8.8 proto=UDP dport=53`);
        newContent.push(`${now.toISOString()} DROP    src=203.0.113.99 dst=10.0.0.1 proto=TCP dport=22 reason=GeoBlock`);
        newContent.push(`${now.toISOString()} ACCEPT  src=10.10.10.5 dst=192.168.1.100 proto=TCP dport=443`);
        newContent.push(`${now.toISOString()} IPS     Alert: SQL Injection attempt blocked from 198.51.100.55`);
        newContent.push(`${now.toISOString()} ACCEPT  src=192.168.1.75 dst=52.84.228.25 proto=TCP dport=443`);
      } else if (cmd === 'show threat-prevention' || cmd === 'show ips') {
        newContent.push('Threat Prevention Status: Active');
        newContent.push('Last Update: 2025-08-07 09:00:00');
        newContent.push('Signatures: 45,678 (Critical: 1,234, High: 5,678, Medium: 12,345)');
        newContent.push('');
        newContent.push('Recent Threats Blocked:');
        newContent.push('  - Malware: Trojan.GenericKD.45678 (15 attempts)');
        newContent.push('  - Exploit: CVE-2024-0132 (3 attempts)');
        newContent.push('  - Botnet: Command & Control communication (8 attempts)');
      } else if (cmd === 'show cpu' || cmd === 'show system resources') {
        newContent.push('CPU Usage:');
        newContent.push('  Core 0: 23%');
        newContent.push('  Core 1: 18%');
        newContent.push('  Core 2: 31%');
        newContent.push('  Core 3: 12%');
        newContent.push('  Average: 21%');
        newContent.push('');
        newContent.push('Memory: 8192 MB total, 3456 MB used (42%)');
        newContent.push('Connections: 45,678 concurrent');
      } else if (cmd === 'show sessions' || cmd === 'show conn') {
        newContent.push('Active Sessions: 45,678');
        newContent.push('Source           Destination      Service  State       Duration');
        newContent.push('192.168.1.50     8.8.8.8:53      DNS      ESTABLISHED 00:00:02');
        newContent.push('192.168.1.75     52.84.228.25:443 HTTPS   ESTABLISHED 00:05:34');
        newContent.push('10.10.10.5       192.168.1.100:22 SSH     ESTABLISHED 01:23:45');
        newContent.push('192.168.1.100    203.0.113.10:443 HTTPS   TIME_WAIT   00:00:10');
      } else if (cmd === 'show ha' || cmd === 'show cluster') {
        newContent.push('High Availability Status:');
        newContent.push('  Local:  Active (Primary)');
        newContent.push('  Peer:   Standby (10.0.0.2)');
        newContent.push('  State:  Synchronized');
        newContent.push('  Last Failover: 45 days ago');
        newContent.push('  Sync Status: 100%');
      } else if (cmd === 'show users' || cmd === 'show administrators') {
        newContent.push('Active Administrators:');
        newContent.push('Username     Role          Last Login         From');
        newContent.push('admin        Super Admin   2025-08-07 10:30   10.0.0.5');
        newContent.push('technician   Read-Write    2025-08-07 10:35   VPN');
        newContent.push('monitor      Read-Only     2025-08-07 09:15   192.168.1.50');
      } else if (cmd === 'fw stat' || cmd === 'show firewall statistics') {
        newContent.push('Firewall Statistics:');
        newContent.push('  Accepted Packets:  12,345,678');
        newContent.push('  Dropped Packets:   456,789');
        newContent.push('  Rejected Packets:  23,456');
        newContent.push('  Active Rules:      256');
        newContent.push('  Rule Hits Today:   1,234,567');
      } else if (cmd === 'show blocked' || cmd === 'show drop-log') {
        newContent.push('Recently Blocked Connections:');
        newContent.push('Time         Source          Destination    Reason');
        newContent.push('10:35:22     185.220.101.5   10.0.0.1:22   Brute Force Detection');
        newContent.push('10:34:15     45.155.205.233  Any:445       Known Malicious IP');
        newContent.push('10:33:08     192.168.1.99    8.8.8.8:53    DNS Tunneling Detected');
        newContent.push('10:32:45     203.0.113.77    10.0.0.10:80  Rate Limit Exceeded');
      } else if (cmd === 'show application' || cmd === 'show app-control') {
        newContent.push('Application Control:');
        newContent.push('Application      Sessions  Bandwidth   Policy');
        newContent.push('HTTPS           23,456    1.2 GB/s    Allow');
        newContent.push('SSH             127       45 MB/s     Allow');
        newContent.push('BitTorrent      0         0 B/s       Block');
        newContent.push('Skype           45        12 MB/s     Limit(10MB)');
        newContent.push('Netflix         234       567 MB/s    Allow');
      } else if (cmd.startsWith('ping ')) {
        const host = args[1] || '8.8.8.8';
        newContent.push(`PING ${host}: 56 data bytes`);
        newContent.push(`64 bytes from ${host}: icmp_seq=0 ttl=117 time=12.3 ms`);
        newContent.push(`64 bytes from ${host}: icmp_seq=1 ttl=117 time=11.8 ms`);
        newContent.push(`64 bytes from ${host}: icmp_seq=2 ttl=117 time=12.1 ms`);
        newContent.push(`--- ${host} ping statistics ---`);
        newContent.push('3 packets transmitted, 3 packets received, 0.0% packet loss');
      } else if (cmd.startsWith('traceroute ') || cmd.startsWith('tracert ')) {
        const host = args[1] || '8.8.8.8';
        newContent.push(`traceroute to ${host}, 30 hops max`);
        newContent.push(' 1  10.0.0.254     1.234 ms');
        newContent.push(' 2  172.16.0.1     5.678 ms');
        newContent.push(' 3  203.0.113.1    12.345 ms');
        newContent.push(` 4  ${host}         23.456 ms`);
      } else if (cmd === 'show config' || cmd === 'show run') {
        newContent.push('Running Configuration:');
        newContent.push('hostname CP-FW-EDGE-01');
        newContent.push('interface eth0 10.0.0.1/24');
        newContent.push('interface eth1 192.168.1.1/24');
        newContent.push('route 0.0.0.0/0 10.0.0.254');
        newContent.push('policy id 1 from Internal to Any service Any action accept');
        newContent.push('nat hide source 192.168.1.0/24 behind 10.0.0.1');
      } else if (cmd === 'cheat' || cmd === 'help' || cmd === '?') {
        newContent.push('=== Firewall Command Cheat Sheet ===');
        newContent.push('Device Information:');
        newContent.push('  show version           - Display firmware version and uptime');
        newContent.push('  show interfaces        - Show network interface status');
        newContent.push('  show cpu               - Display CPU usage');
        newContent.push('  show ha                - Show High Availability status');
        newContent.push('');
        newContent.push('Security Policies:');
        newContent.push('  show policy            - Display firewall rules');
        newContent.push('  show nat               - Show NAT rules and translations');
        newContent.push('  show vpn               - Display VPN tunnel status');
        newContent.push('  show threat-prevention - Show IPS/threat status');
        newContent.push('');
        newContent.push('Traffic Monitoring:');
        newContent.push('  show sessions          - Display active connections');
        newContent.push('  show log               - View security logs');
        newContent.push('  show blocked           - Show dropped connections');
        newContent.push('  show application       - Application control status');
        newContent.push('  fw stat                - Firewall statistics');
        newContent.push('');
        newContent.push('Network Diagnostics:');
        newContent.push('  show route             - Display routing table');
        newContent.push('  ping <host>            - Test connectivity');
        newContent.push('  traceroute <host>      - Trace network path');
        newContent.push('  show config            - Display running configuration');
        newContent.push('');
        newContent.push('Administration:');
        newContent.push('  show users             - List active administrators');
        newContent.push('  clear                  - Clear terminal');
        newContent.push('  cheat, help, ?         - Show this cheat sheet');
        newContent.push('  exit                   - Exit terminal session');
      } else if (cmd.startsWith('cd ')) {
        const dir = args[1] || '~';
        newContent.push(`Changed directory to ${dir}`);
      } else if (cmd === 'clear') {
        setTerminalContent([
          `VPN: ${vpnConnected ? 'Connected' : 'Disconnected'} | Identity: ${selectedIdentity}`,
          `Connected to ${deviceName} (${deviceIp})`,
          '',
          `[${selectedIdentity}@${deviceName} ~]$ `
        ]);
        setCurrentCommand('');
        return;
      } else if (cmd === 'exit') {
        newContent.push('Connection to ' + deviceName + ' closed.');
        setTimeout(() => {
          if (onClose) onClose();
        }, 1000);
      } else if (currentCommand) {
        newContent.push(`bash: ${args[0]}: command not found`);
        newContent.push(`Type 'cheat' or 'help' to see available commands`);
      }
      
      newContent.push(`[${selectedIdentity}@${deviceName} ~]$ `);
      setTerminalContent(newContent);
      setCurrentCommand('');
      
      // Auto-scroll to bottom
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }
  };

  const mockDesktopContent = () => (
    <Box
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Typography variant="h4" sx={{ color: 'white', opacity: 0.3 }}>
        Remote Desktop Session
      </Typography>
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          bgcolor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          px: 2,
        }}
      >
        <Typography sx={{ color: 'white', fontSize: 12 }}>
          Windows 11 Pro - {deviceName}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {/* Session Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {protocol === 'ssh' ? <TerminalIcon /> : <DesktopIcon />}
              <Box>
                <Typography variant="subtitle2" sx={{ lineHeight: 1 }}>
                  {deviceName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {customer} - {protocol.toUpperCase()}
                </Typography>
              </Box>
            </Box>

            {/* Recording Status */}
            <Chip
              icon={isRecording ? <RecordIcon /> : isPaused ? <PauseIcon /> : <StopIcon />}
              label={isRecording ? 'Recording' : isPaused ? 'Paused' : 'Not Recording'}
              color={isRecording ? 'error' : 'default'}
              size="small"
            />

            {/* Session Time */}
            <Chip
              icon={<TimerIcon />}
              label={formatTime(sessionTime)}
              size="small"
            />

            {/* Connection Quality */}
            <Chip
              icon={<SignalIcon />}
              label={connectionQuality}
              color={getConnectionColor() as any}
              size="small"
            />

            {/* Security Badge */}
            <Chip
              icon={<SecurityIcon />}
              label="Encrypted"
              color="success"
              size="small"
            />
          </Box>

          {/* VPN and Identity Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* VPN Toggle */}
            <Tooltip title={vpnConnected ? "Disconnect VPN" : "Connect VPN"}>
              <Button
                size="small"
                variant={vpnConnected ? "contained" : "outlined"}
                color={vpnConnected ? "success" : "primary"}
                startIcon={<VpnIcon />}
                onClick={() => {
                  setVpnConnected(!vpnConnected);
                  const newContent = [...terminalContent];
                  newContent.push(`VPN ${!vpnConnected ? 'Connected' : 'Disconnected'}`);
                  newContent.push(`[${selectedIdentity}@${deviceName} ~]$ `);
                  setTerminalContent(newContent);
                }}
              >
                VPN
              </Button>
            </Tooltip>

            {/* Identity Selector */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Identity</InputLabel>
              <Select
                value={selectedIdentity}
                onChange={(e) => {
                  setSelectedIdentity(e.target.value);
                  const newContent = [...terminalContent];
                  newContent.push(`Switched to identity: ${e.target.value}`);
                  newContent.push(`[${e.target.value}@${deviceName} ~]$ `);
                  setTerminalContent(newContent);
                }}
                label="Identity"
                startAdornment={<PersonIcon sx={{ mr: 1, fontSize: 16 }} />}
              >
                <MenuItem value="technician">technician</MenuItem>
                <MenuItem value="admin">admin</MenuItem>
                <MenuItem value="root">root</MenuItem>
                <MenuItem value="service">service</MenuItem>
              </Select>
            </FormControl>

            {/* Cheat Sheet Button */}
            <Tooltip title="Command Cheat Sheet">
              <IconButton size="small" onClick={() => setShowCheatSheet(true)}>
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="File Transfer">
              <IconButton size="small" onClick={() => setShowFileTransfer(true)}>
                <Badge badgeContent={2} color="primary">
                  <UploadIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Screenshot">
              <IconButton size="small">
                <ScreenshotIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clipboard">
              <IconButton size="small">
                <PasteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Keyboard Shortcuts">
              <IconButton size="small">
                <KeyboardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share Session">
              <IconButton size="small">
                <ShareIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton size="small">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Fullscreen">
              <IconButton size="small" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="More Options">
              <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <MoreIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Disconnect">
              <IconButton size="small" color="error" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>

        {/* Secondary Toolbar for RDP/VNC */}
        {protocol !== 'ssh' && (
          <Toolbar variant="dense" sx={{ minHeight: 40, bgcolor: 'grey.100' }}>
            <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
              <Tab label="Main Session" />
              <Tab label="Files" />
              <Tab label="Clipboard" />
              <Tab label="Audio" />
            </Tabs>
          </Toolbar>
        )}
      </AppBar>

      {/* Connection Status Bar */}
      <LinearProgress 
        variant="determinate" 
        value={100} 
        color={getConnectionColor() as any}
        sx={{ height: 2 }}
      />

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: '#000' }}>
        {protocol === 'ssh' ? (
          // SSH Terminal
          <Box
            ref={terminalRef}
            sx={{
              height: '100%',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: 14,
              color: '#00ff00',
              bgcolor: '#000',
              p: 2,
              '&::-webkit-scrollbar': {
                width: 8,
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'rgba(255,255,255,0.1)',
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(255,255,255,0.3)',
                borderRadius: 4,
              },
            }}
          >
            {terminalContent.map((line, index) => (
              <div key={index}>
                {line}
                {index === terminalContent.length - 1 && (
                  <span>
                    <input
                      type="text"
                      value={currentCommand}
                      onChange={(e) => setCurrentCommand(e.target.value)}
                      onKeyDown={handleCommand}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#00ff00',
                        fontFamily: 'monospace',
                        fontSize: 14,
                        width: '80%',
                      }}
                      autoFocus
                    />
                    <span className="cursor" style={{
                      animation: 'blink 1s infinite',
                      marginLeft: 2,
                    }}>_</span>
                  </span>
                )}
              </div>
            ))}
          </Box>
        ) : (
          // RDP/VNC Desktop View
          mockDesktopContent()
        )}
      </Box>

      {/* Status Bar */}
      <Paper elevation={3} sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Latency: 12ms
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bandwidth: 1.2 Mbps
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Packets Lost: 0%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Audit Log: Active
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Compliance: SOC2/ISO27001
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* More Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setIsRecording(!isRecording)}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </MenuItem>
        <MenuItem onClick={() => setIsPaused(!isPaused)}>
          {isPaused ? 'Resume Recording' : 'Pause Recording'}
        </MenuItem>
        <MenuItem>Send Ctrl+Alt+Del</MenuItem>
        <MenuItem>Reboot Device</MenuItem>
        <MenuItem>View Device Info</MenuItem>
        <MenuItem>Export Session Log</MenuItem>
      </Menu>

      {/* File Transfer Dialog */}
      <Dialog open={showFileTransfer} onClose={() => setShowFileTransfer(false)} maxWidth="sm" fullWidth>
        <DialogTitle>File Transfer</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            All file transfers are logged and scanned for security compliance
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button variant="outlined" startIcon={<UploadIcon />} fullWidth>
              Upload Files to Device
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} fullWidth>
              Download Files from Device
            </Button>
            <Typography variant="caption" color="text.secondary">
              Recent Transfers: config.xml (2 min ago), backup.tar.gz (15 min ago)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFileTransfer(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Command Cheat Sheet Dialog */}
      <Dialog open={showCheatSheet} onClose={() => setShowCheatSheet(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TerminalIcon />
            Firewall Command Cheat Sheet
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                Device Information
              </Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}>
                <Typography component="div"><strong>show version</strong> - Firmware version and uptime</Typography>
                <Typography component="div"><strong>show interfaces</strong> - Network interface status</Typography>
                <Typography component="div"><strong>show cpu</strong> - CPU usage statistics</Typography>
                <Typography component="div"><strong>show ha</strong> - High Availability status</Typography>
                <Typography component="div"><strong>show config</strong> - Running configuration</Typography>
              </Box>

              <Typography variant="h6" gutterBottom color="primary">
                Security Policies
              </Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}>
                <Typography component="div"><strong>show policy</strong> - Firewall rules</Typography>
                <Typography component="div"><strong>show nat</strong> - NAT rules and translations</Typography>
                <Typography component="div"><strong>show vpn</strong> - VPN tunnel status</Typography>
                <Typography component="div"><strong>show threat-prevention</strong> - IPS/threat status</Typography>
                <Typography component="div"><strong>show application</strong> - App control status</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                Traffic Monitoring
              </Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}>
                <Typography component="div"><strong>show sessions</strong> - Active connections</Typography>
                <Typography component="div"><strong>show log</strong> - Security event logs</Typography>
                <Typography component="div"><strong>show blocked</strong> - Dropped connections</Typography>
                <Typography component="div"><strong>fw stat</strong> - Firewall statistics</Typography>
                <Typography component="div"><strong>show users</strong> - Active administrators</Typography>
              </Box>

              <Typography variant="h6" gutterBottom color="primary">
                Network Diagnostics
              </Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}>
                <Typography component="div"><strong>show route</strong> - Routing table</Typography>
                <Typography component="div"><strong>ping &lt;host&gt;</strong> - Test connectivity</Typography>
                <Typography component="div"><strong>traceroute &lt;host&gt;</strong> - Trace network path</Typography>
                <Typography component="div"><strong>clear</strong> - Clear terminal</Typography>
                <Typography component="div"><strong>exit</strong> - Exit session</Typography>
              </Box>
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Pro Tip:</strong> Type <code>cheat</code>, <code>help</code>, or <code>?</code> in the terminal for this reference anytime!
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCheatSheet(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </Box>
  );
};