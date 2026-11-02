# Laceloft — complete website source

This is the integrated Laceloft rebrand of the ELEVEN footwear project. It combines the **existing Django backend, seed catalogue, product photography, and media files** with the Laceloft React storefront and animated hero.

## Branding and shopping

- Brand: **Laceloft** · ivory `#F4F0E8`, espresso `#302A25`, muted olive `#777F65`
- Currency: **INR (₹)**; existing catalogue prices were not converted or altered.
- WhatsApp: **+971 56 434 5294** (`971564345294` in source).
- Homepage hero: a GSAP-based rounded floating-sneaker carousel with four curated existing catalogue SKUs and matching, extracted PNG artwork in `Front-end/public/images/hero/`.
- WhatsApp-first checkout: a product + selected UK size + quantity opens a prefilled WhatsApp enquiry. No payment or order-completion claim is made by simply opening WhatsApp.
- Original Django model/migration structure, SKU values, stock records, and all existing media assets remain intact.
- Historical stock records that do not have per-size inventory configured are treated as **availability unconfirmed**; the site permits a WhatsApp enquiry, not an asserted purchase of in-stock goods.
- When the API is unavailable, the frontend can show its static or locally cached catalogue **with a warning** to confirm current prices and availability.

## Folder layout

- `Front-end/` — React, Vite, Tailwind, GSAP, source, frontend product photographs, PWA assets and existing Android project.
- `Back-end/` — Django REST API, original migrations, product seed data/images, existing backend product media.

## Start a local development copy

**1. Start Django (Python 3.12+):**

```bash
cd Back-end
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
# Copy .env.example to your own environment settings and load them into the shell.
# On a BRAND-NEW database only:
python manage.py migrate
python manage.py seed_products
python manage.py runserver
```

`seed_products` only adds products that don't exist yet and keeps any edits made in `/admin/`. Use `seed_products --update` to overwrite existing seed products, and never `--clear` on a live database. Run `python manage.py test` for the backend tests.

**2. Start React (Node 20+):**

```bash
cd Front-end
npm ci
# Copy .env.example to .env.local and set VITE_API_BASE to http://127.0.0.1:8000/api
npm run dev
```

Open `http://localhost:5173`.

**3. Build frontend:**

```bash
cd Front-end
npm run build
```

Output will be in `Front-end/dist/`. Use an SPA-compatible hosting rewrite to `/index.html` for frontend routes.

## Required environment configuration before launching

### React (`Front-end/.env.local` / hosting provider)

- `VITE_API_BASE` — real Django API address, e.g. `https://your-api-host/api`.
- `VITE_WHATSAPP_NUMBER=971564345294`
- `VITE_SITE_URL` — your deployed Laceloft domain, if used.

The frontend defaults to `https://laceloftbackend.onrender.com/api`. Set `VITE_API_BASE` if the Django backend is hosted elsewhere. The build also writes `sitemap.xml`, `robots.txt` and a share-preview page per product (`scripts/postbuild.mjs`), so redeploy the frontend after adding products for their WhatsApp/Google previews to appear.

### Django (Render environment or your process manager)

- `SECRET_KEY` — strong secret; the app refuses to start on Render without it.
- `DEBUG=False` in production.
- `ALLOWED_HOSTS` — explicit real backend hostnames.
- `CORS_ALLOWED_ORIGINS` — explicit deployed frontend HTTPS origin.
- `DATABASE_URL` — production Postgres; do not silently replace your current production DB.
- Ensure the `media/` directory is persisted or moved to suitable object storage; rebuilding an ephemeral server filesystem will otherwise lose uploads.
- After populating products in Django admin, set actual per-size stock values to enable confirmed stock badges. Until then, the site asks customers to confirm availability.

**Deploy the updated Django code as well as the React build** if you want the new `stockTracked`/unknown-availability behaviour. Using the previous backend can leave untracked products marked sold out.

## What was changed in this integration

1. Merged the modified files into the full original project with every catalogue asset restored.
2. Added 4 transparent PNG hero artworks extracted from the existing product imagery; see `src/data/heroAssets.js` for SKU mapping. These are automatically generated cutouts, so a manually retouched product photo can improve edge quality later.
3. Curated four live catalogue SKUs for the hero in `src/lib/catalog.js`. If a SKU is missing, another product is used.
4. Fixed the inherited `Back-end/requirements.txt` UTF-16 file encoding to UTF-8 for pip.
5. Fixed stale PWA/API host caching rules so the configured API URL determines the API origin.
6. Added an offline-catalogue warning and fixed product-image error recovery when photo URLs change.
7. Preserved legacy own-brand product records while displaying the new Laceloft brand through Django serialization; relabelled 6 own-brand seed entries.
8. Updated visible Android app title, native launcher icons and native splash screens. The existing `com.elevenbrand.app` Android application ID remains unchanged intentionally, to avoid unintentionally creating a distinct Android app identity; change it separately if you plan a *new* Play Store application. Rebuild native APK/AAB after the next Capacitor sync.
9. Removed the unused duplicate `src/Layout.jsx` and expired promotion data/video (not used by the redesigned site).

## Verification and limitations

- **Completed here:** static Python compilation, Node syntax checks for plain `.js` modules/configs, local relative import path checks, product-photo path checks, native XML/PNG validation, 38 distinct seed SKUs, 101 referenced seed catalogue images.
- **Not completed here:** full `npm ci`/Vite production build and live Django browser/API test. The current execution environment cannot access the public npm registry and does not have Django installed. Run the setup/build commands in a normal machine or CI environment before deploying.
- PNG hero cutouts are based on existing photography; extracted edges may require manual retouching for campaign-grade imagery.
- This ZIP deliberately includes source assets, **not** generated `node_modules` or a build artifact. Dependencies are installed using the included lockfile.
- The backend is products-only. The old checkout, accounts, orders, coupons and payment code (backend and frontend) was removed; migration `0010` drops those tables.
- Review shipping, returns and authenticity policies before publishing; no unverified legal/business policy statements were invented.
