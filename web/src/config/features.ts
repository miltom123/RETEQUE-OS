// Interruptores de funciones. Se leen al compilar desde las variables de entorno de Vite (ver web/.env.example).

// Cuentas de cliente (RFI-01): reales en el servidor (/api/customers). Activas salvo VITE_CUSTOMER_ACCOUNTS=false.
export const customerAccountsEnabled = import.meta.env.VITE_CUSTOMER_ACCOUNTS !== 'false';

// Controles de diseño (simulador de celular y estilo iOS/Android): solo en desarrollo o en demos.
export const designControlsEnabled = import.meta.env.DEV || import.meta.env.VITE_DEVICE_PREVIEW === 'true';
