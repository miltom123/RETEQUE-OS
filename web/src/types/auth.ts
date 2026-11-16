/** Dirección de entrega guardada en la cuenta (RFI-06). lat/lng: punto elegido en el mapa. */
export interface SavedAddress {
  id?: string;
  label: string;
  address: string;
  reference?: string;
  lat?: number;
  lng?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  addresses?: SavedAddress[];
  defaultAddress?: string;
  defaultReference?: string;
  photoURL?: string;
  provider: 'password' | 'guest';
  createdAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
}
