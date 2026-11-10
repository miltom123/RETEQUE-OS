import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { useCatalogStore } from '../store/catalogStore';

export const App: React.FC = () => {
  // Al cambiar la versión del catálogo se vuelve a pintar toda la carta con precios y stock del servidor
  useCatalogStore((s) => s.version);
  const sync = useCatalogStore((s) => s.sync);

  useEffect(() => {
    sync();
  }, [sync]);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
};
