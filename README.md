# Pri&Jo Auto Garage

A mobile-friendly garage operations front end with dashboard, vehicles, expenses, petty cash, invoices, gate passes, printing, and sharing.

## Files
- `index.html` — app shell
- `style.css` — responsive dashboard styling
- `app.js` — Supabase reads/writes and document actions
- `manifest.json` — installable app metadata

## Important database note
This build is configured to use the same Supabase project and tables as the existing Garage Operations Pro (`vehicles`, `expenses`, `petty_cash`, `invoices`, `gate_passes`, and optional `requisitions`). Therefore, records are shared between the two sites, and edits/deletions in either site can affect the same records. The website/repository files remain separate. If you want the two apps to use completely separate records, create separate Pri&Jo tables and change the table names in `app.js`.

The database's actual columns and Row Level Security policies must match the fields in `app.js`. If a table uses different column names, update its field list before relying on it for live records. The Supabase publishable key is intended for client-side use, but write access should be protected by appropriate Supabase RLS policies.

## Publish with GitHub Pages
1. Upload all four files to the root of `Josephine-Junior-dev/Pri-Jo-auto-garage`.
2. In Settings → Pages, select `Deploy from a branch`, branch `main`, folder `/ (root)`, and Save.
3. Wait for GitHub Pages to publish the site.
