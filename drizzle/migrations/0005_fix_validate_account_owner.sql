CREATE OR REPLACE FUNCTION public.validate_account_owner()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.account_id IS NULL THEN
    SELECT id INTO NEW.account_id FROM public.bank_accounts
      WHERE user_id = NEW.user_id AND status = 'aktif' ORDER BY created_at LIMIT 1;
  ELSIF NOT EXISTS (SELECT 1 FROM public.bank_accounts WHERE id = NEW.account_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Rekening tidak valid';
  END IF;
  IF TG_TABLE_NAME = 'transactions' THEN
    IF NEW.cost_account_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.bank_accounts WHERE id = NEW.cost_account_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Rekening biaya tidak valid';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;