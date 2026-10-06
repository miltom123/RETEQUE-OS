import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileMenu } from './MobileMenu';
import { Toast } from './Toast';
import { WhatsAppFab } from './WhatsAppFab';
import { CartDrawer } from '../cart/CartDrawer';
import { MobileCartBar } from '../cart/MobileCartBar';
import { ProductConfiguratorModal } from '../configurator/ProductConfiguratorModal';
import { useUiStore } from '../../store/uiStore';
import { useCartStore } from '../../store/cartStore';

interface PageContainerProps {
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  const productToConfigure = useUiStore((s) => s.productToConfigure);
  const closeConfigurator = useUiStore((s) => s.closeConfigurator);
  const openCart = useCartStore((s) => s.openCart);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[10000] focus:bg-white focus:text-neutral-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Ir al contenido
      </a>

      <Navbar />

      <main id="contenido" className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-28 md:pb-6">
        {children}
      </main>

      <Footer />

      {/* Capas globales: menú móvil, pedido, configurador de promos, barra y avisos */}
      <MobileMenu />
      <CartDrawer />
      {productToConfigure && (
        <ProductConfiguratorModal
          isOpen
          onClose={closeConfigurator}
          productOrPromo={productToConfigure}
          onOpenCartDrawer={() => {
            closeConfigurator();
            openCart();
          }}
        />
      )}
      <MobileCartBar />
      <WhatsAppFab />
      <Toast />
    </div>
  );
};
