-- PostgreSQL transaccional para RETEQUE-OS. No contiene datos ni secretos.
-- Dinero NUMERIC(10,2) en todas las tablas: precisión decimal de soles sin float.
-- Ejecutar como migración Supabase. No aplicar remotamente sin autorización.

CREATE TABLE public.products (
  id text PRIMARY KEY CHECK (length(id) > 0),
  name text NOT NULL, icon text NOT NULL, cat text NOT NULL, qty text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  promo numeric(10,2) CHECK (promo >= 0),
  sauces text NOT NULL, badge text NOT NULL, "desc" text NOT NULL, stock boolean NOT NULL,
  sort_order bigint GENERATED ALWAYS AS IDENTITY UNIQUE
);
CREATE INDEX products_category_idx ON public.products(cat);

-- Una sola configuración JSONB: preserva redes sociales y la mezcla superficial de PATCH.
CREATE TABLE public.store_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object')
);

CREATE TABLE public.orders (
  id text PRIMARY KEY CHECK (length(id) > 0),
  customer text, phone text,
  channel text NOT NULL CHECK (channel IN ('web','app','whatsapp','caja')),
  mode text NOT NULL CHECK (mode IN ('delivery','pickup')),
  status text NOT NULL CHECK (status IN ('new','kitchen','delivery','delivered')),
  priority boolean, "payMethod" text, "payVerified" boolean,
  address text, reference text, gps text, notes text, time text,
  "elapsedMinutes" integer CHECK ("elapsedMinutes" >= 0),
  "createdAt" timestamptz, -- NULL para pedidos históricos sin fecha; nunca inventar una fecha.
  "createdBy" text, -- Historia: no exige que siga existiendo ese usuario.
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  "deliveryFee" numeric(10,2) NOT NULL CHECK ("deliveryFee" >= 0),
  discount numeric(10,2) NOT NULL CHECK (discount >= 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  sort_order bigint GENERATED ALWAYS AS IDENTITY UNIQUE
);
CREATE INDEX orders_date_idx ON public.orders("createdAt" DESC NULLS LAST);
CREATE INDEX orders_status_date_idx ON public.orders(status, "createdAt" DESC NULLS LAST);

CREATE TABLE public.order_items (
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  product_id text REFERENCES public.products(id) ON DELETE SET NULL,
  -- Referencia histórica conservada si no existe el producto, o si luego se elimina.
  original_product_id text,
  name text NOT NULL, qty integer NOT NULL CHECK (qty > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0), sauces text,
  PRIMARY KEY(order_id, position)
);
CREATE INDEX order_items_product_idx ON public.order_items(product_id);

CREATE TABLE public.staff_users (
  username text PRIMARY KEY CHECK (length(username) > 0),
  name text NOT NULL, role text NOT NULL CHECK (role IN ('admin','cashier')),
  active boolean NOT NULL,
  salt text NOT NULL, "passwordHash" text NOT NULL CHECK ("passwordHash" ~ '^[0-9a-fA-F]{128}$'),
  "createdAt" timestamptz NOT NULL,
  sort_order bigint GENERATED ALWAYS AS IDENTITY UNIQUE
);
COMMENT ON TABLE public.staff_users IS 'Scrypt existente, sin Supabase Auth. No generar cuentas predeterminadas en PostgreSQL.';

-- Ninguna política pública. La API solo admite la clave service_role del servidor.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.products, public.store_config, public.orders, public.order_items, public.staff_users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.store_config, public.orders, public.order_items, public.staff_users TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.products_sort_order_seq, public.orders_sort_order_seq, public.staff_users_sort_order_seq TO service_role;

-- Funciones SECURITY INVOKER: no elevan privilegios, con search_path fijo.
CREATE FUNCTION public.rtq_item_json(p public.order_items) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object('productId', COALESCE(p.product_id, p.original_product_id),
    'name', p.name, 'qty', p.qty, 'price', p.price, 'sauces', p.sauces);
$$;

CREATE FUNCTION public.rtq_order_json(p public.orders) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT (to_jsonb(p) - 'sort_order') || jsonb_build_object('items', COALESCE(
    (SELECT jsonb_agg(public.rtq_item_json(i) ORDER BY i.position) FROM public.order_items i WHERE i.order_id = p.id), '[]'::jsonb));
$$;

CREATE FUNCTION public.rtq_write_order(p_order jsonb, p_replace boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_item jsonb; v_position integer := 0; v_id text := p_order->>'id';
BEGIN
  IF p_replace THEN
    INSERT INTO public.orders ("id", "customer", "phone", "channel", "mode", "status", "priority", "payMethod", "payVerified", "address", "reference", "gps", "notes", "time", "elapsedMinutes", "createdAt", "createdBy", "subtotal", "deliveryFee", "discount", "total")
  SELECT r."id", r."customer", r."phone", r."channel", r."mode", r."status", r."priority", r."payMethod", r."payVerified", r."address", r."reference", r."gps", r."notes", r."time", r."elapsedMinutes", r."createdAt", r."createdBy", r."subtotal", r."deliveryFee", r."discount", r."total" FROM jsonb_populate_record(NULL::public.orders, p_order) r
  ON CONFLICT ("id") DO UPDATE SET "customer" = EXCLUDED."customer", "phone" = EXCLUDED."phone", "channel" = EXCLUDED."channel", "mode" = EXCLUDED."mode", "status" = EXCLUDED."status", "priority" = EXCLUDED."priority", "payMethod" = EXCLUDED."payMethod", "payVerified" = EXCLUDED."payVerified", "address" = EXCLUDED."address", "reference" = EXCLUDED."reference", "gps" = EXCLUDED."gps", "notes" = EXCLUDED."notes", "time" = EXCLUDED."time", "elapsedMinutes" = EXCLUDED."elapsedMinutes", "createdAt" = EXCLUDED."createdAt", "createdBy" = EXCLUDED."createdBy", "subtotal" = EXCLUDED."subtotal", "deliveryFee" = EXCLUDED."deliveryFee", "discount" = EXCLUDED."discount", "total" = EXCLUDED."total";
    DELETE FROM public.order_items WHERE order_id = v_id;
  ELSE
    INSERT INTO public.orders ("id", "customer", "phone", "channel", "mode", "status", "priority", "payMethod", "payVerified", "address", "reference", "gps", "notes", "time", "elapsedMinutes", "createdAt", "createdBy", "subtotal", "deliveryFee", "discount", "total")
  SELECT r."id", r."customer", r."phone", r."channel", r."mode", r."status", r."priority", r."payMethod", r."payVerified", r."address", r."reference", r."gps", r."notes", r."time", r."elapsedMinutes", r."createdAt", r."createdBy", r."subtotal", r."deliveryFee", r."discount", r."total" FROM jsonb_populate_record(NULL::public.orders, p_order) r;
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_order->'items') LOOP
    INSERT INTO public.order_items(order_id, position, product_id, original_product_id, name, qty, price, sauces)
    VALUES(v_id, v_position, (SELECT id FROM public.products WHERE id = v_item->>'productId'),
      v_item->>'productId', v_item->>'name', (v_item->>'qty')::integer, (v_item->>'price')::numeric, v_item->>'sauces');
    v_position := v_position + 1;
  END LOOP;
  RETURN (SELECT public.rtq_order_json(o) FROM public.orders o WHERE id = v_id);
END;
$$;

-- Cada llamada RPC es una transacción PostgREST: pedido e ítems se confirman juntos.
CREATE FUNCTION public.rtq_repository(p_operation text, p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_result jsonb; v_count integer;
BEGIN
  CASE p_operation
    WHEN 'products.list' THEN
      SELECT COALESCE(jsonb_agg(to_jsonb(p) - 'sort_order' ORDER BY p.sort_order DESC), '[]'::jsonb) INTO v_result FROM public.products p;
    WHEN 'products.find' THEN
      SELECT to_jsonb(p) - 'sort_order' INTO v_result FROM public.products p WHERE id = p_payload->>'id';
    WHEN 'products.save' THEN
      INSERT INTO public.products ("id", "name", "icon", "cat", "qty", "price", "promo", "sauces", "badge", "desc", "stock")
  SELECT r."id", r."name", r."icon", r."cat", r."qty", r."price", r."promo", r."sauces", r."badge", r."desc", r."stock" FROM jsonb_populate_record(NULL::public.products, p_payload->'product') r
  ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "icon" = EXCLUDED."icon", "cat" = EXCLUDED."cat", "qty" = EXCLUDED."qty", "price" = EXCLUDED."price", "promo" = EXCLUDED."promo", "sauces" = EXCLUDED."sauces", "badge" = EXCLUDED."badge", "desc" = EXCLUDED."desc", "stock" = EXCLUDED."stock";
      SELECT to_jsonb(p) - 'sort_order' INTO v_result FROM public.products p WHERE id = p_payload->'product'->>'id';
    WHEN 'products.stock' THEN
      UPDATE public.products p SET stock = (p_payload->>'stock')::boolean WHERE id = p_payload->>'id'
        RETURNING to_jsonb(p) - 'sort_order' INTO v_result;
    WHEN 'products.delete' THEN
      DELETE FROM public.products WHERE id = p_payload->>'id';
      GET DIAGNOSTICS v_count = ROW_COUNT; v_result := to_jsonb(v_count > 0);
    WHEN 'config.get' THEN
      SELECT data INTO v_result FROM public.store_config WHERE id;
      v_result := COALESCE(v_result, '{}'::jsonb);
    WHEN 'config.update' THEN
      INSERT INTO public.store_config(id,data) VALUES(true,p_payload->'patch')
      ON CONFLICT(id) DO UPDATE SET data = store_config.data || EXCLUDED.data RETURNING data INTO v_result;
    WHEN 'orders.list' THEN
      SELECT COALESCE(jsonb_agg(public.rtq_order_json(o) ORDER BY o.sort_order DESC),'[]'::jsonb) INTO v_result FROM public.orders o;
    WHEN 'orders.find' THEN
      SELECT public.rtq_order_json(o) INTO v_result FROM public.orders o WHERE id = p_payload->>'id';
    WHEN 'orders.insert' THEN
      v_result := public.rtq_write_order(p_payload->'order');
    WHEN 'orders.patch' THEN
      -- UPDATE parcial evita perder cambios concurrentes entre estado y pago.
      UPDATE public.orders SET
        status = COALESCE(p_payload->'patch'->>'status', status),
        time = COALESCE(p_payload->'patch'->>'time', time),
        "elapsedMinutes" = COALESCE((p_payload->'patch'->>'elapsedMinutes')::integer, "elapsedMinutes"),
        "payVerified" = COALESCE((p_payload->'patch'->>'payVerified')::boolean, "payVerified")
      WHERE id = p_payload->>'id';
      SELECT public.rtq_order_json(o) INTO v_result FROM public.orders o WHERE id = p_payload->>'id';
    WHEN 'users.list' THEN
      SELECT COALESCE(jsonb_agg(to_jsonb(u) - 'sort_order' ORDER BY u.sort_order), '[]'::jsonb) INTO v_result FROM public.staff_users u;
    WHEN 'users.find' THEN
      SELECT to_jsonb(u) - 'sort_order' INTO v_result FROM public.staff_users u WHERE username = p_payload->>'username';
    WHEN 'users.add' THEN
      INSERT INTO public.staff_users ("username", "name", "role", "active", "salt", "passwordHash", "createdAt")
  SELECT r."username", r."name", r."role", r."active", r."salt", r."passwordHash", r."createdAt" FROM jsonb_populate_record(NULL::public.staff_users, p_payload->'user') r;
      SELECT to_jsonb(u) - 'sort_order' INTO v_result FROM public.staff_users u WHERE username = p_payload->'user'->>'username';
    WHEN 'users.active' THEN
      UPDATE public.staff_users u SET active = (p_payload->>'active')::boolean
      WHERE username = p_payload->>'username' AND role = 'cashier' RETURNING to_jsonb(u) - 'sort_order' INTO v_result;
    ELSE RAISE EXCEPTION USING MESSAGE = 'Operación desconocida', ERRCODE = '22023';
  END CASE;
  RETURN COALESCE(v_result, 'null'::jsonb);
END;
$$;

CREATE FUNCTION public.rtq_snapshot() RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'products', COALESCE((SELECT jsonb_agg(to_jsonb(p)-'sort_order' ORDER BY p.id) FROM public.products p),'[]'::jsonb),
    'orders', COALESCE((SELECT jsonb_agg(public.rtq_order_json(o) ORDER BY o.id) FROM public.orders o),'[]'::jsonb),
    'users', COALESCE((SELECT jsonb_agg(to_jsonb(u)-'sort_order' ORDER BY u.username) FROM public.staff_users u),'[]'::jsonb),
    'config', (SELECT data FROM public.store_config WHERE id));
$$;

-- Normalización tipada para comparar fechas/números y TODOS los campos, sin imprimir PII.
CREATE FUNCTION public.rtq_expected_snapshot(p_snapshot jsonb) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'products', COALESCE((SELECT jsonb_agg(to_jsonb(r)-'sort_order' ORDER BY r.id)
      FROM jsonb_populate_recordset(NULL::public.products, p_snapshot->'products') r),'[]'::jsonb),
    'orders', COALESCE((SELECT jsonb_agg((to_jsonb(r)-'sort_order') || jsonb_build_object('items', j->'items') ORDER BY r.id)
      FROM jsonb_array_elements(p_snapshot->'orders') j
      CROSS JOIN LATERAL jsonb_populate_record(NULL::public.orders,j) r),'[]'::jsonb),
    'users', COALESCE((SELECT jsonb_agg(to_jsonb(r)-'sort_order' ORDER BY r.username)
      FROM jsonb_populate_recordset(NULL::public.staff_users, p_snapshot->'users') r),'[]'::jsonb),
    'config', p_snapshot->'config');
$$;

CREATE FUNCTION public.rtq_stats(p_snapshot jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object('products', jsonb_array_length(p_snapshot->'products'),
    'orders', jsonb_array_length(p_snapshot->'orders'), 'users', jsonb_array_length(p_snapshot->'users'),
    'items', COALESCE((SELECT sum(jsonb_array_length(o->'items')) FROM jsonb_array_elements(p_snapshot->'orders') o),0),
    'orderTotal', COALESCE((SELECT sum((o->>'total')::numeric(10,2)) FROM jsonb_array_elements(p_snapshot->'orders') o),0)::text);
$$;

CREATE FUNCTION public.rtq_import_snapshot(p_snapshot jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_row jsonb; v_expected jsonb; v_actual jsonb; v_key text; v_diff jsonb := '[]'::jsonb;
BEGIN
  -- Serializa importaciones y evita que escrituras concurrentes invaliden la conciliación.
  LOCK TABLE public.products, public.store_config, public.orders, public.order_items, public.staff_users IN SHARE ROW EXCLUSIVE MODE;
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_snapshot->'products') WITH ORDINALITY ORDER BY ordinality DESC LOOP
    INSERT INTO public.products ("id", "name", "icon", "cat", "qty", "price", "promo", "sauces", "badge", "desc", "stock")
  SELECT r."id", r."name", r."icon", r."cat", r."qty", r."price", r."promo", r."sauces", r."badge", r."desc", r."stock" FROM jsonb_populate_record(NULL::public.products, v_row) r
  ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "icon" = EXCLUDED."icon", "cat" = EXCLUDED."cat", "qty" = EXCLUDED."qty", "price" = EXCLUDED."price", "promo" = EXCLUDED."promo", "sauces" = EXCLUDED."sauces", "badge" = EXCLUDED."badge", "desc" = EXCLUDED."desc", "stock" = EXCLUDED."stock";
  END LOOP;
  INSERT INTO public.store_config(id,data) VALUES(true,p_snapshot->'config')
    ON CONFLICT(id) DO UPDATE SET data = EXCLUDED.data;
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_snapshot->'orders') WITH ORDINALITY ORDER BY ordinality DESC LOOP
    PERFORM public.rtq_write_order(v_row, true);
  END LOOP;
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_snapshot->'users') LOOP
    INSERT INTO public.staff_users ("username", "name", "role", "active", "salt", "passwordHash", "createdAt")
  SELECT r."username", r."name", r."role", r."active", r."salt", r."passwordHash", r."createdAt" FROM jsonb_populate_record(NULL::public.staff_users, v_row) r
  ON CONFLICT ("username") DO UPDATE SET "name" = EXCLUDED."name", "role" = EXCLUDED."role", "active" = EXCLUDED."active", "salt" = EXCLUDED."salt", "passwordHash" = EXCLUDED."passwordHash", "createdAt" = EXCLUDED."createdAt";
  END LOOP;
  v_expected := public.rtq_expected_snapshot(p_snapshot);
  v_actual := public.rtq_snapshot();
  FOREACH v_key IN ARRAY ARRAY['products','orders','users','config'] LOOP
    IF v_expected->v_key IS DISTINCT FROM v_actual->v_key THEN v_diff := v_diff || to_jsonb(v_key); END IF;
  END LOOP;
  IF jsonb_array_length(v_diff) > 0 THEN
    -- La excepción revierte también los upserts y el reemplazo de ítems. Sin datos personales.
    RAISE EXCEPTION USING MESSAGE = 'Diferencias en ' || v_diff::text, ERRCODE = 'RT001', DETAIL = v_diff::text;
  END IF;
  RETURN jsonb_build_object('source', public.rtq_stats(v_expected), 'destination', public.rtq_stats(v_actual), 'differences', v_diff);
END;
$$;

-- PostgreSQL concede EXECUTE a PUBLIC por defecto: revocarlo explícitamente.
REVOKE ALL ON FUNCTION public.rtq_item_json(public.order_items), public.rtq_order_json(public.orders),
  public.rtq_write_order(jsonb,boolean), public.rtq_repository(text,jsonb), public.rtq_snapshot(),
  public.rtq_expected_snapshot(jsonb), public.rtq_stats(jsonb), public.rtq_import_snapshot(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rtq_item_json(public.order_items), public.rtq_order_json(public.orders),
  public.rtq_write_order(jsonb,boolean), public.rtq_repository(text,jsonb), public.rtq_snapshot(),
  public.rtq_expected_snapshot(jsonb), public.rtq_stats(jsonb), public.rtq_import_snapshot(jsonb) TO service_role;
