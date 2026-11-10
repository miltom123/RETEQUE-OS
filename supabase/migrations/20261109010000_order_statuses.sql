-- Estados nuevos de pedido: pending_confirmation (pedido web aún no confirmado por caja) y cancelled.
-- Los cuatro estados del KDS no cambian. No aplicar remotamente sin autorización.

ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_confirmation','new','kitchen','delivery','delivered','cancelled'));
