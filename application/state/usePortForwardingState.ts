import { useCallback, useEffect, useState } from 'react';
import { PortForwardingRule, PortForwardingType } from '../../domain/models';
import { STORAGE_KEY_PORT_FORWARDING } from '../../infrastructure/config/storageKeys';
import { localStorageAdapter } from '../../infrastructure/persistence/localStorageAdapter';

export type ViewMode = 'grid' | 'list';
export type SortMode = 'az' | 'za' | 'newest' | 'oldest';

export interface UsePortForwardingStateResult {
  rules: PortForwardingRule[];
  selectedRuleId: string | null;
  viewMode: ViewMode;
  sortMode: SortMode;
  search: string;
  
  setSelectedRuleId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortMode: (mode: SortMode) => void;
  setSearch: (query: string) => void;
  
  addRule: (rule: Omit<PortForwardingRule, 'id' | 'createdAt' | 'status'>) => PortForwardingRule;
  updateRule: (id: string, updates: Partial<PortForwardingRule>) => void;
  deleteRule: (id: string) => void;
  duplicateRule: (id: string) => void;
  
  setRuleStatus: (id: string, status: PortForwardingRule['status'], error?: string) => void;
  
  filteredRules: PortForwardingRule[];
  selectedRule: PortForwardingRule | undefined;
}

export const usePortForwardingState = (): UsePortForwardingStateResult => {
  const [rules, setRules] = useState<PortForwardingRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [search, setSearch] = useState('');
  
  // Load rules from storage on mount
  useEffect(() => {
    const saved = localStorageAdapter.read<PortForwardingRule[]>(STORAGE_KEY_PORT_FORWARDING);
    if (saved && Array.isArray(saved)) {
      // Reset status to inactive on load (since tunnels don't persist across sessions)
      const withResetStatus = saved.map(r => ({ ...r, status: 'inactive' as const, error: undefined }));
      setRules(withResetStatus);
    }
  }, []);
  
  // Persist rules to storage whenever they change
  const persistRules = useCallback((updatedRules: PortForwardingRule[]) => {
    localStorageAdapter.write(STORAGE_KEY_PORT_FORWARDING, updatedRules);
  }, []);
  
  const addRule = useCallback((rule: Omit<PortForwardingRule, 'id' | 'createdAt' | 'status'>): PortForwardingRule => {
    const newRule: PortForwardingRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      status: 'inactive',
    };
    setRules(prev => {
      const updated = [...prev, newRule];
      persistRules(updated);
      return updated;
    });
    setSelectedRuleId(newRule.id);
    return newRule;
  }, [persistRules]);
  
  const updateRule = useCallback((id: string, updates: Partial<PortForwardingRule>) => {
    setRules(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      persistRules(updated);
      return updated;
    });
  }, [persistRules]);
  
  const deleteRule = useCallback((id: string) => {
    setRules(prev => {
      const updated = prev.filter(r => r.id !== id);
      persistRules(updated);
      return updated;
    });
    if (selectedRuleId === id) {
      setSelectedRuleId(null);
    }
  }, [selectedRuleId, persistRules]);
  
  const duplicateRule = useCallback((id: string) => {
    const original = rules.find(r => r.id === id);
    if (!original) return;
    
    const copy: PortForwardingRule = {
      ...original,
      id: crypto.randomUUID(),
      label: `${original.label} (Copy)`,
      createdAt: Date.now(),
      status: 'inactive',
      error: undefined,
      lastUsedAt: undefined,
    };
    setRules(prev => {
      const updated = [...prev, copy];
      persistRules(updated);
      return updated;
    });
    setSelectedRuleId(copy.id);
  }, [rules, persistRules]);
  
  const setRuleStatus = useCallback((id: string, status: PortForwardingRule['status'], error?: string) => {
    setRules(prev => {
      const updated = prev.map(r => {
        if (r.id !== id) return r;
        return {
          ...r,
          status,
          error,
          lastUsedAt: status === 'active' ? Date.now() : r.lastUsedAt,
        };
      });
      persistRules(updated);
      return updated;
    });
  }, [persistRules]);
  
  // Filter and sort rules
  const filteredRules = useCallback(() => {
    let result = [...rules];
    
    // Filter by search
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(r => 
        r.label.toLowerCase().includes(s) ||
        r.type.toLowerCase().includes(s) ||
        r.localPort.toString().includes(s) ||
        (r.remoteHost?.toLowerCase().includes(s)) ||
        (r.remotePort?.toString().includes(s))
      );
    }
    
    // Sort
    switch (sortMode) {
      case 'az':
        result.sort((a, b) => a.label.localeCompare(b.label));
        break;
      case 'za':
        result.sort((a, b) => b.label.localeCompare(a.label));
        break;
      case 'newest':
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        result.sort((a, b) => a.createdAt - b.createdAt);
        break;
    }
    
    return result;
  }, [rules, search, sortMode])();
  
  const selectedRule = rules.find(r => r.id === selectedRuleId);
  
  return {
    rules,
    selectedRuleId,
    viewMode,
    sortMode,
    search,
    
    setSelectedRuleId,
    setViewMode,
    setSortMode,
    setSearch,
    
    addRule,
    updateRule,
    deleteRule,
    duplicateRule,
    
    setRuleStatus,
    
    filteredRules,
    selectedRule,
  };
};
