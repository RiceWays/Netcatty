/**
 * Port Forwarding Service
 * Handles communication between the frontend and the Electron backend
 * for establishing and managing SSH port forwarding tunnels.
 */

import { Host,PortForwardingRule } from '../../domain/models';

export interface PortForwardingConnection {
  ruleId: string;
  tunnelId: string;
  status: 'inactive' | 'connecting' | 'active' | 'error';
  error?: string;
  unsubscribe?: () => void;
}

// Map to track active connections
const activeConnections = new Map<string, PortForwardingConnection>();

/**
 * Get active connection info for a rule
 */
export const getActiveConnection = (ruleId: string): PortForwardingConnection | undefined => {
  return activeConnections.get(ruleId);
};

/**
 * Get all active connection rule IDs
 */
export const getActiveRuleIds = (): string[] => {
  return Array.from(activeConnections.entries())
    .filter(([_, conn]) => conn.status === 'active' || conn.status === 'connecting')
    .map(([ruleId]) => ruleId);
};

/**
 * Start a port forwarding tunnel
 */
export const startPortForward = async (
  rule: PortForwardingRule,
  host: Host,
  keys: { id: string; privateKey: string }[],
  onStatusChange: (status: PortForwardingRule['status'], error?: string) => void
): Promise<{ success: boolean; error?: string }> => {
  const bridge = window.netcatty;
  
  if (!bridge?.startPortForward) {
    // Fallback for browser/dev mode - simulate the connection
    console.warn('[PortForwardingService] Backend not available, simulating connection...');
    return simulateConnection(rule, onStatusChange);
  }
  
  try {
    // Generate a unique tunnel ID
    const tunnelId = `pf-${rule.id}-${Date.now()}`;
    
    // Get the private key if using key auth
    let privateKey: string | undefined;
    if (host.identityFileId) {
      const key = keys.find(k => k.id === host.identityFileId);
      if (key) {
        privateKey = key.privateKey;
      }
    }
    
    // Subscribe to status updates first
    const unsubscribe = bridge.onPortForwardStatus?.(tunnelId, (status, error) => {
      const conn = activeConnections.get(rule.id);
      if (conn) {
        conn.status = status;
        conn.error = error;
      }
      onStatusChange(status, error ?? undefined);
    });
    
    // Store connection info
    activeConnections.set(rule.id, {
      ruleId: rule.id,
      tunnelId,
      status: 'connecting',
      unsubscribe,
    });
    
    onStatusChange('connecting');
    
    // Start the tunnel
    const result = await bridge.startPortForward({
      tunnelId,
      type: rule.type,
      localPort: rule.localPort,
      bindAddress: rule.bindAddress,
      remoteHost: rule.remoteHost,
      remotePort: rule.remotePort,
      hostname: host.hostname,
      port: host.port,
      username: host.username,
      password: host.password,
      privateKey,
    });
    
    if (!result.success) {
      activeConnections.delete(rule.id);
      unsubscribe?.();
      onStatusChange('error', result.error);
      return { success: false, error: result.error };
    }
    
    return { success: true };
    
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    onStatusChange('error', error);
    activeConnections.delete(rule.id);
    return { success: false, error };
  }
};

/**
 * Stop a port forwarding tunnel
 */
export const stopPortForward = async (
  ruleId: string,
  onStatusChange: (status: PortForwardingRule['status']) => void
): Promise<{ success: boolean; error?: string }> => {
  const bridge = window.netcatty;
  const conn = activeConnections.get(ruleId);
  
  if (!conn) {
    onStatusChange('inactive');
    return { success: true };
  }
  
  if (!bridge?.stopPortForward) {
    // Fallback for browser/dev mode
    console.warn('[PortForwardingService] Backend not available, simulating stop...');
    conn.unsubscribe?.();
    activeConnections.delete(ruleId);
    onStatusChange('inactive');
    return { success: true };
  }
  
  try {
    const result = await bridge.stopPortForward(conn.tunnelId);
    
    conn.unsubscribe?.();
    activeConnections.delete(ruleId);
    onStatusChange('inactive');
    
    return result;
    
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error };
  }
};

/**
 * Get the current status of a tunnel
 */
export const getPortForwardStatus = async (
  ruleId: string
): Promise<PortForwardingRule['status']> => {
  const conn = activeConnections.get(ruleId);
  if (!conn) return 'inactive';
  return conn.status;
};

/**
 * Check if backend is available
 */
export const isBackendAvailable = (): boolean => {
  return !!(window.netcatty?.startPortForward);
};

/**
 * Stop all active tunnels (cleanup on unmount)
 */
export const stopAllPortForwards = async (): Promise<void> => {
  const bridge = window.netcatty;
  
  for (const [_ruleId, conn] of activeConnections) {
    try {
      if (bridge?.stopPortForward) {
        await bridge.stopPortForward(conn.tunnelId);
      }
      conn.unsubscribe?.();
    } catch (err) {
      console.warn(`[PortForwardingService] Failed to stop tunnel ${conn.tunnelId}:`, err);
    }
  }
  
  activeConnections.clear();
};

/**
 * Simulate connection for development/browser mode
 */
const simulateConnection = async (
  rule: PortForwardingRule,
  onStatusChange: (status: PortForwardingRule['status'], error?: string) => void
): Promise<{ success: boolean; error?: string }> => {
  onStatusChange('connecting');
  
  // Simulate connection delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Random success/failure for demo
  const success = Math.random() > 0.1; // 90% success rate
  
  if (success) {
    // Store simulated connection
    activeConnections.set(rule.id, {
      ruleId: rule.id,
      tunnelId: `simulated-${rule.id}`,
      status: 'active',
    });
    onStatusChange('active');
    return { success: true };
  } else {
    onStatusChange('error', 'Simulated connection failure');
    return { success: false, error: 'Simulated connection failure' };
  }
};

export default {
  startPortForward,
  stopPortForward,
  getPortForwardStatus,
  isBackendAvailable,
  stopAllPortForwards,
};
