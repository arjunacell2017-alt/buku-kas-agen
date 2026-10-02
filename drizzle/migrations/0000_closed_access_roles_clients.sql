CREATE TYPE public.app_role AS ENUM ('admin', 'client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.client_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  agent_type text NOT NULL DEFAULT 'Lainnya',
  active_from date NOT NULL DEFAULT CURRENT_DATE,
  active_until date NOT NULL DEFAULT (CURRENT_DATE + 30),
  suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.client_profiles TO authenticated;
GRANT ALL ON public.client_profiles TO service_role;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or admin" ON public.client_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.admin_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id uuid,
  client_label text NOT NULL DEFAULT '',
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_activity TO authenticated;
GRANT ALL ON public.admin_activity TO service_role;
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads activity" ON public.admin_activity FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX admin_activity_created_idx ON public.admin_activity (created_at DESC);

CREATE OR REPLACE FUNCTION public.has_active_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.client_profiles
    WHERE user_id = _user_id AND NOT suspended
      AND CURRENT_DATE >= active_from AND CURRENT_DATE <= active_until
  )
$$;

DROP POLICY IF EXISTS "own transactions" ON public.transactions;
CREATE POLICY "own transactions active" ON public.transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "admin read transactions" ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "own cash" ON public.cash_transactions;
CREATE POLICY "own cash active" ON public.cash_transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "admin read cash" ON public.cash_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "own bank" ON public.bank_transactions;
CREATE POLICY "own bank active" ON public.bank_transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "admin read bank" ON public.bank_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "own expenses" ON public.expenses;
CREATE POLICY "own expenses active" ON public.expenses FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "admin read expenses" ON public.expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "own settings" ON public.account_settings;
CREATE POLICY "own settings active" ON public.account_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "admin read settings" ON public.account_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' FROM auth.users WHERE email = 'arjunafashion.id@gmail.com'
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'client' FROM auth.users WHERE email <> 'arjunafashion.id@gmail.com'
  ON CONFLICT DO NOTHING;
INSERT INTO public.client_profiles (user_id, email, agent_name, active_from, active_until)
  SELECT id, email, 'Agen', CURRENT_DATE, CURRENT_DATE + 365 FROM auth.users WHERE email <> 'arjunafashion.id@gmail.com'
  ON CONFLICT DO NOTHING;