import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { useCatalogStore } from '../store/catalogStore';
import { useAuthStore } from '../store/authStore';

export const App: React.FC = () => {
  // Al cambiar la versión del catálogo se vuelve a pintar toda la carta con precios y stock del servidor
  useCatalogStore((s) => s.version);
  const sync = useCatalogStore((s) => s.sync);

  const refreshSession = useAuthStore((s) => s.refresh);

  useEffect(() => {
    sync();
    // Confirma con el servidor que la sesión del cliente siga vigente y trae su perfil
    refreshSession();
  }, [sync, refreshSession]);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
};
