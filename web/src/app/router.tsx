import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { HomePage } from '../pages/HomePage';
import { TequenosPage } from '../pages/TequenosPage';
import { PizzasPage } from '../pages/PizzasPage';
import { PromocionesPage } from '../pages/PromocionesPage';
import { PastelitosPage } from '../pages/PastelitosPage';
import { BebidasPage } from '../pages/BebidasPage';
import { CremasPage } from '../pages/CremasPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { useCartStore } from '../store/cartStore';

// Mobile App Real Frontend Pages & Layout
import { MobileLayout } from '../mobile/layouts/MobileLayout';
import { HomePage as MobileHomePage } from '../mobile/pages/HomePage';
import { MenuPage as MobileMenuPage } from '../mobile/pages/MenuPage';
import { SearchPage as MobileSearchPage } from '../mobile/pages/SearchPage';
import { ProductPage as MobileProductPage } from '../mobile/pages/ProductPage';
import { ComboPage as MobileComboPage } from '../mobile/pages/ComboPage';
import { PromotionsPage as MobilePromotionsPage } from '../mobile/pages/PromotionsPage';
import { FavoritesPage as MobileFavoritesPage } from '../mobile/pages/FavoritesPage';
import { CartPage as MobileCartPage } from '../mobile/pages/CartPage';
import { OrderRequestPage as MobileOrderRequestPage } from '../mobile/pages/OrderRequestPage';
import { OfflinePage as MobileOfflinePage } from '../mobile/pages/OfflinePage';
import { LoginPage as MobileLoginPage } from '../mobile/pages/LoginPage';
import { RegisterPage as MobileRegisterPage } from '../mobile/pages/RegisterPage';
import { ForgotPasswordPage as MobileForgotPasswordPage } from '../mobile/pages/ForgotPasswordPage';
import { ProfilePage as MobileProfilePage } from '../mobile/pages/ProfilePage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/** /carrito en escritorio abre el drawer del carrito y vuelve al inicio. */
function CartRedirect() {
  const openCart = useCartStore((s) => s.openCart);
  useEffect(() => {
    openCart();
  }, [openCart]);
  return <Navigate to="/" replace />;
}

const withDesktopLayout = (page: React.ReactNode) => (
  <PageContainer>{page}</PageContainer>
);

const withMobileLayout = (
  page: React.ReactNode,
  title?: string,
  showBack?: boolean,
  hideBottomNav?: boolean
) => (
  <MobileLayout title={title} showBack={showBack} hideBottomNav={hideBottomNav}>
    {page}
  </MobileLayout>
);

export const AppRouter: React.FC = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ============================================================== */}
        {/* RUTAS DE LA APP MÓVIL (/app/*)                                 */}
        {/* ============================================================== */}
        <Route path="/app" element={withMobileLayout(<MobileHomePage />, undefined, false)} />
        <Route path="/app/menu" element={withMobileLayout(<MobileMenuPage />, 'Menú de la Casa', true)} />
        <Route path="/app/search" element={withMobileLayout(<MobileSearchPage />, 'Buscar en la Carta', true)} />
        <Route path="/app/product/:slug" element={withMobileLayout(<MobileProductPage />, 'Detalle del Producto', true, true)} />
        <Route path="/app/combo/:slug" element={withMobileLayout(<MobileComboPage />, 'Configurar Combo', true, true)} />
        <Route path="/app/promociones" element={withMobileLayout(<MobilePromotionsPage />, 'Promos & Combos', true)} />
        <Route path="/app/favoritos" element={withMobileLayout(<MobileFavoritesPage />, 'Mis Favoritos', true)} />
        <Route path="/app/carrito" element={withMobileLayout(<MobileCartPage />, 'Mi Carrito de Pedido', true)} />
        <Route path="/app/pedido" element={withMobileLayout(<MobileOrderRequestPage />, 'Completar Pedido', true, true)} />
        <Route path="/app/login" element={withMobileLayout(<MobileLoginPage />, 'Iniciar Sesión', true, true)} />
        <Route path="/app/register" element={withMobileLayout(<MobileRegisterPage />, 'Crear Cuenta', true, true)} />
        <Route path="/app/forgot-password" element={withMobileLayout(<MobileForgotPasswordPage />, 'Recuperar Contraseña', true, true)} />
        <Route path="/app/profile" element={withMobileLayout(<MobileProfilePage />, 'Mi Perfil', true)} />
        <Route path="/app/offline" element={withMobileLayout(<MobileOfflinePage />, 'Sin Conexión', true)} />

        {/* ============================================================== */}
        {/* RUTAS DE ESCRITORIO / LANDING EXISTENTES                        */}
        {/* ============================================================== */}
        <Route path="/" element={withDesktopLayout(<HomePage />)} />
        <Route path="/tequenos" element={withDesktopLayout(<TequenosPage />)} />
        <Route path="/pizzas" element={withDesktopLayout(<PizzasPage />)} />
        <Route path="/promociones" element={withDesktopLayout(<PromocionesPage />)} />
        <Route path="/pastelitos" element={withDesktopLayout(<PastelitosPage />)} />
        <Route path="/bebidas" element={withDesktopLayout(<BebidasPage />)} />
        <Route path="/cremas" element={withDesktopLayout(<CremasPage />)} />
        <Route path="/producto/:slug" element={withDesktopLayout(<ProductDetailPage />)} />
        <Route path="/carrito" element={<CartRedirect />} />
        <Route path="*" element={withDesktopLayout(<NotFoundPage />)} />
      </Routes>
    </>
  );
};
