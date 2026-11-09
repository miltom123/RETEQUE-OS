-- Opciones con precio por producto: presentaciones, extras y bebidas de promo.
-- La columna es JSONB porque cada producto usa grupos distintos; el backend la valida al guardar.
-- Las tres funciones que listan las columnas de products se vuelven a crear con "options".
-- No aplicar remotamente sin autorización.

ALTER TABLE public.products
  ADD COLUMN options jsonb CHECK (options IS NULL OR jsonb_typeof(options) = 'object');

CREATE OR REPLACE FUNCTION public.rtq_repository(p_operation text, p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_result jsonb; v_count integer;
BEGIN
  CASE p_operation
    WHEN 'products.list' THEN
      SELECT COALESCE(jsonb_agg(to_jsonb(p) - 'sort_order' ORDER BY p.sort_order DESC), '[]'::jsonb) INTO v_result FROM public.products p;
    WHEN 'products.find' THEN
      SELECT to_jsonb(p) - 'sort_order' INTO v_result FROM public.products p WHERE id = p_payload->>'id';
    WHEN 'products.save' THEN
      INSERT INTO public.products ("id", "name", "icon", "cat", "qty", "price", "promo", "sauces", "badge", "desc", "stock", "options")
  SELECT r."id", r."name", r."icon", r."cat", r."qty", r."price", r."promo", r."sauces", r."badge", r."desc", r."stock", r."options" FROM jsonb_populate_record(NULL::public.products, p_payload->'product') r
  ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "icon" = EXCLUDED."icon", "cat" = EXCLUDED."cat", "qty" = EXCLUDED."qty", "price" = EXCLUDED."price", "promo" = EXCLUDED."promo", "sauces" = EXCLUDED."sauces", "badge" = EXCLUDED."badge", "desc" = EXCLUDED."desc", "stock" = EXCLUDED."stock", "options" = EXCLUDED."options";
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

CREATE OR REPLACE FUNCTION public.rtq_import_snapshot(p_snapshot jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_row jsonb; v_expected jsonb; v_actual jsonb; v_key text; v_diff jsonb := '[]'::jsonb;
BEGIN
  -- Serializa importaciones y evita que escrituras concurrentes invaliden la conciliación.
  LOCK TABLE public.products, public.store_config, public.orders, public.order_items, public.staff_users IN SHARE ROW EXCLUSIVE MODE;
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_snapshot->'products') WITH ORDINALITY ORDER BY ordinality DESC LOOP
    INSERT INTO public.products ("id", "name", "icon", "cat", "qty", "price", "promo", "sauces", "badge", "desc", "stock", "options")
  SELECT r."id", r."name", r."icon", r."cat", r."qty", r."price", r."promo", r."sauces", r."badge", r."desc", r."stock", r."options" FROM jsonb_populate_record(NULL::public.products, v_row) r
  ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "icon" = EXCLUDED."icon", "cat" = EXCLUDED."cat", "qty" = EXCLUDED."qty", "price" = EXCLUDED."price", "promo" = EXCLUDED."promo", "sauces" = EXCLUDED."sauces", "badge" = EXCLUDED."badge", "desc" = EXCLUDED."desc", "stock" = EXCLUDED."stock", "options" = EXCLUDED."options";
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

CREATE OR REPLACE FUNCTION public.rtq_import_catalog_config(p_products jsonb, p_config jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_product jsonb; v_expected jsonb; v_actual jsonb; v_count integer;
BEGIN
  LOCK TABLE public.products, public.store_config IN SHARE ROW EXCLUSIVE MODE;
  FOR v_product IN SELECT value FROM jsonb_array_elements(p_products) WITH ORDINALITY ORDER BY ordinality DESC LOOP
    INSERT INTO public.products(id,name,icon,cat,qty,price,promo,sauces,badge,"desc",stock,options)
    SELECT r.id,r.name,r.icon,r.cat,r.qty,r.price,r.promo,r.sauces,r.badge,r."desc",r.stock,r.options
    FROM jsonb_populate_record(NULL::public.products,v_product) r
    ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,icon=EXCLUDED.icon,cat=EXCLUDED.cat,
      qty=EXCLUDED.qty,price=EXCLUDED.price,promo=EXCLUDED.promo,sauces=EXCLUDED.sauces,
      badge=EXCLUDED.badge,"desc"=EXCLUDED."desc",stock=EXCLUDED.stock,options=EXCLUDED.options;
  END LOOP;
  INSERT INTO public.store_config(id,data) VALUES(true,p_config)
    ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data;
  SELECT COALESCE(jsonb_agg(to_jsonb(r)-'sort_order' ORDER BY r.id),'[]'::jsonb)
    INTO v_expected FROM jsonb_populate_recordset(NULL::public.products,p_products) r;
  SELECT COALESCE(jsonb_agg(to_jsonb(p)-'sort_order' ORDER BY p.id),'[]'::jsonb)
    INTO v_actual FROM public.products p;
  IF v_expected IS DISTINCT FROM v_actual OR p_config IS DISTINCT FROM (SELECT data FROM public.store_config WHERE id) THEN
    RAISE EXCEPTION USING MESSAGE='Diferencias en catálogo o configuración',ERRCODE='RT001',DETAIL='["products","config"]';
  END IF;
  v_count := jsonb_array_length(v_actual);
  RETURN jsonb_build_object('source',jsonb_build_object('products',v_count,'storeConfig',1),
    'destination',jsonb_build_object('products',v_count,'storeConfig',1),'differences','[]'::jsonb);
END;
$$;
