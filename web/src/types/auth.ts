export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  defaultAddress?: string;
  defaultReference?: string;
  photoURL?: string;
  provider: 'password' | 'google' | 'guest';
  createdAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
}
