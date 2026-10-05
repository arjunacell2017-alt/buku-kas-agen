CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number text,
  owner_name text,
  opening_balance numeric NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  actual_balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aktif',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read bank accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own bank accounts active" ON public.bank_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE INDEX idx_bank_accounts_user ON public.bank_accounts(user_id);
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transactions ADD COLUMN account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN cost_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.bank_transactions ADD COLUMN account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_bank_transactions_account ON public.bank_transactions(account_id);

INSERT INTO public.bank_accounts (user_id, bank_name, opening_balance, actual_balance, start_date)
SELECT user_id, 'Rekening Utama', GREATEST(opening_bank_balance, 0), actual_bank_balance, start_date FROM public.account_settings;
INSERT INTO public.bank_accounts (user_id, bank_name)
SELECT DISTINCT u.user_id, 'Rekening Utama' FROM (
  SELECT user_id FROM public.transactions UNION SELECT user_id FROM public.bank_transactions
) u WHERE NOT EXISTS (SELECT 1 FROM public.bank_accounts b WHERE b.user_id = u.user_id);
UPDATE public.transactions t SET account_id = (SELECT b.id FROM public.bank_accounts b WHERE b.user_id = t.user_id ORDER BY b.created_at LIMIT 1) WHERE account_id IS NULL;
UPDATE public.bank_transactions t SET account_id = (SELECT b.id FROM public.bank_accounts b WHERE b.user_id = t.user_id ORDER BY b.created_at LIMIT 1) WHERE account_id IS NULL;

CREATE OR REPLACE FUNCTION public.validate_account_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.account_id IS NULL THEN
    SELECT id INTO NEW.account_id FROM public.bank_accounts
      WHERE user_id = NEW.user_id AND status = 'aktif' ORDER BY created_at LIMIT 1;
  ELSIF NOT EXISTS (SELECT 1 FROM public.bank_accounts WHERE id = NEW.account_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Rekening tidak valid';
  END IF;
  IF TG_TABLE_NAME = 'transactions' AND NEW.cost_account_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.bank_accounts WHERE id = NEW.cost_account_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Rekening biaya tidak valid';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_transactions_account BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.validate_account_owner();
CREATE TRIGGER validate_bank_transactions_account BEFORE INSERT OR UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.validate_account_owner();

COMMENT ON COLUMN public.account_settings.opening_bank_balance IS 'DEPRECATED: replaced by bank_accounts.opening_balance';
COMMENT ON COLUMN public.account_settings.actual_bank_balance IS 'DEPRECATED: replaced by bank_accounts.actual_balance';

CREATE OR REPLACE VIEW public.ledger_view WITH (security_invoker = true) AS
WITH mut AS (
  SELECT t.id AS transaction_id, t.user_id, t.transaction_date, t.transaction_time, t.transaction_number,
    t.transaction_type, t.amount, t.fee, t.fee_method, t.transaction_cost, t.cost_method, t.description, t.created_at,
    CASE WHEN t.transaction_type = ANY (ARRAY['Tarik Tunai','Fee Masuk']) THEN t.amount ELSE -t.amount END
      + CASE WHEN t.fee_method = 'Saldo' THEN t.fee ELSE 0 END
      - CASE WHEN t.cost_method = 'Saldo' THEN t.transaction_cost ELSE 0 END AS mutasi_rekening,
    CASE WHEN t.transaction_type = 'Fee Masuk' THEN 0 WHEN t.transaction_type = 'Tarik Tunai' THEN -t.amount ELSE t.amount END
      + CASE WHEN t.fee_method = 'Tunai' THEN t.fee ELSE 0 END
      - CASE WHEN t.cost_method = 'Tunai' THEN t.transaction_cost ELSE 0 END AS mutasi_kas,
    t.fee AS pendapatan_fee, t.account_id, t.cost_account_id
  FROM public.transactions t
)
SELECT m.transaction_id, m.user_id, m.transaction_date, m.transaction_time, m.transaction_number, m.transaction_type,
  m.amount, m.fee, m.fee_method, m.transaction_cost, m.cost_method, m.description, m.created_at,
  m.mutasi_rekening, m.mutasi_kas, m.pendapatan_fee,
  COALESCE((SELECT sum(b.opening_balance) FROM public.bank_accounts b WHERE b.user_id = m.user_id), 0)
    + sum(m.mutasi_rekening) OVER (PARTITION BY m.user_id ORDER BY m.transaction_date, m.transaction_time, m.created_at ROWS UNBOUNDED PRECEDING) AS saldo_rekening,
  COALESCE(s.opening_cash_balance, 0) + sum(m.mutasi_kas) OVER (PARTITION BY m.user_id ORDER BY m.transaction_date, m.transaction_time, m.created_at ROWS UNBOUNDED PRECEDING) AS saldo_kas,
  m.account_id, m.cost_account_id
FROM mut m LEFT JOIN public.account_settings s ON s.user_id = m.user_id;