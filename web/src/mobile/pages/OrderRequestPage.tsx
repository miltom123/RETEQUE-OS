import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, CheckCircle2, ShieldCheck, Utensils, User, UserCheck, MapPinned } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useCheckoutStore } from '../../store/checkoutStore';
import { useAuthStore } from '../../store/authStore';
import { useOrderHistoryStore } from '../../store/orderHistoryStore';
import { customerAccountsEnabled } from '../../config/features';
import { formatMoney, roundMoney } from '../../lib/money';
import { MESSAGES, isValidAddress, isValidName, isValidPeruMobile, sanitizePhoneInput } from '../../lib/validation';
import { buildFallbackOrderUrl, discardWhatsAppWindow, openWhatsAppOrder, prepareWhatsAppWindow } from '../../lib/whatsapp';
import {
  compressImage,
  isDigitalPay,
  resetOrderAttempt,
  StoreUnavailableError,
  submitOrder,
  uploadReceipt,
  type OrderDetails,
  type PayMethod,
} from '../../lib/orderApi';
import { useServerCoupon } from '../../hooks/useServerCoupon';
import { FulfillmentType } from '../../types/orderRequest';
import { CustomerForm } from '../components/CustomerForm';
import { FulfillmentSelector } from '../components/FulfillmentSelector';
import { OrderSummary } from '../components/OrderSummary';
import { PaymentSelector } from '../components/PaymentSelector';
import { ScheduleSelector, scheduleError } from '../components/ScheduleSelector';
import type { LatLng } from '../components/MapPicker';

interface RegisteredOrder {
  code: string;
  total: number;
  whatsappUrl: string | null;
  receiptMessage: string | null;
}

export const OrderRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const { user, isAuthenticated, updateProfile } = useAuthStore();
  const addToHistory = useOrderHistoryStore((s) => s.add);
  const { fullName, phone, deliveryType, address, reference, generalNotes, setField } = useCheckoutStore();

  const signedIn = customerAccountsEnabled && isAuthenticated;

  // Con sesión se completan los datos de la cuenta y su primera dirección guardada
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
  const [storeDown, setStoreDown] = useState(false);
  const [order, setOrder] = useState<RegisteredOrder | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod | ''>('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [location, setLocation] = useState<LatLng | undefined>(() => {
    const first = user?.addresses?.[0];
    return first && first.lat != null && first.lng != null && first.address === address ? { lat: first.lat, lng: first.lng } : undefined;
  });
  const [saveAddress, setSaveAddress] = useState(false);
  const isSent = order !== null;

  const mode = deliveryType === 'delivery' ? 'delivery' : 'pickup';
  const coupon = useServerCoupon(items, mode, !isSent);

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  const discount = coupon.applied ? coupon.applied.discount : 0;
  const totalProducts = roundMoney(Math.max(0, subtotal - discount));

  if (items.length === 0 && !isSent) {
    return (
      <div className="p-8 text-center space-y-4 my-8">
        <h2 className="text-base font-bold text-[#242424]">No tienes productos en tu pedido</h2>
        <p className="text-xs text-[#4B4540]">Agrega tus tequeños o combos favoritos antes de completar tus datos.</p>
        <Link to="/app/menu" className="inline-flex items-center gap-1.5 bg-[#FF3038] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md">
          <Utensils className="w-4 h-4" />
          <span>Ir al Menú</span>
        </Link>
      </div>
    );
  }

  const orderDetails = (): OrderDetails => ({
    customer: { name: fullName.trim(), phone: sanitizePhoneInput(phone) },
    mode,
    address: mode === 'delivery' ? address.trim() : undefined,
    reference: mode === 'delivery' ? reference.trim() || undefined : undefined,
    notes: generalNotes.trim() || undefined,
    couponCode: coupon.applied?.code,
    payMethod: payMethod || undefined,
    scheduledFor: scheduled && scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
    location: mode === 'delivery' ? location : undefined,
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.name = 'Por favor ingresa tu nombre completo';
    else if (!isValidName(fullName)) errs.name = MESSAGES.name;
    if (!phone.trim()) errs.phone = 'Por favor ingresa tu número de celular';
    else if (!isValidPeruMobile(phone)) errs.phone = MESSAGES.phone;
    if (deliveryType === 'delivery') {
      if (!address.trim()) errs.address = 'Ingresa la dirección para coordinar el delivery';
      else if (!isValidAddress(address)) errs.address = MESSAGES.address;
    }
    if (!payMethod) errs.payMethod = 'Elige cómo vas a pagar.';
    if (scheduled) {
      const err = scheduleError(scheduleAt);
      if (err) errs.schedule = err;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Registra el pedido "por confirmar", sube la constancia si la hay y abre WhatsApp con el código
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
      const details = orderDetails();
      const result = await submitOrder(items, details);
      addToHistory({
        code: result.code,
        accessToken: result.accessToken,
        createdAt: new Date().toISOString(),
        total: result.total,
        mode,
        payMethod: result.payMethod,
        scheduledFor: result.scheduledFor,
        items,
      });

      let receiptMessage: string | null = null;
      if (receipt && isDigitalPay(payMethod)) {
        try {
          receiptMessage = (await uploadReceipt(result.code, result.accessToken, await compressImage(receipt))).message;
        } catch (error) {
          receiptMessage = `Tu pedido quedó registrado, pero la constancia no se subió (${error instanceof Error ? error.message : 'error'}). Puedes subirla desde el seguimiento.`;
        }
      }

      if (signedIn && saveAddress && mode === 'delivery' && user) {
        // Si falla guardar la dirección, el pedido igual quedó registrado
        updateProfile({
          addresses: [...(user.addresses || []), { label: `Dirección ${(user.addresses?.length || 0) + 1}`, address: address.trim(), reference: reference.trim(), ...(location || {}) }].slice(0, 5),
        });
      }

      setOrder({ code: result.code, total: result.total, whatsappUrl: result.whatsappUrl, receiptMessage });
      if (result.whatsappUrl) openWhatsAppOrder(whatsappWindow, result.whatsappUrl);
      else discardWhatsAppWindow(whatsappWindow);
      window.scrollTo({ top: 0 });
    } catch (error) {
      discardWhatsAppWindow(whatsappWindow);
      setSubmitError(error instanceof Error ? error.message : 'No pudimos registrar tu pedido. Inténtalo de nuevo.');
      if (error instanceof StoreUnavailableError) setStoreDown(true);
    } finally {
      setSending(false);
    }
  };

  const handleFinish = () => {
    const code = order?.code;
    clearCart();
    coupon.remove();
    resetOrderAttempt();
    navigate(code ? `/app/seguimiento/${code}` : '/app');
  };

  if (order) {
    return (
      <div className="p-5 space-y-5 my-4">
        <div className="bg-white border border-[#EFE6D6] rounded-3xl p-6 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-[#242424] font-display">Registramos tu pedido</h2>
            <p className="text-2xl font-black text-[#C8102E] font-display tracking-wide">{order.code}</p>
            <p className="text-xs text-[#4B4540] max-w-[300px] mx-auto leading-relaxed">
              Envía el mensaje de WhatsApp con este código para que el equipo de Retequeños lo confirme.
            </p>
          </div>

          <div className="bg-[#FFF8EE] border border-[#EFE6D6] p-3.5 rounded-2xl text-left text-xs space-y-2">
            <div className="flex justify-between font-bold text-[#242424]"><span>Cliente:</span><span>{fullName}</span></div>
            <div className="flex justify-between text-[#4B4540]"><span>Modalidad:</span><span>{mode === 'delivery' ? 'Delivery' : 'Recojo en tienda'}</span></div>
            <div className="flex justify-between text-[#4B4540]"><span>Pago:</span><span>{payMethod}</span></div>
            {scheduled && scheduleAt && (
              <div className="flex justify-between text-[#4B4540]"><span>Programado:</span><span>{new Date(scheduleAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
            )}
            <div className="flex justify-between font-bold text-[#C8102E] pt-1.5 border-t border-[#F5EDE1]">
              <span>Total productos:</span>
              <span className="text-sm font-display">{formatMoney(order.total)}</span>
            </div>
          </div>

          {order.receiptMessage && <p role="status" className="text-[11px] font-bold text-[#13A24D]">{order.receiptMessage}</p>}

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
              className="w-full h-11 border border-[#EFE6D6] bg-white text-[#242424] font-bold text-xs rounded-xl hover:bg-[#FFF2DF] transition cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <MapPinned className="w-4 h-4" />
              Ya lo envié: ver el estado de mi pedido
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#4B4540] justify-center text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>El pedido se prepara en cocina tras tu confirmación en WhatsApp{isDigitalPay(payMethod) ? ' y la verificación de tu pago' : ''}.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#242424] font-display">Datos de tu Pedido</h2>
            <p className="text-xs text-[#4B4540]">Completa tus datos para registrar tu pedido y enviarlo por WhatsApp</p>
          </div>

          {customerAccountsEnabled && (signedIn ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg shrink-0">
              <User className="w-3 h-3 text-emerald-600" />
              <span>Con tu cuenta</span>
            </div>
          ) : (
            <Link to="/app/login" state={{ from: '/app/pedido' }} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF8EE] border border-[#EFE6D6] text-[#4B4540] text-[10px] font-semibold rounded-lg shrink-0">
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>Invitado · Iniciar sesión</span>
            </Link>
          ))}
        </div>

        <CustomerForm
          name={fullName}
          phone={phone}
          notes={generalNotes}
          onChangeName={(val) => setField('fullName', val)}
          onChangePhone={(val) => setField('phone', val)}
          onChangeNotes={(val) => setField('generalNotes', val)}
          errors={{ name: errors.name, phone: errors.phone }}
        />

        <FulfillmentSelector
          type={deliveryType as FulfillmentType}
          address={address}
          reference={reference}
          onChangeType={(val) => setField('deliveryType', val)}
          onChangeAddress={(val) => setField('address', val)}
          onChangeReference={(val) => setField('reference', val)}
          errors={{ address: errors.address }}
          location={location}
          onChangeLocation={setLocation}
          savedAddresses={signedIn ? user?.addresses : []}
          canSave={signedIn}
          saveAddress={saveAddress}
          onChangeSaveAddress={setSaveAddress}
        />

        <ScheduleSelector
          scheduled={scheduled}
          onChangeScheduled={setScheduled}
          value={scheduleAt}
          onChange={setScheduleAt}
          error={errors.schedule}
        />

        <PaymentSelector
          method={payMethod}
          onChangeMethod={setPayMethod}
          receipt={receipt}
          onChangeReceipt={setReceipt}
          total={totalProducts}
          error={errors.payMethod}
        />

        <OrderSummary
          subtotal={subtotal}
          discount={discount}
          totalProducts={totalProducts}
          fulfillmentType={mode}
          couponCode={coupon.applied?.code}
          itemCount={items.reduce((s, it) => s + it.quantity, 0)}
        />

        {coupon.message?.error && <p className="text-[11px] font-bold text-[#C8102E] px-1">{coupon.message.text}</p>}
      </div>

      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EFE6D6] p-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] mt-4">
        <div className="max-w-md mx-auto">
          {submitError && <p role="alert" className="text-xs font-bold text-[#C8102E] text-center mb-2">{submitError}</p>}
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
          <p className="text-[10px] text-[#4B4540] text-center mt-1.5 font-medium">
            Retequeños coordinará contigo el costo final de delivery y la confirmación.
          </p>
        </div>
      </div>
    </div>
  );
};
