'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { TechnicianRoute } from '../../../../components/auth/ProtectedRoute';
import { RemoteSessionTerminal } from '../../../../components/remoteAccess/RemoteSessionTerminal';
import { RemoteConnectionFlow } from '../../../../components/remoteAccess/RemoteConnectionFlow';

function RemoteSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState<string>('');
  const [selectedVPN, setSelectedVPN] = useState<string>('');
  
  // Get session parameters from URL
  const deviceName = searchParams.get('device') || 'WEB-PROD-01';
  const deviceIp = searchParams.get('ip') || '192.168.1.10';
  const protocol = (searchParams.get('protocol') || 'ssh') as 'ssh' | 'rdp' | 'vnc';
  const customer = searchParams.get('customer') || 'TechCorp Industries';
  const deviceType = searchParams.get('type') as 'server' | 'workstation' | 'firewall' | 'switch' | 'router' || 'server';

  const handleConnect = (identity: string, vpnId: string) => {
    setSelectedIdentity(identity);
    setSelectedVPN(vpnId);
    setIsConnected(true);
  };

  const handleCancel = () => {
    router.push('/dashboard/remote-access');
  };

  const handleClose = () => {
    router.push('/dashboard/remote-access');
  };

  if (!isConnected) {
    return (
      <RemoteConnectionFlow
        deviceName={deviceName}
        deviceIp={deviceIp}
        deviceType={deviceType}
        customer={customer}
        onConnect={handleConnect}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <RemoteSessionTerminal
      deviceName={deviceName}
      deviceIp={deviceIp}
      protocol={protocol}
      customer={customer}
      initialIdentity={selectedIdentity}
      vpnConnected={!!selectedVPN}
      onClose={handleClose}
    />
  );
}

export default function RemoteSessionPage() {
  return (
    <TechnicianRoute>
      <Suspense fallback={
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      }>
        <RemoteSessionContent />
      </Suspense>
    </TechnicianRoute>
  );
}