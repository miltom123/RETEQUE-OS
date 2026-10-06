import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, CheckCircle2, ShieldCheck, Utensils, User, UserCheck } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useCheckoutStore } from '../../store/checkoutStore';
import { useAuthStore } from '../../store/authStore';
import { roundMoney } from '../../lib/money';
import { isValidName, isValidPeruMobile } from '../../lib/validation';
import { formatOrderRequestMessage, openWhatsApp } from '../../lib/whatsapp';
import { OrderRequest, FulfillmentType } from '../../types/orderRequest';
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

  // Pre-llenar datos si el cliente tiene sesión iniciada y campos vacíos
  useEffect(() => {
    if (isAuthenticated && user) {
      if (!fullName && user.displayName) setField('fullName', user.displayName);
      if (!phone && user.phone) setField('phone', user.phone);
      if (!address && user.defaultAddress) setField('address', user.defaultAddress);
      if (!reference && user.defaultReference) setField('reference', user.defaultReference);
    }
  }, [isAuthenticated, user, fullName, phone, address, reference, setField]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSent, setIsSent] = useState(false);


  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );
  const discount = 0; // Descuentos ya calculados o directos
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

  const handleSendOrder = () => {
    if (!validate()) {
      // Scroll to first error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const orderRequest: OrderRequest = {
      customer: {
        name: fullName.trim(),
        phone: phone.trim(),
      },
      fulfillment: {
        type: deliveryType as FulfillmentType,
        address: deliveryType === 'delivery' ? address.trim() : undefined,
        reference: deliveryType === 'delivery' ? reference.trim() || undefined : undefined,
      },
      items,
      notes: generalNotes.trim() || undefined,
      subtotal,
      discount,
      totalProducts,
    };

    const message = formatOrderRequestMessage(orderRequest);
    openWhatsApp(message);
    setIsSent(true);
  };

  // Pantalla de Confirmación de Envío a WhatsApp (Sección 7 y 19 del Plan)
  if (isSent) {
    return (
      <div className="p-5 space-y-5 my-4">
        <div className="bg-white border border-[#EFE6D6] rounded-3xl p-6 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-[#242424] font-display">
              Tu solicitud está lista
            </h2>
            <p className="text-xs text-[#6B6662] max-w-[300px] mx-auto leading-relaxed">
              Enviaremos el detalle a WhatsApp para que el equipo de Retequeños confirme disponibilidad, entrega y forma de pago.
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
              <span className="text-sm font-display">{subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleSendOrder}
              className="w-full h-12 bg-[#16B959] hover:bg-[#13A24D] text-white font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>CONTINUAR EN WHATSAPP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                clearCart();
                navigate('/app');
              }}
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
              Completa tus datos para enviarlo prellenado a WhatsApp
            </p>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg shrink-0">
              <User className="w-3 h-3 text-emerald-600" />
              <span>Cliente Identificado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF8EE] border border-[#EFE6D6] text-[#8C867F] text-[10px] font-semibold rounded-lg shrink-0">
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>Modo Invitado</span>
            </div>
          )}
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
          fulfillmentType={deliveryType as FulfillmentType}
          itemCount={items.reduce((s, it) => s + it.quantity, 0)}
        />
      </div>

      {/* Sticky Bottom Final CTA Button (Dentro del contenedor scroll) */}
      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EFE6D6] p-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] mt-4">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={handleSendOrder}
            className="w-full h-12 bg-[#16B959] hover:bg-[#13A24D] text-white font-black text-sm rounded-xl shadow-lg shadow-[#16B959]/25 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-white" />
            <span>ENVIAR PEDIDO POR WHATSAPP</span>
          </button>
          <p className="text-[10px] text-[#8C867F] text-center mt-1.5 font-medium">
            Retequeños coordinará contigo el costo final de delivery y la confirmación.
          </p>
        </div>
      </div>
    </div>
  );
};

