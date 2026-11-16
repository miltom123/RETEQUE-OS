// ============================================================================
// RETEQUEÑOS - CUENTAS DE CLIENTE (RFI-01)
// Registro, inicio de sesión, perfil y direcciones contra /api/customers.
// La sesión es un token firmado por el servidor; aquí solo se guarda ese token y una copia del perfil.
// ============================================================================

import type { SavedAddress, UserProfile } from '../types/auth';
import { API_BASE } from './catalog.api';

const STORAGE_KEY_SESSION = 'retequenos_customer_session_v2';

interface ServerCustomer {
  id: string;
  email: string;
  name: string;
  phone: string;
  addresses: SavedAddress[];
  createdAt?: string;
}

interface StoredSession {
  token: string;
  user: UserProfile;
}

function toProfile(c: ServerCustomer): UserProfile {
  const first = c.addresses?.[0];
  return {
    uid: c.id,
    email: c.email,
    displayName: c.name,
    phone: c.phone,
    addresses: c.addresses || [],
    defaultAddress: first?.address,
    defaultReference: first?.reference,
    provider: 'password',
    createdAt: c.createdAt,
  };
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY_SESSION);
  } catch {
    // Navegador sin almacenamiento (modo privado): la sesión dura lo que la pestaña
  }
}

export class SessionExpiredError extends Error {}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-customer-token': token } : {}), ...(init.headers || {}) },
    });
  } catch {
    throw new Error('No pudimos conectar con la tienda. Revisa tu conexión.');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (res.status === 401 && token) throw new SessionExpiredError(data.error || 'Tu sesión venció. Inicia sesión otra vez.');
  if (!res.ok) throw new Error(data.error || 'No pudimos completar la acción. Inténtalo de nuevo.');
  return data;
}

class AuthService {
  private listeners: Array<(user: UserProfile | null) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_SESSION) this.notify(this.getCurrentUser());
      });
    }
  }

  private notify(user: UserProfile | null) {
    this.listeners.forEach((cb) => cb(user));
  }

  private start(token: string, customer: ServerCustomer): UserProfile {
    const user = toProfile(customer);
    writeSession({ token, user });
    this.notify(user);
    return user;
  }

  public getCurrentUser(): UserProfile | null {
    return readSession()?.user ?? null;
  }

  /** Token para la cabecera x-customer-token; null si no hay sesión. */
  public getToken(): string | null {
    return readSession()?.token ?? null;
  }

  public onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.getCurrentUser());
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public async loginWithEmail(email: string, password: string): Promise<UserProfile> {
    const data = await request<{ token: string; customer: ServerCustomer }>('/api/customers/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    return this.start(data.token, data.customer);
  }

  public async registerWithEmail(email: string, password: string, name: string, phone: string): Promise<UserProfile> {
    const data = await request<{ token: string; customer: ServerCustomer }>('/api/customers/register', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password, name: name.trim(), phone }),
    });
    return this.start(data.token, data.customer);
  }

  /** Vuelve a leer el perfil del servidor. Si la sesión venció, la cierra. */
  public async refresh(): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const data = await request<{ customer: ServerCustomer }>('/api/customers/me', {}, token);
      return this.start(token, data.customer);
    } catch (error) {
      if (error instanceof SessionExpiredError) await this.logout();
      return this.getCurrentUser();
    }
  }

  public async resetPassword(email: string): Promise<boolean> {
    if (!email.trim() || !email.includes('@')) throw new Error('Ingresa un correo electrónico válido');
    // Sin servidor de correo: la recuperación se atiende por WhatsApp (ver ForgotPasswordPage)
    return true;
  }

  public async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const token = this.getToken();
    const current = this.getCurrentUser();
    if (!token || !current) throw new Error('No hay sesión activa');
    const body: Record<string, unknown> = {};
    if (data.displayName !== undefined) body.name = data.displayName;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.addresses !== undefined) body.addresses = data.addresses;
    else if (data.defaultAddress !== undefined) {
      // Formulario simple del perfil: edita la primera dirección guardada
      const rest = (current.addresses || []).slice(1);
      body.addresses = data.defaultAddress.trim()
        ? [{ ...(current.addresses?.[0] || {}), label: current.addresses?.[0]?.label || 'Casa', address: data.defaultAddress, reference: data.defaultReference || '' }, ...rest]
        : rest;
    }
    try {
      const res = await request<{ customer: ServerCustomer }>('/api/customers/me', { method: 'PATCH', body: JSON.stringify(body) }, token);
      return this.start(token, res.customer);
    } catch (error) {
      if (error instanceof SessionExpiredError) await this.logout();
      throw error;
    }
  }

  public async logout(): Promise<void> {
    writeSession(null);
    this.notify(null);
  }
}

export const authService = new AuthService();

/** Pedidos del cliente con sesión (RFI-10). */
export async function fetchMyOrders<T>(): Promise<T[]> {
  const token = authService.getToken();
  if (!token) return [];
  try {
    return await request<T[]>('/api/customers/me/orders', {}, token);
  } catch (error) {
    if (error instanceof SessionExpiredError) await authService.logout();
    throw error;
  }
}
