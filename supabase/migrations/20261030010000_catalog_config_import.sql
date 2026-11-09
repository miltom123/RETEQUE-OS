-- Importación limitada para pruebas remotas autorizadas por el propietario.
-- Esta función NO recibe pedidos ni usuarios y NO escribe en sus tablas.
CREATE FUNCTION public.rtq_import_catalog_config(p_products jsonb, p_config jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_product jsonb; v_expected jsonb; v_actual jsonb; v_count integer;
BEGIN
  LOCK TABLE public.products, public.store_config IN SHARE ROW EXCLUSIVE MODE;
  FOR v_product IN SELECT value FROM jsonb_array_elements(p_products) WITH ORDINALITY ORDER BY ordinality DESC LOOP
    INSERT INTO public.products(id,name,icon,cat,qty,price,promo,sauces,badge,"desc",stock)
    SELECT r.id,r.name,r.icon,r.cat,r.qty,r.price,r.promo,r.sauces,r.badge,r."desc",r.stock
    FROM jsonb_populate_record(NULL::public.products,v_product) r
    ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,icon=EXCLUDED.icon,cat=EXCLUDED.cat,
      qty=EXCLUDED.qty,price=EXCLUDED.price,promo=EXCLUDED.promo,sauces=EXCLUDED.sauces,
      badge=EXCLUDED.badge,"desc"=EXCLUDED."desc",stock=EXCLUDED.stock;
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
REVOKE ALL ON FUNCTION public.rtq_import_catalog_config(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rtq_import_catalog_config(jsonb,jsonb) TO service_role;
