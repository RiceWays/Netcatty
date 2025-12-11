/**
 * Terminal Connection Progress
 * Displays connection progress with logs and timeout
 */
import { AlertCircle,Clock,Play,ShieldCheck } from 'lucide-react';
import React from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

export interface TerminalConnectionProgressProps {
    status: 'connecting' | 'connected' | 'disconnected';
    error: string | null;
    timeLeft: number;
    isCancelling: boolean;
    showLogs: boolean;
    _setShowLogs: (show: boolean) => void; // Reserved for future log toggle UI within this component
    progressLogs: string[];
    onCancel: () => void;
    onRetry: () => void;
}

export const TerminalConnectionProgress: React.FC<TerminalConnectionProgressProps> = ({
    status,
    error,
    timeLeft,
    isCancelling,
    showLogs,
    _setShowLogs, // Reserved for future log toggle UI within this component
    progressLogs,
    onCancel,
    onRetry,
}) => {
    return (
        <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>
                        {status === 'connecting'
                            ? `Timeout in ${timeLeft}s`
                            : error || 'Disconnected'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'connecting' ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={onCancel}
                            disabled={isCancelling}
                        >
                            {isCancelling ? 'Cancelling...' : 'Close'}
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>
                                Close
                            </Button>
                            <Button size="sm" className="h-8" onClick={onRetry}>
                                <Play className="h-3 w-3 mr-2" /> Start over
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {showLogs && (
                <div className="rounded-xl border border-border/60 bg-background/70 shadow-inner">
                    <ScrollArea className="max-h-52 p-3">
                        <div className="space-y-2 text-sm text-foreground/90">
                            {progressLogs.map((line, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <div className="mt-0.5">
                                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <div>{line}</div>
                                </div>
                            ))}
                            {error && (
                                <div className="flex items-start gap-2 text-destructive">
                                    <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                                    <div>{error}</div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </>
    );
};

export default TerminalConnectionProgress;
