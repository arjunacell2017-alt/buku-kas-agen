CREATE TABLE public.transaction_number_counters (
  user_id uuid NOT NULL,
  number_date date NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, number_date),
  CONSTRAINT transaction_number_counter_range CHECK (last_value BETWEEN 0 AND 9999)
);
GRANT SELECT ON public.transaction_number_counters TO authenticated;
GRANT ALL ON public.transaction_number_counters TO service_role;
ALTER TABLE public.transaction_number_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own active number counters" ON public.transaction_number_counters FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.has_active_access(auth.uid()));
ALTER TABLE public.transactions ADD COLUMN number_date date, ADD COLUMN number_sequence integer;
CREATE UNIQUE INDEX transactions_number_sequence_unique ON public.transactions (user_id, number_date, number_sequence) WHERE number_sequence IS NOT NULL;

CREATE FUNCTION public.preview_transaction_number(_date date DEFAULT (timezone('Asia/Jakarta', now()))::date)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid(); v_last integer;
BEGIN
  IF v_user IS NULL OR NOT public.has_active_access(v_user) THEN RAISE EXCEPTION 'Akses tidak diizinkan'; END IF;
  IF _date IS NULL THEN RAISE EXCEPTION 'Tanggal transaksi wajib diisi'; END IF;
  SELECT greatest(coalesce((SELECT c.last_value FROM public.transaction_number_counters c WHERE c.user_id = v_user AND c.number_date = _date), 0), coalesce((SELECT max(right(t.transaction_number, 4)::integer) FROM public.transactions t WHERE t.user_id = v_user AND t.transaction_number ~ ('^BKA-' || to_char(_date, 'YYYYMMDD') || '-[0-9]{4}$')), 0)) INTO v_last;
  IF v_last >= 9999 THEN RAISE EXCEPTION 'Nomor transaksi pada tanggal ini sudah mencapai 9999'; END IF;
  RETURN 'BKA-' || to_char(_date, 'YYYYMMDD') || '-' || lpad((v_last + 1)::text, 4, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.preview_transaction_number(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_transaction_number(date) TO authenticated;

CREATE FUNCTION public.assign_transaction_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_existing integer; v_next integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.transaction_number := OLD.transaction_number;
    NEW.number_date := OLD.number_date;
    NEW.number_sequence := OLD.number_sequence;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Pemilik transaksi tidak dapat diubah'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.user_id IS NULL OR NEW.transaction_date IS NULL THEN RAISE EXCEPTION 'Pemilik dan tanggal transaksi wajib diisi'; END IF;
  IF auth.uid() IS NOT NULL AND (auth.uid() <> NEW.user_id OR NOT public.has_active_access(auth.uid())) THEN RAISE EXCEPTION 'Akses tidak diizinkan'; END IF;
  SELECT coalesce(max(right(t.transaction_number, 4)::integer), 0) INTO v_existing
  FROM public.transactions t WHERE t.user_id = NEW.user_id AND t.transaction_number ~ ('^BKA-' || to_char(NEW.transaction_date, 'YYYYMMDD') || '-[0-9]{4}$');
  INSERT INTO public.transaction_number_counters AS c (user_id, number_date, last_value)
  VALUES (NEW.user_id, NEW.transaction_date, v_existing + 1)
  ON CONFLICT (user_id, number_date) DO UPDATE SET last_value = greatest(c.last_value, v_existing) + 1
  RETURNING last_value INTO v_next;
  NEW.number_date := NEW.transaction_date;
  NEW.number_sequence := v_next;
  NEW.transaction_number := 'BKA-' || to_char(NEW.transaction_date, 'YYYYMMDD') || '-' || lpad(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_transaction_number() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER assign_transaction_number BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.assign_transaction_number();