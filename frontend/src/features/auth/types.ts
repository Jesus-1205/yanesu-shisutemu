export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  rol_id: number;
  activo: boolean;
}
