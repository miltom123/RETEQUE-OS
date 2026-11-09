// Interruptores de funciones que todavía no deben ver los clientes en producción.
// Se leen al compilar desde las variables de entorno de Vite (ver web/.env.example).

// Cuentas de cliente: hoy se guardan solo en el navegador y el acceso con Google es simulado.
export const customerAccountsEnabled = import.meta.env.VITE_CUSTOMER_ACCOUNTS === 'true';

// Controles de diseño (simulador de celular y estilo iOS/Android): solo en desarrollo o en demos.
export const designControlsEnabled = import.meta.env.DEV || import.meta.env.VITE_DEVICE_PREVIEW === 'true';
