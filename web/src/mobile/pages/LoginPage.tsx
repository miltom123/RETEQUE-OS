import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmail, loginWithGoogle, continueAsGuest, isLoading, error, clearError } = useAuthStore();
  const showToast = useUiStore((s) => s.showToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Redireccionar al destino anterior o al menú
  const from = (location.state as { from?: string })?.from || '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setFormError('Por favor completa todos los campos.');
      return;
    }

    const success = await loginWithEmail(email, password);
    if (success) {
      showToast({ message: '¡Bienvenido a Retequeños!' });
      navigate(from, { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    clearError();
    const success = await loginWithGoogle();
    if (success) {
      showToast({ message: '¡Sesión iniciada con Google!' });
      navigate(from, { replace: true });
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    showToast({ message: 'Continuando como invitado' });
    navigate(from, { replace: true });
  };

  return (
    <div className="p-4 sm:p-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-center my-auto">
      {/* Brand card */}
      <div className="bg-white border border-[#EFE6D6] rounded-3xl p-6 shadow-sm space-y-5">
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 bg-[#FFF2DF] rounded-2xl flex items-center justify-center mx-auto text-[#FF3038] mb-2 shadow-inner">
            <LogIn className="w-7 h-7 stroke-[2.3]" />
          </div>
          <h2 className="text-xl font-black text-[#242424] font-display">
            ¡Qué bueno verte!
          </h2>
          <p className="text-xs text-[#8C867F]">
            Inicia sesión para guardar tus favoritos y agilizar tus pedidos
          </p>
        </div>

        {/* Botón de Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-11 bg-white border border-[#D9CDBB] hover:bg-[#FFFDF9] text-[#242424] font-bold text-xs rounded-xl flex items-center justify-center gap-3 transition active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-[1px] bg-[#EFE6D6]" />
          <span className="text-[11px] font-bold text-[#8C867F] uppercase tracking-wider">o con correo</span>
          <div className="flex-1 h-[1px] bg-[#EFE6D6]" />
        </div>

        {/* Mensaje de error si ocurre */}
        {(formError || error) && (
          <div className="bg-red-50 border border-red-200 text-[#FF3038] text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#242424] block" htmlFor="login-email">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8C867F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full h-11 pl-9 pr-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#242424] block" htmlFor="login-pass">
                Contraseña
              </label>
              <Link
                to="/app/forgot-password"
                className="text-[11px] text-[#FF3038] hover:underline font-medium"
              >
                ¿La olvidaste?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C867F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-9 pr-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-[#FF3038]/20 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <span>{isLoading ? 'Iniciando...' : 'Iniciar Sesión'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Separador a modo invitado */}
        <div className="pt-2 border-t border-[#F5EDE1] space-y-2">
          <button
            type="button"
            onClick={handleGuest}
            className="w-full h-10 border border-[#EFE6D6] hover:bg-[#FFF2DF] text-[#6B6662] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Continuar como invitado (sin cuenta)</span>
          </button>

          <p className="text-center text-xs text-[#8C867F] pt-1">
            ¿Nuevo en Retequeños?{' '}
            <Link to="/app/register" className="font-bold text-[#FF3038] hover:underline">
              Crea tu cuenta aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
