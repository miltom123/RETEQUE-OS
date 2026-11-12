import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, UserPlus, ArrowRight, AlertCircle, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import {
  EMAIL_MAX,
  MESSAGES,
  NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PHONE_LENGTH,
  isValidEmail,
  isValidName,
  isValidPeruMobile,
  sanitizeEmailInput,
  sanitizeNameInput,
  sanitizePhoneInput,
} from '../../lib/validation';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerWithEmail, continueAsGuest, isLoading, error, clearError } = useAuthStore();
  const showToast = useUiStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setFormError('Por favor completa todos los campos.');
      return;
    }

    if (!isValidName(name)) {
      setFormError(MESSAGES.name);
      return;
    }

    if (!isValidPeruMobile(phone)) {
      setFormError(MESSAGES.phone);
      return;
    }

    if (!isValidEmail(email)) {
      setFormError(MESSAGES.email);
      return;
    }

    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      setFormError(MESSAGES.password);
      return;
    }

    const success = await registerWithEmail(email.trim(), password, name.trim(), sanitizePhoneInput(phone));
    if (success) {
      showToast({ message: '¡Cuenta creada con éxito!' });
      navigate('/app', { replace: true });
    }
  };


  return (
    <div className="p-4 sm:p-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-center my-auto">
      <div className="bg-white border border-[#EFE6D6] rounded-3xl p-6 shadow-sm space-y-5">
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 bg-[#FFF2DF] rounded-2xl flex items-center justify-center mx-auto text-[#FF3038] mb-2 shadow-inner">
            <UserPlus className="w-7 h-7 stroke-[2.3]" />
          </div>
          <h2 className="text-xl font-black text-[#242424] font-display">
            Crea tu Cuenta
          </h2>
          <p className="text-xs text-[#8C867F]">
            Guarda tus datos para pedir más rápido tus tequeños favoritos
          </p>
        </div>

        {(formError || error) && (
          <div className="bg-red-50 border border-red-200 text-[#FF3038] text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#242424] block" htmlFor="reg-name">
              Nombre completo
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8C867F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                maxLength={NAME_MAX}
                value={name}
                onChange={(e) => setName(sanitizeNameInput(e.target.value))}
                placeholder="Ej. Milton Flores"
                className="w-full h-10 pl-9 pr-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#242424] block" htmlFor="reg-phone">
              Teléfono celular
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#8C867F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reg-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={PHONE_LENGTH}
                value={phone}
                onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                placeholder="952000000"
                className="w-full h-10 pl-9 pr-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#242424] block" htmlFor="reg-email">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8C867F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                maxLength={EMAIL_MAX}
                value={email}
                onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}
                placeholder="ejemplo@correo.com"
                className="w-full h-10 pl-9 pr-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#242424] block" htmlFor="reg-pass">
              Contraseña (mínimo 6 caracteres)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C867F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reg-pass"
                type="password"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-[#FF3038]/20 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-1"
          >
            <span>{isLoading ? 'Creando cuenta...' : 'Crear mi Cuenta'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-[#F5EDE1] space-y-2">
          <button
            type="button"
            onClick={() => {
              continueAsGuest();
              navigate('/app');
            }}
            className="w-full h-10 border border-[#EFE6D6] hover:bg-[#FFF2DF] text-[#6B6662] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Continuar como invitado</span>
          </button>

          <p className="text-center text-xs text-[#8C867F] pt-1">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/app/login" className="font-bold text-[#FF3038] hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
