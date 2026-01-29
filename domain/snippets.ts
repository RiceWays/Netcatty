import { Snippet, SnippetPackageNode } from './models';

/**
 * Build a tree structure from flat package paths and snippets
 */
export function buildSnippetPackageTree(packages: string[], snippets: Snippet[]): SnippetPackageNode[] {
  const rootNodes: Record<string, SnippetPackageNode> = {};

  // Create nodes for all packages
  packages.forEach(packagePath => {
    const parts = packagePath.split('/').filter(Boolean);
    const isAbsolute = packagePath.startsWith('/');
    
    let currentLevel = rootNodes;

    parts.forEach((part, index) => {
      const pathSoFar = isAbsolute 
        ? `/${parts.slice(0, index + 1).join('/')}`
        : parts.slice(0, index + 1).join('/');

      // Always use just the part name for display, regardless of absolute/relative path
      const displayName = part;

      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: displayName,
          path: pathSoFar,
          children: {},
          snippets: []
        };
      }

      currentLevel = currentLevel[part].children;
    });
  });

  // Add snippets to their respective packages
  snippets.forEach(snippet => {
    const packagePath = snippet.package || '';
    if (!packagePath) {
      // Root level snippets - we'll handle them separately
      return;
    }

    const parts = packagePath.split('/').filter(Boolean);
    
    let currentLevel = rootNodes;
    
    parts.forEach(part => {
      if (currentLevel[part]) {
        currentLevel = currentLevel[part].children;
      }
    });

    // Find the target node and add snippet
    const targetNode = findNodeByPath(Object.values(rootNodes), packagePath);
    if (targetNode) {
      targetNode.snippets.push(snippet);
    }
  });

  return Object.values(rootNodes);
}

/**
 * Find a node by its path in the tree
 */
export function findNodeByPath(nodes: SnippetPackageNode[], path: string): SnippetPackageNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }
    
    const found = findNodeByPath(Object.values(node.children), path);
    if (found) {
      return found;
    }
  }
  
  return null;
}

/**
 * Get all package paths from a tree structure
 */
export function getAllPackagePaths(nodes: SnippetPackageNode[]): string[] {
  const paths: string[] = [];
  
  function traverse(nodeList: SnippetPackageNode[]) {
    nodeList.forEach(node => {
      paths.push(node.path);
      traverse(Object.values(node.children));
    });
  }
  
  traverse(nodes);
  return paths;
}

/**
 * Get all snippets from a package and its children
 */
export function getSnippetsInPackageTree(node: SnippetPackageNode): Snippet[] {
  const snippets = [...node.snippets];
  
  Object.values(node.children).forEach(child => {
    snippets.push(...getSnippetsInPackageTree(child));
  });
  
  return snippets;
}

/**
 * Count total snippets in a package including children
 */
export function countSnippetsInPackage(node: SnippetPackageNode): number {
  let count = node.snippets.length;
  
  Object.values(node.children).forEach(child => {
    count += countSnippetsInPackage(child);
  });
  
  return count;
}