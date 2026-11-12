import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { EMAIL_MAX, MESSAGES, PASSWORD_MAX, isValidEmail, sanitizeEmailInput } from '../../lib/validation';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmail, continueAsGuest, isLoading, error, clearError } = useAuthStore();
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

    if (!isValidEmail(email)) {
      setFormError(MESSAGES.email);
      return;
    }

    const success = await loginWithEmail(email.trim(), password);
    if (success) {
      showToast({ message: '¡Bienvenido a Retequeños!' });
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
                autoComplete="email"
                maxLength={EMAIL_MAX}
                value={email}
                onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}
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
                autoComplete="current-password"
                maxLength={PASSWORD_MAX}
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
