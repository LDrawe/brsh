import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { IVfsNode } from 'types/Files';
import { writeAtomically } from './io';
import { resolveVfsNode } from './pointer';
import { isNameSafe, isPathSafe } from './security';
import { VFSError } from './errors';

export class VirtualFileSystem {
  private tree: Record<string, IVfsNode>;
  private treeConfigPath: string;

  constructor() {
    this.treeConfigPath = path.resolve('src', 'config', 'tree.json');
    this.tree = this.loadTree();
  }

  private loadTree(): Record<string, IVfsNode> {
    try {
      if (!fs.existsSync(this.treeConfigPath)) {
        return {};
      }
      const data = fs.readFileSync(this.treeConfigPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load VFS tree:', error);
      return {};
    }
  }

  public getTree(): Record<string, IVfsNode> {
    return this.tree;
  }

  public save(): void {
    writeAtomically(this.treeConfigPath, this.tree);
  }

  public resolveNode(username: string, userHomePath: string, targetAbsolutePath: string): IVfsNode | null {
    if (!this.tree[username]) return null;
    return resolveVfsNode(this.tree[username], userHomePath, targetAbsolutePath);
  }

  public deepCloneNode(node: IVfsNode): IVfsNode {
    const clone: IVfsNode = {
      id: crypto.randomUUID(),
      name: node.name,
      type: node.type,
      created_at: Date.now(),
      data: node.data
    };

    if (node.children) {
      clone.children = node.children.map(child => this.deepCloneNode(child));
    }

    return clone;
  }

  public validatePathSafe(userHomePath: string, targetPath: string): void {
    if (!isPathSafe(userHomePath, targetPath)) {
      throw new VFSError('Acesso negado: Tentativa de evasão de diretório bloqueada.');
    }
  }

  public validateNameSafe(name: string): void {
    if (!isNameSafe(name)) {
      throw new VFSError('Nome inválido: Contém caracteres especiais não permitidos.');
    }
  }
}

// Export a singleton instance to be used across the application
export const vfs = new VirtualFileSystem();
