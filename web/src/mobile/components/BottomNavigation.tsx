import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Utensils, Sparkles, Heart, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';

export const BottomNavigation: React.FC = () => {
  const totalCount = useCartStore((s) => s.getTotalCount());

  const navItems = [
    { to: '/app', label: 'Inicio', icon: Home, end: true },
    { to: '/app/menu', label: 'Menú', icon: Utensils, end: false },
    { to: '/app/promociones', label: 'Promos', icon: Sparkles, end: false },
    { to: '/app/favoritos', label: 'Favoritos', icon: Heart, end: false },
    { to: '/app/carrito', label: 'Carrito', icon: ShoppingBag, end: false, badge: totalCount },
  ];

  return (
    <nav className="w-full shrink-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EFE6D6] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      <div className="max-w-md mx-auto grid grid-cols-5 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 transition-colors select-none relative group ${
                  isActive ? 'text-[#FF3038]' : 'text-[#8C867F] hover:text-[#242424]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 transition-transform group-active:scale-90 ${
                        isActive ? 'stroke-[2.4px]' : 'stroke-[1.8px]'
                      }`}
                    />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-[#FF3038] text-white text-[9px] font-black min-w-3.5 h-3.5 px-0.5 rounded-full flex items-center justify-center border border-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 tracking-tight ${
                      isActive ? 'font-black text-[#FF3038]' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-[#FF3038] mt-0.5" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
