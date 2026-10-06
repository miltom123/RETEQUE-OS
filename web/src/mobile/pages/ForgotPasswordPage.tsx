import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    try {
      await resetPassword(email.trim());
      setIsSent(true);
    } catch {
      setError('No pudimos enviar el enlace. Intenta nuevamente.');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-center my-auto">
      <div className="bg-white border border-[#EFE6D6] rounded-3xl p-6 shadow-sm space-y-5">
        {isSent ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-[#242424] font-display">
                Enlace enviado
              </h2>
              <p className="text-xs text-[#6B6662] leading-relaxed">
                Hemos enviado las instrucciones para restablecer tu contraseña a{' '}
                <strong className="text-[#242424]">{email}</strong>. Revisa tu bandeja de entrada o spam.
              </p>
            </div>
            <Link
              to="/app/login"
              className="inline-flex items-center gap-1.5 w-full justify-center h-11 bg-[#FF3038] text-white font-bold text-xs rounded-xl shadow-md"
            >
              <span>Volver a Iniciar Sesión</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 bg-[#FFF2DF] rounded-2xl flex items-center justify-center mx-auto text-[#FF3038] mb-2 shadow-inner">
                <KeyRound className="w-7 h-7 stroke-[2.3]" />
              </div>
              <h2 className="text-xl font-black text-[#242424] font-display">
                Recupera tu Contraseña
              </h2>
              <p className="text-xs text-[#8C867F]">
                Ingresa tu correo y te enviaremos un enlace seguro para restablecerla
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-[#FF3038] text-xs p-3 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#242424] block" htmlFor="forgot-email">
                  Correo electrónico registrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C867F] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full h-11 pl-9 pr-3 text-xs bg-[#FFFDF9] border border-[#EFE6D6] rounded-xl focus:outline-none focus:border-[#FF3038]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-[#FF3038]/20 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center pt-2 border-t border-[#F5EDE1]">
              <Link
                to="/app/login"
                className="inline-flex items-center gap-1.5 text-xs text-[#6B6662] hover:text-[#242424] font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al inicio de sesión</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
