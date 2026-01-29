import { ChevronRight, FileCode, Folder, FolderOpen, Package, Plus, Edit2, Trash2, Play } from 'lucide-react';
import React, { useMemo } from 'react';
import { useI18n } from '../application/i18n/I18nProvider';
import { useTreeExpandedState } from '../application/state/useTreeExpandedState';
import { buildSnippetPackageTree, countSnippetsInPackage } from '../domain/snippets';
import { STORAGE_KEY_VAULT_SNIPPETS_TREE_EXPANDED } from '../infrastructure/config/storageKeys';
import { cn } from '../lib/utils';
import { Snippet, SnippetPackageNode, Host } from '../types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from './ui/context-menu';
import { Button } from './ui/button';

interface SnippetPackageTreeViewProps {
  packages: string[];
  snippets: Snippet[];
  hosts: Host[];
  sortMode?: 'az' | 'za';
  onEditSnippet: (snippet: Snippet) => void;
  onDeleteSnippet: (id: string) => void;
  onRunSnippet?: (snippet: Snippet, targetHosts: Host[]) => void;
  onNewSnippet: (packagePath?: string) => void;
  onNewPackage: (parentPath?: string) => void;
  onEditPackage: (packagePath: string) => void;
  onDeletePackage: (packagePath: string) => void;
  onMoveSnippet: (snippetId: string, packagePath: string | null) => void;
  onMovePackage: (sourcePath: string, targetPath: string) => void;
  onCopySnippet: (snippet: Snippet) => void;
}

interface TreeNodeProps {
  node: SnippetPackageNode;
  depth: number;
  sortMode: 'az' | 'za';
  expandedPaths: Set<string>;
  hosts: Host[];
  onToggle: (path: string) => void;
  onEditSnippet: (snippet: Snippet) => void;
  onDeleteSnippet: (id: string) => void;
  onRunSnippet?: (snippet: Snippet, targetHosts: Host[]) => void;
  onNewSnippet: (packagePath?: string) => void;
  onNewPackage: (parentPath?: string) => void;
  onEditPackage: (packagePath: string) => void;
  onDeletePackage: (packagePath: string) => void;
  onMoveSnippet: (snippetId: string, packagePath: string | null) => void;
  onMovePackage: (sourcePath: string, targetPath: string) => void;
  onCopySnippet: (snippet: Snippet) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  sortMode,
  expandedPaths,
  hosts,
  onToggle,
  onEditSnippet,
  onDeleteSnippet,
  onRunSnippet,
  onNewSnippet,
  onNewPackage,
  onEditPackage,
  onDeletePackage,
  onMoveSnippet,
  onMovePackage,
  onCopySnippet,
}) => {
  const { t } = useI18n();
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = Object.keys(node.children).length > 0;
  const paddingLeft = `${depth * 20 + 12}px`;
  const totalSnippets = countSnippetsInPackage(node);

  const childNodes = useMemo(() => {
    const nodes = Object.values(node.children);
    return nodes.sort((a, b) => {
      switch (sortMode) {
        case 'za':
          return b.name.localeCompare(a.name);
        case 'az':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [node.children, sortMode]);

  const sortedSnippets = useMemo(() => {
    return [...node.snippets].sort((a, b) => {
      switch (sortMode) {
        case 'za':
          return b.label.localeCompare(a.label);
        case 'az':
        default:
          return a.label.localeCompare(b.label);
      }
    });
  }, [node.snippets, sortMode]);

  return (
    <div>
      {/* Package Node */}
      <Collapsible open={isExpanded} onOpenChange={() => onToggle(node.path)}>
        <ContextMenu>
          <ContextMenuTrigger>
            <CollapsibleTrigger asChild>
              <div
                className={cn(
                  "flex items-center py-2 pr-3 text-sm font-medium cursor-pointer transition-colors select-none group hover:bg-secondary/60 rounded-lg",
                )}
                style={{ paddingLeft }}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("package-path", node.path)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const snippetId = e.dataTransfer.getData("snippet-id");
                  const packagePath = e.dataTransfer.getData("package-path");
                  if (snippetId) onMoveSnippet(snippetId, node.path);
                  if (packagePath && packagePath !== node.path) onMovePackage(packagePath, node.path);
                }}
              >
                <div className="mr-2 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                  {(hasChildren || node.snippets.length > 0) && (
                    <div className={cn("transition-transform duration-200", isExpanded ? "rotate-90" : "")}>
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>
                <div className="mr-3 text-primary/80 group-hover:text-primary transition-colors">
                  {isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                </div>
                <span className="truncate flex-1 font-semibold">{node.name}</span>
                {totalSnippets > 0 && (
                  <span className="text-xs opacity-70 bg-background/50 px-2 py-0.5 rounded-full border border-border">
                    {totalSnippets}
                  </span>
                )}
              </div>
            </CollapsibleTrigger>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onNewSnippet(node.path)}>
              <FileCode className="mr-2 h-4 w-4" /> {t("snippets.action.newSnippet")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onNewPackage(node.path)}>
              <Package className="mr-2 h-4 w-4" /> {t("snippets.action.newPackage")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onEditPackage(node.path)}>
              <Edit2 className="mr-2 h-4 w-4" /> {t("common.rename")}
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onDeletePackage(node.path)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t("action.delete")}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <CollapsibleContent>
          {/* Child Packages */}
          {childNodes.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              sortMode={sortMode}
              expandedPaths={expandedPaths}
              hosts={hosts}
              onToggle={onToggle}
              onEditSnippet={onEditSnippet}
              onDeleteSnippet={onDeleteSnippet}
              onRunSnippet={onRunSnippet}
              onNewSnippet={onNewSnippet}
              onNewPackage={onNewPackage}
              onEditPackage={onEditPackage}
              onDeletePackage={onDeletePackage}
              onMoveSnippet={onMoveSnippet}
              onMovePackage={onMovePackage}
              onCopySnippet={onCopySnippet}
            />
          ))}
          
          {/* Snippets in this package */}
          {sortedSnippets.map((snippet) => (
            <SnippetTreeItem
              key={snippet.id}
              snippet={snippet}
              depth={depth + 1}
              hosts={hosts}
              onEditSnippet={onEditSnippet}
              onDeleteSnippet={onDeleteSnippet}
              onRunSnippet={onRunSnippet}
              onMoveSnippet={onMoveSnippet}
              onCopySnippet={onCopySnippet}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

interface SnippetTreeItemProps {
  snippet: Snippet;
  depth: number;
  hosts: Host[];
  onEditSnippet: (snippet: Snippet) => void;
  onDeleteSnippet: (id: string) => void;
  onRunSnippet?: (snippet: Snippet, targetHosts: Host[]) => void;
  onMoveSnippet: (snippetId: string, packagePath: string | null) => void;
  onCopySnippet: (snippet: Snippet) => void;
}

const SnippetTreeItem: React.FC<SnippetTreeItemProps> = ({
  snippet,
  depth,
  hosts,
  onEditSnippet,
  onDeleteSnippet,
  onRunSnippet,
  onMoveSnippet: _onMoveSnippet,
  onCopySnippet,
}) => {
  const { t } = useI18n();
  const paddingLeft = `${depth * 20 + 12}px`;

  // Get target hosts for this snippet (including group-based targets)
  const targetHosts = useMemo(() => {
    const directTargets = (snippet.targets || [])
      .map(id => hosts.find(h => h.id === id))
      .filter((h): h is Host => Boolean(h));

    const groupTargets = (snippet.targetGroups || [])
      .flatMap(groupPath => hosts.filter(h => h.group === groupPath));

    // Combine and deduplicate
    const allTargets = [...directTargets, ...groupTargets];
    const uniqueTargets = allTargets.filter((host, index, arr) => 
      arr.findIndex(h => h.id === host.id) === index
    );

    return uniqueTargets;
  }, [snippet.targets, snippet.targetGroups, hosts]);

  const hasTargets = targetHosts.length > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className="flex items-center py-2 pr-3 text-sm cursor-pointer transition-colors select-none group hover:bg-secondary/40 rounded-lg"
          style={{ paddingLeft }}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("snippet-id", snippet.id)}
          onClick={() => onEditSnippet(snippet)}
        >
          <div className="mr-2 flex-shrink-0 w-4 h-4" />
          <div className="mr-3 flex-shrink-0 text-primary/70">
            <FileCode size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{snippet.label}</div>
            <div className="text-xs text-muted-foreground font-mono leading-4 truncate">
              {snippet.command.replace(/\s+/g, ' ') || t('snippets.commandFallback')}
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasTargets && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                {targetHosts.length}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (hasTargets && onRunSnippet) {
                  onRunSnippet(snippet, targetHosts);
                } else {
                  onEditSnippet(snippet);
                }
              }}
            >
              {hasTargets ? <Play size={12} /> : <Edit2 size={12} />}
            </Button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {hasTargets && onRunSnippet && (
          <>
            <ContextMenuItem onClick={() => onRunSnippet(snippet, targetHosts)}>
              <Play className="mr-2 h-4 w-4" /> {t('action.run')}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={() => onEditSnippet(snippet)}>
          <Edit2 className="mr-2 h-4 w-4" /> {t('action.edit')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCopySnippet(snippet)}>
          <FileCode className="mr-2 h-4 w-4" /> {t('action.copy')}
        </ContextMenuItem>
        <ContextMenuItem 
          className="text-destructive focus:text-destructive" 
          onClick={() => onDeleteSnippet(snippet.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t('action.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

const SnippetPackageTreeView: React.FC<SnippetPackageTreeViewProps> = ({
  packages,
  snippets,
  hosts,
  sortMode = 'az',
  onEditSnippet,
  onDeleteSnippet,
  onRunSnippet,
  onNewSnippet,
  onNewPackage,
  onEditPackage,
  onDeletePackage,
  onMoveSnippet,
  onMovePackage,
  onCopySnippet,
}) => {
  const { expandedPaths, togglePath } = useTreeExpandedState(STORAGE_KEY_VAULT_SNIPPETS_TREE_EXPANDED);

  const packageTree = useMemo(() => {
    return buildSnippetPackageTree(packages, snippets);
  }, [packages, snippets]);

  // Root level snippets (no package)
  const rootSnippets = useMemo(() => {
    return snippets.filter(s => !s.package).sort((a, b) => {
      switch (sortMode) {
        case 'za':
          return b.label.localeCompare(a.label);
        case 'az':
        default:
          return a.label.localeCompare(b.label);
      }
    });
  }, [snippets, sortMode]);

  return (
    <div className="space-y-1">
      {/* Root level snippets */}
      {rootSnippets.map((snippet) => (
        <SnippetTreeItem
          key={snippet.id}
          snippet={snippet}
          depth={0}
          hosts={hosts}
          onEditSnippet={onEditSnippet}
          onDeleteSnippet={onDeleteSnippet}
          onRunSnippet={onRunSnippet}
          onMoveSnippet={onMoveSnippet}
          onCopySnippet={onCopySnippet}
        />
      ))}

      {/* Package tree */}
      {packageTree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          sortMode={sortMode}
          expandedPaths={expandedPaths}
          hosts={hosts}
          onToggle={togglePath}
          onEditSnippet={onEditSnippet}
          onDeleteSnippet={onDeleteSnippet}
          onRunSnippet={onRunSnippet}
          onNewSnippet={onNewSnippet}
          onNewPackage={onNewPackage}
          onEditPackage={onEditPackage}
          onDeletePackage={onDeletePackage}
          onMoveSnippet={onMoveSnippet}
          onMovePackage={onMovePackage}
          onCopySnippet={onCopySnippet}
        />
      ))}
    </div>
  );
};

export default SnippetPackageTreeView;