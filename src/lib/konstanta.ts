export const JENIS_TRANSAKSI = [
  "Tarik Tunai",
  "Setor Tunai",
  "Transfer",
  "Pembayaran",
  "Pulsa",
  "Token PLN",
  "BRIVA",
  "Top Up",
  "Lainnya",
] as const;

export const METODE_PEMBAYARAN = ["Tunai", "Rekening", "Lainnya"] as const;

export const METODE_FEE = ["Tunai", "Saldo"] as const;

export const METODE_BIAYA = ["Tidak Ada", "Tunai", "Saldo"] as const;

export const KATEGORI_BIAYA = [
  "Internet",
  "Listrik",
  "Transportasi",
  "ATK",
  "Administrasi",
  "Sewa",
  "Peralatan",
  "Lainnya",
] as const;

export const KATEGORI_KAS = [
  "Modal",
  "Penjualan",
  "Setoran Bank",
  "Penarikan Bank",
  "Biaya",
  "Lainnya",
] as const;
