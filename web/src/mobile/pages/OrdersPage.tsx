import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, RotateCcw, ChevronRight } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useUiStore } from '../../store/uiStore';
import { useOrderHistoryStore } from '../../store/orderHistoryStore';
import { fetchMyOrders } from '../../services/auth.service';
import { itemsFromServerLines, repeatInto } from '../../lib/repeatOrder';
import type { OrderStatus } from '../../lib/orderApi';

/** Historial de pedidos y "Repetir pedido" (RFI-10). Con cuenta: del servidor; sin cuenta: de este celular. */
const STATUS_LABEL: Record<string, string> = {
  pending_confirmation: 'Por confirmar',
  new: 'Confirmado',
  kitchen: 'En cocina',
  delivery: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Anulado',
};

interface Row {
  code: string;
  createdAt: string;
  total: number;
  status?: string;
  summary: string;
  repeat: () => number;
}

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);
  const localOrders = useOrderHistoryStore((s) => s.orders);
  const [serverOrders, setServerOrders] = useState<OrderStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setServerOrders(null); return; }
    fetchMyOrders<OrderStatus>().then(setServerOrders).catch((e) => setError(e instanceof Error ? e.message : 'No pudimos cargar tus pedidos.'));
  }, [isAuthenticated]);

  // Pedidos de la cuenta primero; los de este celular que no estén en la cuenta (hechos como invitado) después
  const rows: Row[] = [
    ...(serverOrders || []).map((o) => ({
      code: o.id,
      createdAt: o.createdAt,
      total: o.total,
      status: o.status,
      summary: o.items.map((i) => `${i.qty}× ${i.name}`).join(', '),
      repeat: () => repeatInto(addItem, itemsFromServerLines(o.items)),
    })),
    ...localOrders
      .filter((o) => !(serverOrders || []).some((s) => s.id === o.code))
      .map((o) => ({
        code: o.code,
        createdAt: o.createdAt,
        total: o.total,
        summary: o.items.map((i) => `${i.quantity}× ${i.name}`).join(', '),
        repeat: () => repeatInto(addItem, o.items.map(({ lineId: _lineId, ...item }) => item)),
      })),
  ];

  const onRepeat = (row: Row) => {
    const added = row.repeat();
    if (added === 0) {
      showToast({ message: 'Esos productos ya no están disponibles.' });
      return;
    }
    showToast({ message: `Agregamos ${added} producto(s) de ${row.code} a tu carrito.`, action: 'cart' });
    navigate('/app/carrito');
  };

  return (
    <div className="p-4 space-y-3 pb-8">
      {!isAuthenticated && (
        <div className="bg-[#FFF8EE] border border-[#EFE6D6] rounded-2xl p-3 text-xs text-[#4B4540]">
          Ves los pedidos hechos desde este celular.{' '}
          <Link to="/app/login" state={{ from: '/app/pedidos' }} className="font-bold text-[#C8102E]">Inicia sesión</Link> para verlos en cualquier dispositivo.
        </div>
      )}
      {error && <p role="alert" className="text-xs font-bold text-[#C8102E]">{error}</p>}

      {rows.length === 0 ? (
        <div className="bg-white border border-[#EFE6D6] rounded-3xl p-8 text-center space-y-3 shadow-sm">
          <ClipboardList className="w-10 h-10 text-[#C8102E] mx-auto" />
          <p className="font-bold text-sm text-[#242424]">Aún no tienes pedidos</p>
          <Link to="/app/menu" className="inline-block bg-[#FF3038] text-white text-xs font-bold px-4 py-2.5 rounded-xl">Ver el menú</Link>
        </div>
      ) : (
        rows.map((row) => (
          <div key={row.code} className="bg-white border border-[#EFE6D6] rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-black text-sm text-[#242424]">{row.code}</p>
                <p className="text-[11px] text-[#4B4540]">{new Date(row.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-sm text-[#C8102E]">{formatMoney(row.total)}</p>
                {row.status && <p className="text-[11px] font-bold text-[#4B4540]">{STATUS_LABEL[row.status] || row.status}</p>}
              </div>
            </div>
            <p className="text-xs text-[#4B4540] line-clamp-2">{row.summary}</p>
            <div className="grid grid-cols-2 gap-2">
              <Link to={`/app/seguimiento/${row.code}`} className="h-9 rounded-xl border border-[#EFE6D6] text-xs font-bold text-[#242424] flex items-center justify-center gap-1">
                Ver estado <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <button type="button" onClick={() => onRepeat(row)} className="h-9 rounded-xl bg-[#FF3038] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5" /> Repetir pedido
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
