# Laceloft — footwear storefront

Redesigned from the original ELEVEN project. The API is a Django + DRF backend in `Back-end/`; the React/Vite/Tailwind storefront in `Front-end/` is fully re-skinned as Laceloft.

## Run locally
```bash
# Backend
cd Back-end && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python manage.py migrate && python manage.py seed_products && python manage.py runserver

# Frontend
cd Front-end && npm install
echo "VITE_API_BASE=http://127.0.0.1:8000/api" > .env.local
npm run dev
```

## Configuration (`Front-end/.env`)
| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE` | Django API base URL | existing deployed API |
| `VITE_WHATSAPP_NUMBER` | WhatsApp number, digits only | `971564345294` |
| `VITE_SITE_URL` | Public site origin | current origin |

The WhatsApp number lives only in `src/lib/config.js`; every link reads it from there.

## Where things are
- Brand tokens: `tailwind.config.js`, `src/index.css`, wordmark `src/components/Logo.jsx`, `public/favicon.svg`
- Animated hero (GSAP): `src/components/HeroCarousel.jsx` — optional transparent hero art via `src/data/heroAssets.js` (+ `public/images/hero/`)
- WhatsApp ordering: `src/lib/whatsapp.js`, used by `src/pages/Product.jsx`
- Cart/checkout/auth pages remain in `src/pages` but are **not routed**; the live storefront is WhatsApp-first.

## Merge notes
This ZIP was source-only. Copy your original `Front-end/public/images` (product photos, `hero-bg.mp4` is no longer used) and backend `media/` back in. Newly generated `public/icons/*`, `apple-touch-icon.png`, `og-image.png` replace the old ELEVEN artwork.
