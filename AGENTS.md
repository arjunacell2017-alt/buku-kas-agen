<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Access is invite-only: public signup is disabled; admins create client accounts via server functions in src/lib/admin.functions.ts (service role, admin role verified first). Why: closed-access SaaS.
- Bookkeeping RLS requires `has_active_access(auth.uid())` (admin, or client not suspended and within active_from..active_until); admins get read-only SELECT on client data. Why: expiry/suspension enforced in the database, not just the UI.
