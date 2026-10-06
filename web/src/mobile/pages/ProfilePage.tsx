import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Phone,
  MapPin,
  Save,
  LogOut,
  Smartphone,
  Apple,
  MessageCircle,
  Heart,
  ShoppingBag,
  ShieldCheck,
  SmartphoneCharging,
  Monitor,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useCartStore } from '../../store/cartStore';

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout, updateProfile, isLoading } = useAuthStore();
  const { platform, setPlatform, devicePreview, setDevicePreview, showToast } = useUiStore();
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const cartCount = useCartStore((s) => s.getTotalCount());

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.defaultAddress || '');
  const [reference, setReference] = useState(user?.defaultReference || '');
  const [isEditing, setIsEditing] = useState(false);

  const isIos = platform === 'ios';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    const ok = await updateProfile({
      displayName: displayName.trim(),
      phone: phone.trim(),
      defaultAddress: address.trim(),
      defaultReference: reference.trim(),
    });
    if (ok) {
      setIsEditing(false);
      showToast({ message: 'Perfil actualizado con éxito' });
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast({ message: 'Has cerrado sesión' });
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-5 pb-24">
      {/* Tarjeta de Usuario */}
      {isAuthenticated && user ? (
        <div className="bg-white border border-[#EFE6D6] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FFF2DF] text-[#FF3038] flex items-center justify-center font-black text-xl border border-[#F5EDE1] shadow-inner shrink-0 overflow-hidden">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(user.displayName || user.email)[0].toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-[#242424] font-display truncate">
                {user.displayName || 'Cliente Retequeños'}
              </h2>
              <p className="text-xs text-[#8C867F] truncate">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Cuenta Verificada ({user.provider === 'google' ? 'Google' : 'Email'})</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-[#FF3038] hover:bg-[#FFF2DF] px-3 py-1.5 rounded-xl border border-[#FF3038]/30 transition cursor-pointer"
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {/* Formulario editable de datos */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-3 pt-3 border-t border-[#F5EDE1]">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B6662] block">Nombre Completo</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B6662] block">Teléfono de Delivery</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="w-full h-10 px-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B6662] block">Dirección Predeterminada</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, número, urbanización en Tacna"
                  className="w-full h-10 px-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6B6662] block">Referencia de entrega</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Frente a la plaza, portón blanco..."
                  className="w-full h-10 px-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </form>
          ) : (
            <div className="space-y-2 pt-2 border-t border-[#F5EDE1] text-xs">
              <div className="flex items-center gap-2.5 text-[#6B6662]">
                <Phone className="w-4 h-4 text-[#8C867F]" />
                <span>{user.phone || 'Teléfono no especificado'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#6B6662]">
                <MapPin className="w-4 h-4 text-[#8C867F]" />
                <span className="truncate">{user.defaultAddress || 'Sin dirección predeterminada'}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tarjeta para invitados o usuarios no identificados */
        <div className="bg-white border border-[#EFE6D6] rounded-3xl p-6 shadow-sm space-y-4 text-center">
          <div className="w-14 h-14 bg-[#FFF2DF] text-[#FF3038] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <User className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-[#242424] font-display">
              Estás navegando como invitado
            </h2>
            <p className="text-xs text-[#8C867F] max-w-sm mx-auto">
              Puedes realizar pedidos directamente a WhatsApp sin registrarte, o iniciar sesión para guardar tus direcciones favoritas.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-1">
            <Link
              to="/app/login"
              className="h-10 px-5 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs rounded-xl flex items-center justify-center shadow-md transition"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/app/register"
              className="h-10 px-5 bg-white border border-[#EFE6D6] hover:bg-[#FFF2DF] text-[#242424] font-bold text-xs rounded-xl flex items-center justify-center transition"
            >
              Crear Cuenta
            </Link>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/app/favoritos"
          className="bg-white border border-[#EFE6D6] p-4 rounded-2xl flex items-center gap-3 hover:border-[#FF3038]/40 transition shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#FF3038] flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 fill-[#FF3038]" />
          </div>
          <div>
            <span className="block text-xs font-bold text-[#242424]">Favoritos</span>
            <span className="text-[11px] text-[#8C867F] font-medium">{favoriteCount} guardados</span>
          </div>
        </Link>

        <Link
          to="/app/carrito"
          className="bg-white border border-[#EFE6D6] p-4 rounded-2xl flex items-center gap-3 hover:border-[#FF3038]/40 transition shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F5A623] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-bold text-[#242424]">Carrito</span>
            <span className="text-[11px] text-[#8C867F] font-medium">{cartCount} en lista</span>
          </div>
        </Link>
      </div>

      {/* Ajustes de Plataforma y Diseño (Secciones 3, 4, 10 del Plan) */}
      <div className="bg-white border border-[#EFE6D6] rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#8C867F]">
          Preferencias de Visualización
        </h3>

        {/* Switch Android vs iOS */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="block text-xs font-bold text-[#242424]">Estilo de Plataforma</span>
            <span className="text-[11px] text-[#8C867F]">
              Adapta tipografía, bordes redondeados y gestos nativos
            </span>
          </div>

          <div className="flex bg-[#FFF8EE] border border-[#EFE6D6] p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setPlatform('default')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                !isIos ? 'bg-[#FF3038] text-white shadow-sm' : 'text-[#8C867F] hover:text-[#242424]'
              }`}
            >
              <SmartphoneCharging className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform('ios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                isIos ? 'bg-[#242424] text-white shadow-sm' : 'text-[#8C867F] hover:text-[#242424]'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iOS</span>
            </button>
          </div>
        </div>

        {/* Switch Modo Simulador vs Web Responsive */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#F5EDE1]">
          <div>
            <span className="block text-xs font-bold text-[#242424]">Marco de Teléfono (Simulador)</span>
            <span className="text-[11px] text-[#8C867F]">
              Activa el chasis de celular para demostraciones
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDevicePreview(!devicePreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              devicePreview
                ? 'bg-[#FF3038] border-[#FF3038] text-white'
                : 'bg-white border-[#EFE6D6] text-[#6B6662] hover:bg-[#FFF2DF]'
            }`}
          >
            {devicePreview ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span>{devicePreview ? 'Activo' : 'Desactivado'}</span>
          </button>
        </div>
      </div>

      {/* Soporte WhatsApp & Tienda */}
      <div className="bg-[#FFFDF9] border border-[#EFE6D6] rounded-3xl p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 fill-emerald-600" />
          </div>
          <div>
            <span className="block text-xs font-bold text-[#242424]">Atención al Cliente</span>
            <span className="text-[11px] text-[#8C867F]">Av. Bolognesi · Tacna, Perú</span>
          </div>
        </div>
        <a
          href="https://wa.me/51952000000?text=Hola%20Reteque%C3%B1os%2C%20tengo%20una%20consulta"
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition"
        >
          <span>Escribir</span>
        </a>
      </div>

      {/* Botón de Cerrar Sesión */}
      {isAuthenticated && (
        <button
          type="button"
          onClick={handleLogout}
          className="w-full h-12 bg-white border border-red-200 text-[#FF3038] hover:bg-red-50 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      )}
    </div>
  );
};
