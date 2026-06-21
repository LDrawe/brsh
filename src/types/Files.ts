export interface IVfsNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  created_at: number;
  data?: string;
  children?: IVfsNode[];
}