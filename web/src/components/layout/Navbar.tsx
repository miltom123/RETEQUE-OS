import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useUiStore } from '../../store/uiStore';
import { siteConfig } from '../../config/site';
import { formatMoney } from '../../lib/money';
import { openWhatsApp } from '../../lib/whatsapp';
import { SearchBox } from './SearchBox';

export const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const totalCount = useCartStore((s) => s.getTotalCount());
  const subtotal = useCartStore((s) => s.getSubtotal());
  const openCart = useCartStore((s) => s.openCart);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const isSearchOpen = useUiStore((s) => s.isSearchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (totalCount === 0) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 400);
    return () => clearTimeout(t);
  }, [totalCount]);

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname, setSearchOpen]);

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md [backdrop-filter:saturate(1.4)_blur(12px)]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-4">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 -ml-1 rounded-lg hover:bg-surface-2 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Retequeños, ir al inicio">
          <img src="/assets/brand/logo-retequenos.png" alt="" className="h-[34px] w-[34px] object-cover rounded-lg" />
          <span className="font-extrabold text-base tracking-[-.02em] text-ink">{siteConfig.name}</span>
        </Link>

        <div className="flex-1 hidden md:flex justify-center min-w-0">
          <div className="w-full max-w-[420px]">
            <SearchBox />
          </div>
        </div>
        <div className="flex-1 md:hidden" />

        <button
          type="button"
          onClick={() => openWhatsApp('¡Hola Retequeños! Me gustaría hacer un pedido.')}
          className="hidden lg:flex items-center gap-2 text-[13.5px] font-semibold text-ink px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors whitespace-nowrap"
        >
          <span className="w-[7px] h-[7px] rounded-full bg-whatsapp shadow-[0_0_0_3px_rgba(22,185,89,.18)]" aria-hidden="true" />
          {siteConfig.whatsappDisplay}
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(!isSearchOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-surface-2 transition-colors"
          aria-label={isSearchOpen ? 'Cerrar búsqueda' : 'Buscar en la carta'}
          aria-expanded={isSearchOpen}
        >
          {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>

        <button
          type="button"
          onClick={openCart}
          className="flex items-center gap-2 bg-ink hover:bg-brand-red text-white text-[13.5px] font-bold px-3.5 py-[9px] rounded-[10px] transition-all active:scale-[.97] whitespace-nowrap"
          aria-label={`Abrir pedido, ${totalCount} ${totalCount === 1 ? 'producto' : 'productos'}`}
        >
          <span className="hidden sm:inline">{formatMoney(subtotal)}</span>
          <span
            className={`min-w-5 h-5 px-1.5 rounded-full text-[11.5px] font-extrabold inline-flex items-center justify-center ${
              totalCount ? 'bg-brand-red' : 'bg-white/20'
            } ${bump ? 'animate-rq-bump' : ''}`}
          >
            {totalCount}
          </span>
        </button>
      </div>

      {isSearchOpen && (
        <div className="md:hidden px-4 pb-3">
          <SearchBox autoFocus />
        </div>
      )}
    </header>
  );
};
