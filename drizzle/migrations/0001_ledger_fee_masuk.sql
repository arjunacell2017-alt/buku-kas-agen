CREATE OR REPLACE VIEW public.ledger_view WITH (security_invoker = true) AS
WITH mut AS (
  SELECT t.id AS transaction_id, t.user_id, t.transaction_date, t.transaction_time, t.transaction_number,
    t.transaction_type, t.amount, t.fee, t.fee_method, t.transaction_cost, t.cost_method, t.description, t.created_at,
    CASE WHEN t.transaction_type IN ('Tarik Tunai','Fee Masuk') THEN t.amount ELSE - t.amount END
      + CASE WHEN t.fee_method = 'Saldo' THEN t.fee ELSE 0::numeric END
      - CASE WHEN t.cost_method = 'Saldo' THEN t.transaction_cost ELSE 0::numeric END AS mutasi_rekening,
    CASE WHEN t.transaction_type = 'Fee Masuk' THEN 0::numeric WHEN t.transaction_type = 'Tarik Tunai' THEN - t.amount ELSE t.amount END
      + CASE WHEN t.fee_method = 'Tunai' THEN t.fee ELSE 0::numeric END
      - CASE WHEN t.cost_method = 'Tunai' THEN t.transaction_cost ELSE 0::numeric END AS mutasi_kas,
    t.fee AS pendapatan_fee
  FROM public.transactions t
)
SELECT m.transaction_id, m.user_id, m.transaction_date, m.transaction_time, m.transaction_number, m.transaction_type,
  m.amount, m.fee, m.fee_method, m.transaction_cost, m.cost_method, m.description, m.created_at,
  m.mutasi_rekening, m.mutasi_kas, m.pendapatan_fee,
  COALESCE(s.opening_bank_balance, 0::numeric) + sum(m.mutasi_rekening) OVER (PARTITION BY m.user_id ORDER BY m.transaction_date, m.transaction_time, m.created_at ROWS UNBOUNDED PRECEDING) AS saldo_rekening,
  COALESCE(s.opening_cash_balance, 0::numeric) + sum(m.mutasi_kas) OVER (PARTITION BY m.user_id ORDER BY m.transaction_date, m.transaction_time, m.created_at ROWS UNBOUNDED PRECEDING) AS saldo_kas
FROM mut m LEFT JOIN public.account_settings s ON s.user_id = m.user_id;