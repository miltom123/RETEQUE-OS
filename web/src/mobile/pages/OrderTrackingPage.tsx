import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Paperclip, RefreshCw, XCircle } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { compressImage, fetchOrderStatus, isDigitalPay, uploadReceipt, type OrderStatus } from '../../lib/orderApi';
import { useOrderHistoryStore } from '../../store/orderHistoryStore';
import { siteConfig } from '../../config/site';

/** Seguimiento del pedido (RFI-09): se actualiza solo cada 10 s mientras la pantalla está abierta. */
const POLL_MS = 10000;

const STEPS: { key: OrderStatus['status']; label: string; help: string }[] = [
  { key: 'pending_confirmation', label: 'Recibido', help: 'Envía el código por WhatsApp para que caja lo confirme.' },
  { key: 'new', label: 'Confirmado', help: 'Caja confirmó tu pedido.' },
  { key: 'kitchen', label: 'En cocina', help: 'Estamos preparando tu pedido.' },
  { key: 'delivery', label: 'En camino', help: 'El motorizado va hacia tu dirección.' },
  { key: 'delivered', label: 'Entregado', help: '¡Buen provecho!' },
];

const time = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export const OrderTrackingPage: React.FC = () => {
  const { code = '' } = useParams<{ code: string }>();
  const local = useOrderHistoryStore((s) => s.find(code));
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrderStatus(code));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos consultar tu pedido.');
    }
  }, [code]);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const onReceipt = async (file: File | undefined) => {
    if (!file || !local) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const res = await uploadReceipt(code, local.accessToken, await compressImage(file));
      setUploadMsg({ ok: true, text: res.message });
      load();
    } catch (e) {
      setUploadMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo subir la constancia.' });
    } finally {
      setUploading(false);
    }
  };

  if (!order) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-[#242424]">{error || 'Consultando tu pedido…'}</p>
        <Link to="/app/pedidos" className="inline-block text-xs font-bold text-[#C8102E]">Ver mis pedidos</Link>
      </div>
    );
  }

  const steps = order.mode === 'pickup' ? STEPS.filter((s) => s.key !== 'delivery').map((s) => (s.key === 'delivered' ? { ...s, label: 'Recogido' } : s)) : STEPS;
  const current = steps.findIndex((s) => s.key === order.status);
  const cancelled = order.status === 'cancelled';
  const needsReceipt = isDigitalPay(order.payMethod) && !order.payVerified && !cancelled && order.status !== 'delivered';

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="bg-white border border-[#EFE6D6] rounded-3xl p-5 shadow-sm space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#4B4540]">Pedido</p>
          <button type="button" onClick={load} aria-label="Actualizar estado" className="text-[#4B4540] cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <h2 className="text-xl font-black text-[#C8102E] font-display tracking-wide">{order.id}</h2>
        <p className="text-xs text-[#4B4540]">
          {order.mode === 'delivery' ? 'Delivery' : 'Recojo en tienda'} · {formatMoney(order.total)} · {order.payMethod}
        </p>
        {order.scheduledFor && <p className="text-xs font-bold text-[#242424]">📅 Programado para {time(order.scheduledFor)}</p>}
      </div>

      {cancelled ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-[#B91C1C] flex gap-2">
          <XCircle className="w-5 h-5 shrink-0" />
          <span>Este pedido fue anulado. Si crees que es un error, escríbenos por <a className="font-bold underline" href={`https://wa.me/${siteConfig.whatsappInternational}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</span>
        </div>
      ) : (
        <ol className="bg-white border border-[#EFE6D6] rounded-2xl p-4 space-y-3 shadow-sm" aria-label="Avance del pedido">
          {steps.map((step, i) => {
            const done = i <= current;
            return (
              <li key={step.key} className="flex gap-3" aria-current={i === current ? 'step' : undefined}>
                {done ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <Circle className="w-5 h-5 text-[#D9CDBB] shrink-0" />}
                <div className="min-w-0">
                  <p className={`text-sm ${done ? 'font-black text-[#242424]' : 'font-semibold text-[#6B6662]'}`}>
                    {step.label} {order.statusAt[step.key] && <span className="text-[11px] font-medium text-[#4B4540]">· {time(order.statusAt[step.key])}</span>}
                  </p>
                  {i === current && <p className="text-[11px] text-[#4B4540]">{step.key === 'delivery' && order.driverAssigned ? 'Un motorizado ya tomó tu pedido.' : step.help}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="bg-white border border-[#EFE6D6] rounded-2xl p-4 shadow-sm space-y-2 text-xs">
        <p className="font-bold text-[#242424]">Pago</p>
        {isDigitalPay(order.payMethod) ? (
          <p className="text-[#4B4540]">
            {order.payVerified ? '✅ Pago verificado por caja.' : order.hasReceipt ? '📎 Constancia recibida: caja la está verificando.' : `⏳ Falta tu constancia de ${order.payMethod}.`}
          </p>
        ) : (
          <p className="text-[#4B4540]">{order.payMethod === 'Efectivo' ? 'Pagas en efectivo al recibir.' : order.payMethod}</p>
        )}
        {needsReceipt && local && (
          <label className="flex items-center justify-center gap-2 h-10 rounded-lg border border-dashed border-[#D9CDBB] bg-[#FFF8EE] font-bold text-[#242424] cursor-pointer">
            <Paperclip className="w-4 h-4" />
            {uploading ? 'Subiendo…' : order.hasReceipt ? 'Reemplazar constancia' : 'Adjuntar constancia'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => onReceipt(e.target.files?.[0])} />
          </label>
        )}
        {needsReceipt && !local && <p className="text-[#4B4540]">Para adjuntar la constancia abre este pedido desde el celular en que lo hiciste, o envíala por WhatsApp.</p>}
        {uploadMsg && <p role="status" className={`font-bold ${uploadMsg.ok ? 'text-[#13A24D]' : 'text-[#C8102E]'}`}>{uploadMsg.text}</p>}
      </div>

      <div className="bg-white border border-[#EFE6D6] rounded-2xl p-4 shadow-sm space-y-2 text-xs">
        <p className="font-bold text-[#242424]">Tu pedido</p>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="text-[#242424]">{item.qty}× {item.name}{item.sauces ? <span className="text-[#4B4540]"> · {item.sauces}</span> : null}</span>
            <span className="font-bold shrink-0">{formatMoney(item.price * item.qty)}</span>
          </div>
        ))}
        {order.discount > 0 && <div className="flex justify-between text-[#C8102E]"><span>Descuento</span><span>-{formatMoney(order.discount)}</span></div>}
        <div className="flex justify-between font-black pt-1 border-t border-[#F5EDE1]"><span>Total</span><span>{formatMoney(order.total)}</span></div>
      </div>

      <Link to="/app/pedidos" className="block text-center text-xs font-bold text-[#C8102E]">Ver todos mis pedidos</Link>
    </div>
  );
};
