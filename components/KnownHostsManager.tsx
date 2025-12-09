import React, { useState, useMemo, useEffect } from 'react';
import {
    Search,
    Import,
    Trash2,
    MoreVertical,
    Server,
    Key,
    Clock,
    ArrowRight,
    FileText,
    RefreshCw,
    Shield,
    ExternalLink,
    FolderOpen,
} from 'lucide-react';
import { KnownHost, Host } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from './ui/context-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';

interface KnownHostsManagerProps {
    knownHosts: KnownHost[];
    hosts: Host[];
    onSave: (knownHost: KnownHost) => void;
    onUpdate: (knownHost: KnownHost) => void;
    onDelete: (id: string) => void;
    onConvertToHost: (knownHost: KnownHost) => void;
    onImportFromFile: (hosts: KnownHost[]) => void;
    onRefresh: () => void;
}

const KnownHostsManager: React.FC<KnownHostsManagerProps> = ({
    knownHosts,
    hosts,
    onSave,
    onUpdate,
    onDelete,
    onConvertToHost,
    onImportFromFile,
    onRefresh,
}) => {
    const [search, setSearch] = useState('');
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<KnownHost[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const hasScannedRef = React.useRef(false);

    // Auto-scan on first mount
    useEffect(() => {
        if (!hasScannedRef.current && knownHosts.length === 0) {
            hasScannedRef.current = true;
            handleScanSystem();
        }
    }, []);

    const filteredHosts = useMemo(() => {
        if (!search.trim()) return knownHosts;
        const term = search.toLowerCase();
        return knownHosts.filter(
            (h) =>
                h.hostname.toLowerCase().includes(term) ||
                h.keyType.toLowerCase().includes(term)
        );
    }, [knownHosts, search]);

    // Check if a known host has been converted to a managed host
    const isConverted = (knownHost: KnownHost) => {
        if (knownHost.convertedToHostId) {
            return hosts.some((h) => h.id === knownHost.convertedToHostId);
        }
        return false;
    };

    // Parse known_hosts file content
    const parseKnownHostsFile = (content: string): KnownHost[] => {
        const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));
        const parsed: KnownHost[] = [];

        for (const line of lines) {
            try {
                // Format: hostname[,hostname2,...] keytype base64key [comment]
                // Or hashed: |1|salt|hash keytype base64key [comment]
                const parts = line.trim().split(/\s+/);
                if (parts.length < 3) continue;

                const [hostPattern, keyType, publicKey] = parts;

                // Extract hostname and port
                let hostname = hostPattern;
                let port = 22;

                // Handle [hostname]:port format
                const bracketMatch = hostPattern.match(/^\[([^\]]+)\]:(\d+)$/);
                if (bracketMatch) {
                    hostname = bracketMatch[1];
                    port = parseInt(bracketMatch[2], 10);
                } else if (hostPattern.includes(',')) {
                    // Multiple hostnames, take the first one
                    hostname = hostPattern.split(',')[0];
                }

                // Skip hashed entries for now (start with |1|)
                if (hostname.startsWith('|1|')) {
                    hostname = '(hashed)';
                }

                parsed.push({
                    id: `kh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    hostname,
                    port,
                    keyType,
                    publicKey: publicKey.slice(0, 64) + '...', // Truncate for display
                    discoveredAt: Date.now(),
                });
            } catch (e) {
                console.warn('Failed to parse known_hosts line:', line);
            }
        }

        return parsed;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const parsed = parseKnownHostsFile(content);

            // Filter out already existing hosts
            const existingHostnames = new Set(knownHosts.map((h) => `${h.hostname}:${h.port}`));
            const newHosts = parsed.filter((h) => !existingHostnames.has(`${h.hostname}:${h.port}`));

            setImportPreview(newHosts);
            setSelectedIds(new Set(newHosts.map((h) => h.id)));
            setIsImportDialogOpen(true);
        };
        reader.readAsText(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImportConfirm = () => {
        const toImport = importPreview.filter((h) => selectedIds.has(h.id));
        onImportFromFile(toImport);
        setIsImportDialogOpen(false);
        setImportPreview([]);
        setSelectedIds(new Set());
    };

    const handleScanSystem = async () => {
        // Try to read from common known_hosts locations via Electron
        if (window.nebula?.readKnownHosts) {
            try {
                const content = await window.nebula.readKnownHosts();
                if (content) {
                    const parsed = parseKnownHostsFile(content);
                    const existingHostnames = new Set(knownHosts.map((h) => `${h.hostname}:${h.port}`));
                    const newHosts = parsed.filter((h) => !existingHostnames.has(`${h.hostname}:${h.port}`));

                    if (newHosts.length > 0) {
                        setImportPreview(newHosts);
                        setSelectedIds(new Set(newHosts.map((h) => h.id)));
                        setIsImportDialogOpen(true);
                    }
                }
            } catch (err) {
                console.error('Failed to scan system known_hosts:', err);
            }
        }
        onRefresh();
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getKeyTypeColor = (keyType: string) => {
        switch (keyType.toLowerCase()) {
            case 'ssh-ed25519':
                return 'text-emerald-500';
            case 'ssh-rsa':
                return 'text-amber-500';
            case 'ecdsa-sha2-nistp256':
            case 'ecdsa-sha2-nistp384':
            case 'ecdsa-sha2-nistp521':
                return 'text-blue-500';
            default:
                return 'text-muted-foreground';
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-secondary/50">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search known hosts..."
                            className="pl-9 h-9 bg-background border-border/60 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs"
                        onClick={handleScanSystem}
                    >
                        <RefreshCw size={14} className="mr-2" />
                        Scan System
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,known_hosts"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-9 px-3 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Import size={14} className="mr-2" />
                        Import File
                    </Button>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                    {filteredHosts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <div className="h-16 w-16 rounded-2xl bg-secondary/80 flex items-center justify-center mb-4">
                                <Shield size={32} className="opacity-60" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No Known Hosts</h3>
                            <p className="text-sm text-center max-w-sm mb-4">
                                Known hosts are SSH servers you've connected to before. Import from your system's known_hosts file to get started.
                            </p>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={handleScanSystem}>
                                    <RefreshCw size={14} className="mr-2" />
                                    Scan System
                                </Button>
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <FolderOpen size={14} className="mr-2" />
                                    Browse File
                                </Button>
                            </div>
                        </div>
                    ) : (
                        filteredHosts.map((knownHost) => {
                            const converted = isConverted(knownHost);
                            return (
                                <ContextMenu key={knownHost.id}>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            className={cn(
                                                "group flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50 bg-background hover:bg-secondary/50 transition-colors cursor-pointer",
                                                converted && "opacity-60"
                                            )}
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                                <Server size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold truncate">
                                                        {knownHost.hostname}
                                                    </span>
                                                    {knownHost.port !== 22 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            :{knownHost.port}
                                                        </span>
                                                    )}
                                                    {converted && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500">
                                                            Managed
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                    <span className={cn("flex items-center gap-1", getKeyTypeColor(knownHost.keyType))}>
                                                        <Key size={10} />
                                                        {knownHost.keyType}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {formatDate(knownHost.discoveredAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!converted && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onConvertToHost(knownHost);
                                                        }}
                                                        title="Convert to managed host"
                                                    >
                                                        <ArrowRight size={14} />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(knownHost.id);
                                                    }}
                                                    title="Remove"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        {!converted && (
                                            <ContextMenuItem onClick={() => onConvertToHost(knownHost)}>
                                                <ArrowRight className="mr-2 h-4 w-4" />
                                                Convert to Managed Host
                                            </ContextMenuItem>
                                        )}
                                        {converted && (
                                            <ContextMenuItem disabled>
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Already Managed
                                            </ContextMenuItem>
                                        )}
                                        <ContextMenuItem
                                            className="text-destructive"
                                            onClick={() => onDelete(knownHost.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Remove
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            {/* Import Dialog */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Import Known Hosts</DialogTitle>
                        <DialogDescription>
                            Found {importPreview.length} new host{importPreview.length !== 1 ? 's' : ''} to import.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[300px]">
                        <div className="space-y-2 pr-4">
                            {importPreview.map((host) => (
                                <label
                                    key={host.id}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                                        selectedIds.has(host.id)
                                            ? "border-primary bg-primary/5"
                                            : "border-border/50 hover:bg-secondary/50"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(host.id)}
                                        onChange={(e) => {
                                            const next = new Set(selectedIds);
                                            if (e.target.checked) {
                                                next.add(host.id);
                                            } else {
                                                next.delete(host.id);
                                            }
                                            setSelectedIds(next);
                                        }}
                                        className="rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">
                                            {host.hostname}
                                            {host.port !== 22 && `:${host.port}`}
                                        </div>
                                        <div className={cn("text-xs", getKeyTypeColor(host.keyType))}>
                                            {host.keyType}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImportConfirm}
                            disabled={selectedIds.size === 0}
                        >
                            Import {selectedIds.size} Host{selectedIds.size !== 1 ? 's' : ''}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default KnownHostsManager;
