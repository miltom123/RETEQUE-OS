// ============================================================================
// RETEQUEÑOS - AUTH SERVICE
// Servicio desacoplado para autenticación de clientes
// Compatible con Firebase Auth / Mock Local con persistencia en localStorage
// ============================================================================

import { UserProfile } from '../types/auth';

const STORAGE_KEY_SESSION = 'retequenos_auth_session';
const STORAGE_KEY_USERS = 'retequenos_registered_users';

interface StoredAccount extends UserProfile {
  passwordHash?: string;
}

// Cuenta de demostración precargada para pruebas inmediatas
const DEFAULT_DEMO_ACCOUNTS: StoredAccount[] = [
  {
    uid: 'usr-demo-1',
    email: 'cliente@retequenos.pe',
    displayName: 'Milton Flores',
    phone: '952001122',
    defaultAddress: 'Av. Bolognesi 450, Tacna',
    defaultReference: 'Frente al parque',
    provider: 'password',
    createdAt: new Date().toISOString(),
  },
];

function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_DEMO_ACCOUNTS));
      return DEFAULT_DEMO_ACCOUNTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEMO_ACCOUNTS;
  }
}

function saveRegisteredAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Error saving accounts', e);
  }
}

class AuthService {
  private listeners: Array<(user: UserProfile | null) => void> = [];

  constructor() {
    // Escuchar cambios de storage entre pestañas
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_SESSION) {
          const user = this.getCurrentUser();
          this.notify(user);
        }
      });
    }
  }

  private notify(user: UserProfile | null) {
    this.listeners.forEach((cb) => cb(user));
  }

  public getCurrentUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.getCurrentUser());
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public async loginWithEmail(email: string, _password: string): Promise<UserProfile> {
    await new Promise((r) => setTimeout(r, 400)); // Latencia realista
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getRegisteredAccounts();

    let account = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!account) {
      // Para facilidad en demos locales, si no existe el correo pero es válido lo auto-crea
      account = {
        uid: `usr-${Date.now()}`,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        provider: 'password',
        createdAt: new Date().toISOString(),
      };
      accounts.push(account);
      saveRegisteredAccounts(accounts);
    }

    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(account));
    this.notify(account);
    return account;
  }

  public async registerWithEmail(
    email: string,
    _password: string,
    name: string,
    phone: string
  ): Promise<UserProfile> {
    await new Promise((r) => setTimeout(r, 450));
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getRegisteredAccounts();

    const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      existing.displayName = name.trim();
      existing.phone = phone.trim();
      saveRegisteredAccounts(accounts);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(existing));
      this.notify(existing);
      return existing;
    }

    const newAccount: StoredAccount = {
      uid: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      displayName: name.trim(),
      phone: phone.trim(),
      provider: 'password',
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    saveRegisteredAccounts(accounts);
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newAccount));
    this.notify(newAccount);
    return newAccount;
  }

  public async loginWithGoogle(): Promise<UserProfile> {
    await new Promise((r) => setTimeout(r, 500));
    // Simula flujo OAuth con cuenta verificada de Google
    const accounts = getRegisteredAccounts();
    const googleEmail = 'cliente.google@gmail.com';
    let account = accounts.find((a) => a.email === googleEmail);

    if (!account) {
      account = {
        uid: `usr-google-${Date.now()}`,
        email: googleEmail,
        displayName: 'Amante de Retequeños',
        phone: '952334455',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
        provider: 'google',
        createdAt: new Date().toISOString(),
      };
      accounts.push(account);
      saveRegisteredAccounts(accounts);
    }

    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(account));
    this.notify(account);
    return account;
  }

  public async resetPassword(email: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 400));
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Ingresa un correo electrónico válido');
    }
    return true;
  }

  public async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const current = this.getCurrentUser();
    if (!current) throw new Error('No hay sesión activa');

    const updated: UserProfile = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));

    const accounts = getRegisteredAccounts().map((a) => (a.uid === updated.uid ? { ...a, ...updated } : a));
    saveRegisteredAccounts(accounts);

    this.notify(updated);
    return updated;
  }

  public async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    this.notify(null);
  }
}

export const authService = new AuthService();
