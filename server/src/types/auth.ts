export type PermissionScope = 'own' | 'all';
export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

export interface Permission {
  module: string;
  action: PermissionAction;
  scope: PermissionScope;
}

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  permissions: Permission[];
}

export interface JwtPayload {
  id: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}