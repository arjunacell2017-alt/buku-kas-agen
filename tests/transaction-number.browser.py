"""Authenticated integration tests. Real test rows are deleted in finally;
consumed sequence counters intentionally remain, proving no number reuse.
Run: python3 tests/transaction-number.browser.py
"""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
            storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
            session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
            cookies = json.loads(os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON") or "[]")
        else:
            with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
                minted = json.load(f)
            storage_key = minted["storage_key"]
            session_json = json.dumps(minted["session"])
            cookies = minted.get("cookies") or []
        if cookies:
            await context.add_cookies([{**c, "url": "http://localhost:8080"} for c in cookies])
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v]) => window.localStorage.setItem(k,v)", [storage_key, session_json])
        await page.goto("http://localhost:8080/transaksi")
        await page.get_by_role("button", name="Tambah Transaksi", exact=True).wait_for()
        await page.get_by_role("button", name="Tambah Transaksi", exact=True).click()
        number = page.get_by_label("Nomor Transaksi", exact=True)
        await page.wait_for_function("() => [...document.querySelectorAll('input')].some(i => i.readOnly && /^BKA-/.test(i.value))")
        assert await number.get_attribute("readonly") is not None
        await page.get_by_label("Tanggal", exact=True).fill("2026-11-02")
        await page.wait_for_function("() => [...document.querySelectorAll('input')].some(i => i.readOnly && i.value.startsWith('BKA-20261102-'))")
        screenshots = Path("/tmp/browser/transaction-number")
        screenshots.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(screenshots / "preview.png"))
        result = await page.evaluate("""async () => {
          const {supabase: db} = await import('/src/integrations/supabase/client.ts');
          const {data: auth} = await db.auth.getUser();
          if (!auth.user) throw new Error('No authenticated user');
          const uid = auth.user.id;
          const ids = [];
          const check = (value, message) => { if (!value) throw new Error(message); };
          const preview = async date => {
            const r = await db.rpc('preview_transaction_number', {_date: date});
            if (r.error) throw r.error;
            return r.data;
          };
          const create = async date => {
            const r = await db.from('transactions').insert({user_id: uid,
              transaction_date: date, transaction_type: 'Tarik Tunai', amount: 1000,
              description: '__automatic_number_integration_test__',
              transaction_number: 'MANUAL-IGNORED'}).select('id,transaction_number').single();
            if (r.error) throw r.error;
            ids.push(r.data.id); return r.data;
          };
          try {
            const initial = await preview('2026-11-02');
            const start = Number(initial.slice(-4));
            const expected = n => 'BKA-20261102-' + String(n).padStart(4,'0');
            const first = await create('2026-11-02');
            check(first.transaction_number === expected(start), 'First number incorrect');
            const second = await create('2026-11-02');
            check(second.transaction_number === expected(start+1), 'Second number incorrect');
            const tomorrowPreview = await preview('2026-11-03');
            const tomorrow = await create('2026-11-03');
            check(tomorrow.transaction_number === tomorrowPreview, 'New date sequence incorrect');
            const backPreview = await preview('2026-11-01');
            const back = await create('2026-11-01');
            check(back.transaction_number === backPreview, 'Backdate sequence incorrect');
            const concurrent = await Promise.all([create('2026-11-02'),create('2026-11-02')]);
            const numbers = concurrent.map(r => r.transaction_number).sort();
            check(numbers[0] === expected(start+2) && numbers[1] === expected(start+3), 'Concurrent duplicate or gap');
            const del = await db.from('transactions').delete().eq('user_id',uid).eq('id',second.id).select('id');
            check(!del.error && del.data.length === 1, 'Delete failed');
            const after = await create('2026-11-02');
            check(after.transaction_number === expected(start+4), 'Deleted number reused');
            const edit = await db.from('transactions').update({amount:2000, transaction_date:'2026-11-03',transaction_number:'CHANGED',number_sequence:1,number_date:'2026-11-03'})
              .eq('id',first.id).eq('user_id',uid).select('transaction_number').single();
            check(!edit.error && edit.data.transaction_number === first.transaction_number, 'Identity changed during edit');
            const forbidden = await db.from('transactions').insert({user_id:'00000000-0000-0000-0000-000000000001',transaction_date:'2026-11-02',transaction_type:'Tarik Tunai',amount:1});
            check(Boolean(forbidden.error), 'Cross-client insert allowed');
            return {first:first.transaction_number, second:second.transaction_number,
              tomorrow:tomorrow.transaction_number, backdate:back.transaction_number,
              concurrent:numbers, afterDelete:after.transaction_number,
              permanentEdit:true, isolation:true};
          } finally {
            if (ids.length) {
              const cleanup = await db.from('transactions').delete().eq('user_id',uid).in('id',ids).select('id');
              if (cleanup.error) throw new Error('Test cleanup failed');
            }
          }
        }""")
        print(json.dumps(result, indent=2))
        await browser.close()

asyncio.run(main())