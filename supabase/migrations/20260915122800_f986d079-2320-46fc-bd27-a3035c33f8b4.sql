
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  transaction_date DATE NOT NULL DEFAULT current_date,
  transaction_time TIME NOT NULL DEFAULT '00:00',
  transaction_number TEXT,
  transaction_type TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  fee NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  transaction_cost NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (transaction_cost >= 0),
  payment_method TEXT NOT NULL DEFAULT 'Tunai',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_tx_user_date ON public.transactions (user_id, transaction_date DESC);
CREATE INDEX idx_tx_type ON public.transactions (user_id, transaction_type);

CREATE TABLE public.cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  transaction_date DATE NOT NULL DEFAULT current_date,
  type TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_transactions TO authenticated;
GRANT ALL ON public.cash_transactions TO service_role;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cash" ON public.cash_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_cash_user_date ON public.cash_transactions (user_id, transaction_date DESC);

CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  transaction_date DATE NOT NULL DEFAULT current_date,
  account_name TEXT NOT NULL DEFAULT '',
  transaction_type TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank" ON public.bank_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_bank_user_date ON public.bank_transactions (user_id, transaction_date DESC);

CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  expense_date DATE NOT NULL DEFAULT current_date,
  category TEXT NOT NULL DEFAULT 'Lainnya',
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own expenses" ON public.expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_exp_user_date ON public.expenses (user_id, expense_date DESC);

CREATE TABLE public.account_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users,
  business_name TEXT NOT NULL DEFAULT 'Agen BRILink',
  opening_cash_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  opening_bank_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_cash_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_bank_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_settings TO authenticated;
GRANT ALL ON public.account_settings TO service_role;
ALTER TABLE public.account_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.account_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
