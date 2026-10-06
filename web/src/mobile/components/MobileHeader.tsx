import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, Search, Heart, ShoppingBag, User } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ title, showBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const totalCount = useCartStore((s) => s.getTotalCount());
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const platform = useUiStore((s) => s.platform);
  const { user, isAuthenticated } = useAuthStore();

  const isIos = platform === 'ios';

  // En la raíz /app no mostramos botón de retroceso (muestra el logotipo).
  const isHome = location.pathname === '/app';
  const shouldShowBack = showBack !== undefined ? showBack : !isHome;

  // Lógica de retroceso segura y contextual (nunca se queda bloqueada)
  const handleBack = () => {
    if (location.pathname.startsWith('/app/product') || location.pathname.startsWith('/app/combo')) {
      if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate('/app/menu');
      }
      return;
    }

    if (location.pathname === '/app/pedido') {
      navigate('/app/carrito');
      return;
    }

    if (location.pathname === '/app/carrito' || location.pathname === '/app/search') {
      if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate('/app/menu');
      }
      return;
    }

    if (
      location.pathname === '/app/promociones' ||
      location.pathname === '/app/favoritos' ||
      location.pathname === '/app/profile' ||
      location.pathname === '/app/login' ||
      location.pathname === '/app/register'
    ) {
      navigate('/app');
      return;
    }

    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/app');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F4]/95 backdrop-blur-md border-b border-[#EFE6D6] px-3.5 sm:px-4 py-2.5 flex items-center justify-between transition-colors shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {shouldShowBack ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Volver atrás"
            className={`w-9 h-9 rounded-full bg-white border border-[#EFE6D6] flex items-center justify-center text-[#242424] hover:bg-[#FFF2DF] active:scale-90 transition cursor-pointer shrink-0 shadow-sm ${
              isIos ? 'rounded-2xl' : 'rounded-full'
            }`}
          >
            {isIos ? (
              <ChevronLeft className="w-5 h-5 stroke-[2.5] -ml-0.5" />
            ) : (
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        ) : (
          <Link to="/app" className="flex items-center gap-2 shrink-0">
            <img
              src="/assets/logo-retequenos.png"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
              alt="Retequeños"
              className="w-8 h-8 rounded-xl object-cover shadow-sm border border-[#EFE6D6]"
            />
          </Link>
        )}

        <div className="min-w-0">
          {title ? (
            <h1 className="font-bold text-[#242424] text-base truncate leading-tight font-display">
              {title}
            </h1>
          ) : (
            <Link to="/app" className="block">
              <span className="font-black text-[#FF3038] tracking-tight text-lg leading-none block font-display">
                Retequeños
              </span>
              <span className="text-[10px] font-bold text-[#8C867F] tracking-wide block uppercase">
                Tacna · Sabor que nos une
              </span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/app/search"
          aria-label="Buscar en la carta"
          className="w-8.5 h-8.5 rounded-full bg-white border border-[#EFE6D6] flex items-center justify-center text-[#6B6662] hover:text-[#FF3038] hover:bg-[#FFF2DF] active:scale-95 transition shadow-sm"
        >
          <Search className="w-4 h-4" />
        </Link>

        {location.pathname !== '/app/favoritos' && (
          <Link
            to="/app/favoritos"
            aria-label="Mis favoritos"
            className="w-8.5 h-8.5 rounded-full bg-white border border-[#EFE6D6] flex items-center justify-center text-[#6B6662] hover:text-[#FF3038] hover:bg-[#FFF2DF] active:scale-95 transition shadow-sm relative"
          >
            <Heart className={`w-4 h-4 ${favoriteCount > 0 ? 'text-[#FF3038] fill-[#FF3038]' : ''}`} />
            {favoriteCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF3038] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#FAF8F4]">
                {favoriteCount}
              </span>
            )}
          </Link>
        )}

        <Link
          to="/app/profile"
          aria-label="Mi Perfil"
          className="w-8.5 h-8.5 rounded-full bg-white border border-[#EFE6D6] flex items-center justify-center text-[#6B6662] hover:text-[#FF3038] hover:bg-[#FFF2DF] active:scale-95 transition shadow-sm overflow-hidden"
        >
          {isAuthenticated && user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
          ) : (
            <User className={`w-4 h-4 ${isAuthenticated ? 'text-emerald-600' : ''}`} />
          )}
        </Link>

        {location.pathname !== '/app/carrito' && (
          <Link
            to="/app/carrito"
            aria-label="Ver carrito"
            className="w-8.5 h-8.5 rounded-full bg-[#FF3038] text-white flex items-center justify-center active:scale-95 transition shadow-md shadow-[#FF3038]/25 relative"
          >
            <ShoppingBag className="w-4 h-4" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#F5A623] text-[#242424] text-[9.5px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center border-2 border-white">
                {totalCount}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
};


