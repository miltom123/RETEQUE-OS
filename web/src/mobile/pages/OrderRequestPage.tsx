import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, CheckCircle2, ShieldCheck, Utensils, User, UserCheck } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useCheckoutStore } from '../../store/checkoutStore';
import { useAuthStore } from '../../store/authStore';
import { customerAccountsEnabled } from '../../config/features';
import { formatMoney, roundMoney } from '../../lib/money';
import { isValidName, isValidPeruMobile } from '../../lib/validation';
import { buildFallbackOrderUrl, discardWhatsAppWindow, openWhatsAppOrder, prepareWhatsAppWindow } from '../../lib/whatsapp';
import { resetOrderAttempt, StoreUnavailableError, submitOrder, type OrderDetails } from '../../lib/orderApi';
import { useServerCoupon } from '../../hooks/useServerCoupon';
import { FulfillmentType } from '../../types/orderRequest';
import { CustomerForm } from '../components/CustomerForm';
import { FulfillmentSelector } from '../components/FulfillmentSelector';
import { OrderSummary } from '../components/OrderSummary';

export const OrderRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const {
    fullName,
    phone,
    deliveryType,
    address,
    reference,
    generalNotes,
    setField,
  } = useCheckoutStore();

  // Con las cuentas desactivadas se ignora cualquier sesión de prueba que haya quedado en el navegador
  const signedIn = customerAccountsEnabled && isAuthenticated;

  // Pre-llenar datos si el cliente tiene sesión iniciada y campos vacíos
  useEffect(() => {
    if (signedIn && user) {
      if (!fullName && user.displayName) setField('fullName', user.displayName);
      if (!phone && user.phone) setField('phone', user.phone);
      if (!address && user.defaultAddress) setField('address', user.defaultAddress);
      if (!reference && user.defaultReference) setField('reference', user.defaultReference);
    }
  }, [signedIn, user, fullName, phone, address, reference, setField]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // La tienda no respondió al último intento: se ofrece enviar el pedido completo por WhatsApp
  const [storeDown, setStoreDown] = useState(false);
  const [order, setOrder] = useState<{ code: string; total: number; whatsappUrl: string | null } | null>(null);
  const isSent = order !== null;

  const mode = deliveryType === 'delivery' ? 'delivery' : 'pickup';
  // El cupón aplicado en el carrito se vuelve a validar con la modalidad elegida aquí
  const coupon = useServerCoupon(items, mode, !isSent);

  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );
  const discount = coupon.applied ? coupon.applied.discount : 0;
  const totalProducts = roundMoney(Math.max(0, subtotal - discount));

  if (items.length === 0 && !isSent) {
    return (
      <div className="p-8 text-center space-y-4 my-8">
        <h2 className="text-base font-bold text-[#242424]">
          No tienes productos en tu pedido
        </h2>
        <p className="text-xs text-[#6B6662]">
          Agrega tus tequeños o combos favoritos antes de completar tus datos.
        </p>
        <Link
          to="/app/menu"
          className="inline-flex items-center gap-1.5 bg-[#FF3038] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
        >
          <Utensils className="w-4 h-4" />
          <span>Ir al Menú</span>
        </Link>
      </div>
    );
  }

  const orderDetails = (): OrderDetails => ({
    customer: { name: fullName.trim(), phone: phone.replace(/\s+/g, '') },
    mode,
    address: mode === 'delivery' ? address.trim() : undefined,
    reference: mode === 'delivery' ? reference.trim() || undefined : undefined,
    notes: generalNotes.trim() || undefined,
    couponCode: coupon.applied?.code,
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs.name = 'Por favor ingresa tu nombre completo';
    } else if (!isValidName(fullName.trim())) {
      errs.name = 'Ingresa un nombre válido (mínimo 3 letras)';
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone) {
      errs.phone = 'Por favor ingresa tu número de celular';
    } else if (!isValidPeruMobile(cleanPhone)) {
      errs.phone = 'Ingresa un celular de 9 dígitos que empiece con 9';
    }

    if (deliveryType === 'delivery') {
      if (!address.trim()) {
        errs.address = 'Ingresa la dirección para coordinar el delivery';
      } else if (address.trim().length < 5) {
        errs.address = 'Ingresa una dirección más detallada (calle, número o urbanización)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Registra el pedido "por confirmar" con precios del servidor y abre WhatsApp solo con su código
  const handleSendOrder = async () => {
    if (sending) return;
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const whatsappWindow = prepareWhatsAppWindow();
    setSending(true);
    setSubmitError(null);
    setStoreDown(false);
    try {
      const result = await submitOrder(items, orderDetails());
      setOrder({ code: result.code, total: result.total, whatsappUrl: result.whatsappUrl });
      if (result.whatsappUrl) openWhatsAppOrder(whatsappWindow, result.whatsappUrl);
      else discardWhatsAppWindow(whatsappWindow);
      window.scrollTo({ top: 0 });
    } catch (error) {
      discardWhatsAppWindow(whatsappWindow);
      setSubmitError(error instanceof Error ? error.message : 'No pudimos registrar tu pedido. Inténtalo de nuevo.');
      // Si la tienda no responde, el cliente igual puede pedir: el detalle va completo por WhatsApp
      if (error instanceof StoreUnavailableError) setStoreDown(true);
    } finally {
      setSending(false);
    }
  };

  const handleFinish = () => {
    clearCart();
    coupon.remove();
    resetOrderAttempt();
    navigate('/app');
  };

  // Pedido registrado: el cliente envía el código por WhatsApp y caja lo confirma en el panel
  if (order) {
    return (
      <div className="p-5 space-y-5 my-4">
        <div className="bg-white border border-[#EFE6D6] rounded-3xl p-6 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-[#242424] font-display">
              Registramos tu pedido
            </h2>
            <p className="text-2xl font-black text-[#FF3038] font-display tracking-wide">{order.code}</p>
            <p className="text-xs text-[#6B6662] max-w-[300px] mx-auto leading-relaxed">
              Envía el mensaje de WhatsApp con este código para que el equipo de Retequeños lo confirme y coordine contigo la entrega y el pago.
            </p>
          </div>

          <div className="bg-[#FFF8EE] border border-[#EFE6D6] p-3.5 rounded-2xl text-left text-xs space-y-2">
            <div className="flex justify-between font-bold text-[#242424]">
              <span>Cliente:</span>
              <span>{fullName}</span>
            </div>
            <div className="flex justify-between text-[#6B6662]">
              <span>Modalidad:</span>
              <span className="capitalize">{deliveryType === 'delivery' ? 'Delivery por WhatsApp' : 'Recojo en tienda'}</span>
            </div>
            <div className="flex justify-between font-bold text-[#FF3038] pt-1.5 border-t border-[#F5EDE1]">
              <span>Total productos:</span>
              <span className="text-sm font-display">{formatMoney(order.total)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {order.whatsappUrl && (
              <a
                href={order.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 bg-[#16B959] hover:bg-[#13A24D] text-white font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>ABRIR WHATSAPP</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleFinish}
              className="w-full h-11 border border-[#EFE6D6] bg-white text-[#242424] font-bold text-xs rounded-xl hover:bg-[#FFF2DF] transition cursor-pointer"
            >
              Ya lo envié, vaciar carrito y volver al inicio
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#8C867F] justify-center text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>El pedido se prepara en cocina tras tu confirmación en WhatsApp.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#242424] font-display">
              Datos de tu Pedido
            </h2>
            <p className="text-xs text-[#8C867F]">
              Completa tus datos para registrar tu pedido y enviarlo por WhatsApp
            </p>
          </div>

          {customerAccountsEnabled && (signedIn ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg shrink-0">
              <User className="w-3 h-3 text-emerald-600" />
              <span>Cliente Identificado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF8EE] border border-[#EFE6D6] text-[#8C867F] text-[10px] font-semibold rounded-lg shrink-0">
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>Modo Invitado</span>
            </div>
          ))}
        </div>

        {/* Formulario de Contacto */}
        <CustomerForm
          name={fullName}
          phone={phone}
          notes={generalNotes}
          onChangeName={(val) => setField('fullName', val)}
          onChangePhone={(val) => setField('phone', val)}
          onChangeNotes={(val) => setField('generalNotes', val)}
          errors={{ name: errors.name, phone: errors.phone }}
        />

        {/* Selector de Modalidad (Delivery vs Recojo) */}
        <FulfillmentSelector
          type={deliveryType as FulfillmentType}
          address={address}
          reference={reference}
          onChangeType={(val) => setField('deliveryType', val)}
          onChangeAddress={(val) => setField('address', val)}
          onChangeReference={(val) => setField('reference', val)}
          errors={{ address: errors.address }}
        />

        {/* Resumen del Pedido */}
        <OrderSummary
          subtotal={subtotal}
          discount={discount}
          totalProducts={totalProducts}
          fulfillmentType={mode}
          couponCode={coupon.applied?.code}
          itemCount={items.reduce((s, it) => s + it.quantity, 0)}
        />

        {coupon.message?.error && (
          <p className="text-[11px] font-bold text-[#FF3038] px-1">{coupon.message.text}</p>
        )}
      </div>

      {/* Sticky Bottom Final CTA Button (Dentro del contenedor scroll) */}
      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EFE6D6] p-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] mt-4">
        <div className="max-w-md mx-auto">
          {submitError && (
            <p role="alert" className="text-xs font-bold text-[#FF3038] text-center mb-2">
              {submitError}
            </p>
          )}
          {storeDown && (
            <a
              href={buildFallbackOrderUrl(items, orderDetails())}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-10 mb-2 rounded-xl border border-[#16B959] text-[#13A24D] text-xs font-black flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar el pedido completo por WhatsApp</span>
            </a>
          )}
          <button
            type="button"
            onClick={handleSendOrder}
            disabled={sending}
            className="w-full h-12 bg-[#16B959] hover:bg-[#13A24D] disabled:opacity-60 disabled:cursor-wait text-white font-black text-sm rounded-xl shadow-lg shadow-[#16B959]/25 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-white" />
            <span>{sending ? 'REGISTRANDO TU PEDIDO…' : 'ENVIAR PEDIDO POR WHATSAPP'}</span>
          </button>
          <p className="text-[10px] text-[#8C867F] text-center mt-1.5 font-medium">
            Retequeños coordinará contigo el costo final de delivery y la confirmación.
          </p>
        </div>
      </div>
    </div>
  );
};

