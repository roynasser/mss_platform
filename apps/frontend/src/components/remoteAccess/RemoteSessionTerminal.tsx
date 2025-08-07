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
  onClose?: () => void;
}

export const RemoteSessionTerminal: React.FC<RemoteSessionTerminalProps> = ({
  deviceName,
  deviceIp,
  protocol,
  customer,
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
  const [vpnConnected, setVpnConnected] = useState(true);
  const [selectedIdentity, setSelectedIdentity] = useState('technician');
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
      
      // Simulate command responses with many demo commands
      if (cmd === 'ls' || cmd === 'll') {
        newContent.push('drwxr-xr-x 2 technician technician 4096 Aug  7 10:30 Desktop');
        newContent.push('drwxr-xr-x 2 technician technician 4096 Aug  7 09:15 Documents');
        newContent.push('-rw-r--r-- 1 technician technician  220 Aug  1 12:00 .bash_logout');
        newContent.push('-rw-r--r-- 1 technician technician 3771 Aug  1 12:00 .bashrc');
        newContent.push('-rw-r--r-- 1 technician technician  807 Aug  1 12:00 .profile');
        newContent.push('-rw-r--r-- 1 technician technician 1024 Aug  7 10:25 config.txt');
      } else if (cmd === 'pwd') {
        newContent.push('/home/technician');
      } else if (cmd === 'whoami') {
        newContent.push('technician');
      } else if (cmd === 'date') {
        newContent.push(new Date().toString());
      } else if (cmd === 'uptime') {
        newContent.push('10:35:42 up 5 days, 12:45,  1 user,  load average: 0.15, 0.25, 0.18');
      } else if (cmd === 'df -h' || cmd === 'df') {
        newContent.push('Filesystem      Size  Used Avail Use% Mounted on');
        newContent.push('/dev/sda1        20G  8.5G   10G  47% /');
        newContent.push('/dev/sda2       100G   45G   50G  48% /home');
        newContent.push('tmpfs           2.0G     0  2.0G   0% /tmp');
      } else if (cmd === 'free -h' || cmd === 'free') {
        newContent.push('              total        used        free      shared  buff/cache   available');
        newContent.push('Mem:           4.0G        1.2G        1.5G         56M        1.3G        2.6G');
        newContent.push('Swap:          2.0G          0B        2.0G');
      } else if (cmd === 'ps aux' || cmd === 'ps') {
        newContent.push('USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND');
        newContent.push('root         1  0.1  0.2  19364  1024 ?        Ss   Aug01   0:05 /sbin/init');
        newContent.push('root         2  0.0  0.0      0     0 ?        S    Aug01   0:00 [kthreadd]');
        newContent.push('technician 1234  0.0  0.1  21456  2048 pts/0    S    10:30   0:00 -bash');
      } else if (cmd === 'top') {
        newContent.push('Tasks: 128 total,   1 running, 127 sleeping,   0 stopped,   0 zombie');
        newContent.push('%Cpu(s):  2.3 us,  1.1 sy,  0.0 ni, 96.2 id,  0.4 wa,  0.0 hi,  0.0 si,  0.0 st');
        newContent.push('MiB Mem :   4096.0 total,   1536.0 free,   1280.0 used,   1280.0 buff/cache');
        newContent.push('Press q to exit top...');
      } else if (cmd === 'netstat -an' || cmd === 'netstat') {
        newContent.push('Proto Recv-Q Send-Q Local Address           Foreign Address         State');
        newContent.push('tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN');
        newContent.push('tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN');
        newContent.push('tcp        0      0 192.168.1.10:22         10.0.0.5:54321          ESTABLISHED');
      } else if (cmd === 'ifconfig' || cmd === 'ip addr') {
        newContent.push('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500');
        newContent.push('        inet 192.168.1.10  netmask 255.255.255.0  broadcast 192.168.1.255');
        newContent.push('        inet6 fe80::a00:27ff:fe4e:66a1  prefixlen 64  scopeid 0x20<link>');
        newContent.push('        ether 08:00:27:4e:66:a1  txqueuelen 1000  (Ethernet)');
      } else if (cmd === 'systemctl status nginx' || cmd === 'service nginx status') {
        newContent.push('● nginx.service - A high performance web server and a reverse proxy server');
        newContent.push('   Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)');
        newContent.push('   Active: active (running) since Tue 2025-08-06 09:30:15 UTC; 1 day 1h ago');
        newContent.push('   Main PID: 1234 (nginx)');
      } else if (cmd.startsWith('tail ') || cmd.startsWith('cat ')) {
        const filename = args[1] || 'file.txt';
        if (filename.includes('log')) {
          newContent.push('[2025-08-07 10:30:15] INFO: Application started successfully');
          newContent.push('[2025-08-07 10:31:22] DEBUG: Processing user request');
          newContent.push('[2025-08-07 10:32:45] WARNING: High memory usage detected');
          newContent.push('[2025-08-07 10:33:12] INFO: Backup completed successfully');
        } else {
          newContent.push(`This is the content of ${filename}`);
          newContent.push('Sample configuration file');
          newContent.push('# Configuration settings');
          newContent.push('server_name=production');
          newContent.push('port=8080');
        }
      } else if (cmd.startsWith('grep ')) {
        newContent.push('Line 1: This line contains the search term');
        newContent.push('Line 15: Another match for your search');
        newContent.push('Line 42: Final occurrence of the pattern');
      } else if (cmd === 'history') {
        newContent.push('    1  ls -la');
        newContent.push('    2  pwd');
        newContent.push('    3  systemctl status nginx');
        newContent.push('    4  tail -f /var/log/nginx/access.log');
        newContent.push('    5  top');
        newContent.push('    6  netstat -an');
      } else if (cmd === 'env' || cmd === 'printenv') {
        newContent.push('USER=technician');
        newContent.push('HOME=/home/technician');
        newContent.push('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
        newContent.push('SHELL=/bin/bash');
        newContent.push('TERM=xterm-256color');
      } else if (cmd === 'uname -a') {
        newContent.push('Linux web-prod-01 5.15.0-72-generic #79-Ubuntu SMP Wed Apr 19 08:22:18 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux');
      } else if (cmd === 'lscpu') {
        newContent.push('Architecture:        x86_64');
        newContent.push('CPU op-mode(s):      32-bit, 64-bit');
        newContent.push('CPU(s):              4');
        newContent.push('Model name:          Intel(R) Xeon(R) CPU E5-2673 v3 @ 2.40GHz');
      } else if (cmd.startsWith('find ')) {
        newContent.push('./config.txt');
        newContent.push('./Documents/readme.md');
        newContent.push('./Documents/backup.tar.gz');
      } else if (cmd === 'mount') {
        newContent.push('/dev/sda1 on / type ext4 (rw,relatime,errors=remount-ro)');
        newContent.push('/dev/sda2 on /home type ext4 (rw,relatime)');
        newContent.push('tmpfs on /tmp type tmpfs (rw,nosuid,nodev,noexec,relatime,size=2097152k)');
      } else if (cmd === 'cheat' || cmd === 'help' || cmd === '?') {
        newContent.push('=== SSH Command Cheat Sheet ===');
        newContent.push('Basic Navigation:');
        newContent.push('  ls, ll          - List files and directories');
        newContent.push('  pwd             - Show current directory');
        newContent.push('  cd <dir>        - Change directory');
        newContent.push('  cat <file>      - Display file content');
        newContent.push('  tail <file>     - Show end of file');
        newContent.push('');
        newContent.push('System Information:');
        newContent.push('  whoami          - Show current user');
        newContent.push('  date            - Show current date/time');
        newContent.push('  uptime          - Show system uptime');
        newContent.push('  uname -a        - Show system information');
        newContent.push('  lscpu           - Show CPU information');
        newContent.push('');
        newContent.push('System Monitoring:');
        newContent.push('  top             - Show running processes');
        newContent.push('  ps aux          - List all processes');
        newContent.push('  free -h         - Show memory usage');
        newContent.push('  df -h           - Show disk usage');
        newContent.push('  netstat -an     - Show network connections');
        newContent.push('  ifconfig        - Show network interfaces');
        newContent.push('');
        newContent.push('Services:');
        newContent.push('  systemctl status <service> - Check service status');
        newContent.push('  service <service> status   - Alternative service check');
        newContent.push('');
        newContent.push('File Operations:');
        newContent.push('  find <path> -name <pattern> - Find files');
        newContent.push('  grep <pattern> <file>       - Search in files');
        newContent.push('  history         - Show command history');
        newContent.push('  env             - Show environment variables');
        newContent.push('');
        newContent.push('Utility:');
        newContent.push('  clear           - Clear terminal');
        newContent.push('  cheat, help, ?  - Show this cheat sheet');
        newContent.push('  exit            - Exit terminal session');
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
            SSH Command Cheat Sheet
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                Basic Navigation
              </Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}>
                <Typography component="div"><strong>ls, ll</strong> - List files and directories</Typography>
                <Typography component="div"><strong>pwd</strong> - Show current directory</Typography>
                <Typography component="div"><strong>cd &lt;dir&gt;</strong> - Change directory</Typography>
                <Typography component="div"><strong>cat &lt;file&gt;</strong> - Display file content</Typography>
                <Typography component="div"><strong>tail &lt;file&gt;</strong> - Show end of file</Typography>
              </Box>

              <Typography variant="h6" gutterBottom color="primary">
                System Information
              </Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}>
                <Typography component="div"><strong>whoami</strong> - Show current user</Typography>
                <Typography component="div"><strong>date</strong> - Show current date/time</Typography>
                <Typography component="div"><strong>uptime</strong> - Show system uptime</Typography>
                <Typography component="div"><strong>uname -a</strong> - Show system information</Typography>
                <Typography component="div"><strong>lscpu</strong> - Show CPU information</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                System Monitoring
              </Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}>
                <Typography component="div"><strong>top</strong> - Show running processes</Typography>
                <Typography component="div"><strong>ps aux</strong> - List all processes</Typography>
                <Typography component="div"><strong>free -h</strong> - Show memory usage</Typography>
                <Typography component="div"><strong>df -h</strong> - Show disk usage</Typography>
                <Typography component="div"><strong>netstat -an</strong> - Show network connections</Typography>
                <Typography component="div"><strong>ifconfig</strong> - Show network interfaces</Typography>
              </Box>

              <Typography variant="h6" gutterBottom color="primary">
                File Operations
              </Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}>
                <Typography component="div"><strong>find &lt;path&gt; -name &lt;pattern&gt;</strong> - Find files</Typography>
                <Typography component="div"><strong>grep &lt;pattern&gt; &lt;file&gt;</strong> - Search in files</Typography>
                <Typography component="div"><strong>history</strong> - Show command history</Typography>
                <Typography component="div"><strong>env</strong> - Show environment variables</Typography>
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