import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function pastikanAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Akses ditolak");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function catat(admin: any, adminId: string, clientId: string | null, label: string, action: string, detail?: string) {
  await admin.from("admin_activity").insert({ admin_id: adminId, client_id: clientId, client_label: label, action, detail: detail ?? null });
}

const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const buatClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        agent_name: z.string().trim().min(1).max(120),
        owner_name: z.string().trim().max(120),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(30),
        agent_type: z.string().trim().max(40),
        password: z.string().min(8).max(72),
        active_from: tanggal,
        active_until: tanggal,
      })
      .refine((v) => v.active_until >= v.active_from)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await pastikanAdmin(context as Ctx);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message?.includes("already") ? "Email sudah terdaftar" : "Gagal membuat akun");
    const uid = created.user.id;
    const { password: _p, ...profil } = data;
    const r1 = await admin.from("client_profiles").insert({ user_id: uid, ...profil });
    const r2 = await admin.from("user_roles").insert({ user_id: uid, role: "client" });
    if (r1.error || r2.error) {
      await admin.auth.admin.deleteUser(uid);
      throw new Error("Gagal menyimpan data client");
    }
    await admin.from("account_settings").insert({ user_id: uid, business_name: data.agent_name });
    await admin.from("bank_accounts").insert({ user_id: uid, bank_name: "Rekening Utama" });
    await catat(admin, context.userId, uid, data.agent_name, "Buat client", `Aktif ${data.active_from} s/d ${data.active_until}`);
    return { ok: true };
  });

export const ubahClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        agent_name: z.string().trim().min(1).max(120),
        owner_name: z.string().trim().max(120),
        phone: z.string().trim().max(30),
        agent_type: z.string().trim().max(40),
        active_from: tanggal,
        active_until: tanggal,
      })
      .refine((v) => v.active_until >= v.active_from)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await pastikanAdmin(context as Ctx);
    const { user_id, ...rest } = data;
    const { error } = await admin.from("client_profiles").update(rest).eq("user_id", user_id);
    if (error) throw new Error("Gagal menyimpan perubahan");
    await catat(admin, context.userId, user_id, data.agent_name, "Ubah data client", `Aktif ${data.active_from} s/d ${data.active_until}`);
    return { ok: true };
  });

export const perpanjangClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), active_until: tanggal }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await pastikanAdmin(context as Ctx);
    const { data: p } = await admin.from("client_profiles").select("agent_name").eq("user_id", data.user_id).single();
    const { error } = await admin.from("client_profiles").update({ active_until: data.active_until }).eq("user_id", data.user_id);
    if (error) throw new Error("Gagal memperpanjang");
    await catat(admin, context.userId, data.user_id, p?.agent_name ?? "", "Perpanjang masa aktif", `Sampai ${data.active_until}`);
    return { ok: true };
  });

export const setTangguhkan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), suspended: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await pastikanAdmin(context as Ctx);
    const { data: p } = await admin.from("client_profiles").select("agent_name").eq("user_id", data.user_id).single();
    const { error } = await admin.from("client_profiles").update({ suspended: data.suspended }).eq("user_id", data.user_id);
    if (error) throw new Error("Gagal mengubah status");
    await catat(admin, context.userId, data.user_id, p?.agent_name ?? "", data.suspended ? "Tangguhkan akun" : "Aktifkan kembali akun");
    return { ok: true };
  });

export const resetPasswordClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await pastikanAdmin(context as Ctx);
    const { data: p } = await admin.from("client_profiles").select("agent_name").eq("user_id", data.user_id).single();
    if (!p) throw new Error("Client tidak ditemukan");
    const { error } = await admin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error("Gagal reset kata sandi");
    await catat(admin, context.userId, data.user_id, p.agent_name, "Reset kata sandi");
    return { ok: true };
  });

export const hapusClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await pastikanAdmin(context as Ctx);
    if (data.user_id === context.userId) throw new Error("Tidak bisa menghapus akun sendiri");
    const { data: p } = await admin.from("client_profiles").select("agent_name").eq("user_id", data.user_id).single();
    if (!p) throw new Error("Client tidak ditemukan");
    const { error } = await admin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error("Gagal menghapus client");
    await catat(admin, context.userId, null, p.agent_name, "Hapus client", "Akun dan seluruh data pembukuan dihapus");
    return { ok: true };
  });
