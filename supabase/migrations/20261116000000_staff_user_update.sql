-- Editar el nombre y la contraseña del personal desde el panel (operación users.update).
-- Se vuelve a crear rtq_repository con la nueva operación; las demás no cambian.
-- No aplicar remotamente sin autorización.

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
    WHEN 'users.update' THEN
      -- Nombre y contraseña; el backend ya calculó salt y hash. Rol y estado no cambian aquí.
      UPDATE public.staff_users u SET
        name = COALESCE(p_payload->'patch'->>'name', name),
        salt = COALESCE(p_payload->'patch'->>'salt', salt),
        "passwordHash" = COALESCE(p_payload->'patch'->>'passwordHash', "passwordHash")
      WHERE username = p_payload->>'username' RETURNING to_jsonb(u) - 'sort_order' INTO v_result;
    ELSE RAISE EXCEPTION USING MESSAGE = 'Operación desconocida', ERRCODE = '22023';
  END CASE;
  RETURN COALESCE(v_result, 'null'::jsonb);
END;
$$;
