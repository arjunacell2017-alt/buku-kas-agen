import { supabase } from "@/integrations/supabase/client";
import { toISODate } from "@/lib/format";

export type StatusAkses = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "SUSPENDED" | "PENDING";

export const STATUS_LABEL: Record<StatusAkses, string> = {
  ACTIVE: "Aktif",
  EXPIRING_SOON: "Akan Berakhir",
  EXPIRED: "Expired",
  SUSPENDED: "Ditangguhkan",
  PENDING: "Belum Mulai",
};

export const JENIS_AGEN = ["AgenBRILink", "Agen46", "Mini ATM", "PPOB", "Lainnya"] as const;

export const MASA_AKTIF = [
  { value: "30d", label: "30 Hari" },
  { value: "3m", label: "3 Bulan" },
  { value: "6m", label: "6 Bulan" },
  { value: "1y", label: "1 Tahun" },
  { value: "2y", label: "2 Tahun" },
] as const;

export function tambahDurasi(fromISO: string, kode: string): string {
  const d = new Date(`${fromISO}T00:00:00`);
  if (kode === "30d") d.setDate(d.getDate() + 30);
  else if (kode === "3m") d.setMonth(d.getMonth() + 3);
  else if (kode === "6m") d.setMonth(d.getMonth() + 6);
  else if (kode === "1y") d.setFullYear(d.getFullYear() + 1);
  else if (kode === "2y") d.setFullYear(d.getFullYear() + 2);
  return toISODate(d);
}

export function hitungStatus(p: { suspended: boolean; active_from: string; active_until: string }, todayISO = toISODate(new Date())): StatusAkses {
  if (p.suspended) return "SUSPENDED";
  if (todayISO < p.active_from) return "PENDING";
  if (todayISO > p.active_until) return "EXPIRED";
  const sisa = (new Date(`${p.active_until}T00:00:00`).getTime() - new Date(`${todayISO}T00:00:00`).getTime()) / 86400000;
  return sisa <= 7 ? "EXPIRING_SOON" : "ACTIVE";
}

export type InfoAkses = {
  isAdmin: boolean;
  status: StatusAkses | null;
  activeUntil: string | null;
};

/** Reads the signed-in user's role and access period (enforced again by database rules). */
export async function cekAkses(userId: string): Promise<InfoAkses> {
  const [{ data: roles }, { data: profil }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("client_profiles").select("suspended,active_from,active_until").eq("user_id", userId).maybeSingle(),
  ]);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  if (!profil) return { isAdmin, status: null, activeUntil: null };
  return { isAdmin, status: hitungStatus(profil), activeUntil: profil.active_until };
}

export function bolehMasuk(a: InfoAkses) {
  return a.isAdmin || a.status === "ACTIVE" || a.status === "EXPIRING_SOON";
}
