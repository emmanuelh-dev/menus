export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  image?: string;
  featured: boolean;
  created_at: string;
}