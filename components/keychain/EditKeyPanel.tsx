/**
 * Edit Key Panel - Edit existing SSH key
 */

import { Info } from 'lucide-react';
import React from 'react';
import { SSHKey } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface EditKeyPanelProps {
    draftKey: Partial<SSHKey>;
    _originalKey: SSHKey; // Reserved for future diff/comparison feature
    setDraftKey: (key: Partial<SSHKey>) => void;
    onExport: () => void;
    onSave: () => void;
}

export const EditKeyPanel: React.FC<EditKeyPanelProps> = ({
    draftKey,
    _originalKey, // Reserved for future diff/comparison feature
    setDraftKey,
    onExport,
    onSave,
}) => {
    return (
        <>
            <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                    value={draftKey.label || ''}
                    onChange={e => setDraftKey({ ...draftKey, label: e.target.value })}
                    placeholder="Key label"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-destructive">Private key *</Label>
                <Textarea
                    value={draftKey.privateKey || ''}
                    onChange={e => setDraftKey({ ...draftKey, privateKey: e.target.value })}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                    className="min-h-[180px] font-mono text-xs"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-muted-foreground">Public key</Label>
                <Textarea
                    value={draftKey.publicKey || ''}
                    onChange={e => setDraftKey({ ...draftKey, publicKey: e.target.value })}
                    placeholder="ssh-ed25519 AAAA..."
                    className="min-h-[80px] font-mono text-xs"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-muted-foreground">Certificate</Label>
                <Textarea
                    value={draftKey.certificate || ''}
                    onChange={e => setDraftKey({ ...draftKey, certificate: e.target.value })}
                    placeholder="Certificate content (optional)"
                    className="min-h-[60px] font-mono text-xs"
                />
            </div>

            {/* Key Export section */}
            <div className="pt-4 mt-4 border-t border-border/60">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">Key export</span>
                    <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                        <Info size={10} className="text-muted-foreground" />
                    </div>
                </div>
                <Button className="w-full h-11" onClick={onExport}>
                    Export to host
                </Button>
            </div>

            {/* Save button */}
            <Button
                className="w-full h-11 mt-4"
                disabled={!draftKey.label?.trim() || !draftKey.privateKey?.trim()}
                onClick={onSave}
            >
                Save Changes
            </Button>
        </>
    );
};
