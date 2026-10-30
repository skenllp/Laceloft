# Laceloft — Django backend (existing app identifiers preserved)

Real database + API to replace the static `eleven-real-products.js` catalog,
the `localStorage`-only cart/orders, and the fake `admin.html`.

## 1. Setup (run these on your own machine — not in this chat)

```bash
cd eleven-backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser  # your real admin login
```

## 2. Import your existing catalog

Your 38 products (from `eleven-real-products.js`) and their real photos are
already bundled in `shop/seed_data/`. One command loads all of it into the
database:

```bash
python manage.py seed_products
```

Re-running it is safe — it updates existing SKUs instead of duplicating them.

## 3. Run it

```bash
python manage.py runserver
```

- Admin panel: http://127.0.0.1:8000/admin/ — log in with the superuser you
  created. This is the **real** replacement for `admin.html`: add/edit
  products, upload images, and change order status here, and it actually
  persists for every visitor.
- API root: http://127.0.0.1:8000/api/products/

## 4. API endpoints

| Method | URL                  | Who        | What |
|--------|----------------------|------------|------|
| GET    | `/api/products/`     | Public     | Full catalog — replaces `eleven-real-products.js` |
| GET    | `/api/products/<sku>/` | Public   | Single product — what `product.html` looks up |
| POST   | `/api/products/`     | Staff only | Add a product (or just use `/admin/`) |
| POST   | `/api/orders/`       | Public     | Place an order — what `checkout.html` will call |
| GET    | `/api/orders/`       | Staff only | List all orders (order management) |
| PATCH  | `/api/orders/<id>/`  | Staff only | Update order status |
| POST   | `/api/track/`        | Public     | `{order_id, phone}` → order status, for a real "track my order" page |

## 5. Connecting your existing frontend

Minimal changes needed — you don't have to rewrite the HTML pages:

1. **Delete** `eleven-real-products.js` from the site, or leave it as an
   offline fallback.
2. In each page, replace the catalog load with a fetch:
   ```js
   const res = await fetch('http://127.0.0.1:8000/api/products/');
   const ELEVEN_REAL_PRODUCTS = await res.json();
   ```
   The response shape matches your old JS objects field-for-field (`sku`,
   `name`, `price`, `cats`, `sizes`, `isNew`, `images`, etc.) so your existing
   render functions in `shop.js`, `search.js`, `product.js` etc. need little
   to no change.
3. In `checkout.html`'s `orderOnWhatsApp()`, add a `fetch('/api/orders/', {method:'POST', ...})`
   call alongside (or instead of) the WhatsApp message, sending the cart,
   totals, and a phone number.
4. Build a `track.html` page that POSTs to `/api/track/` with an order ID and
   phone number and displays the real status — this is what makes "Track
   order" on the confirmation page actually work.

## 6. Before this goes live

- Change `SECRET_KEY` in `eleven_backend/settings.py` and load it from an
  environment variable instead of hardcoding it.
- Set `DEBUG = False` and put your real domain in `ALLOWED_HOSTS`.
- Swap SQLite for Postgres (`DATABASES` in `settings.py`) — most hosts
  (Railway, Render) give you this as a one-line connection string change.
- Update `CORS_ALLOWED_ORIGINS` to your real frontend domain.
- Host `media/` (product images) on something like S3/Cloudinary instead of
  the local disk, since most hosting platforms wipe local files on deploy.

## Project structure

```
eleven-backend/
  manage.py
  eleven_backend/       # project settings, urls
  shop/
    models.py           # Product, ProductImage, Category, Order, OrderItem
    serializers.py       # API shapes
    views.py             # API endpoints + permissions
    admin.py              # the real admin panel
    seed_data/            # your existing 38 products + real photos, ready to import
    management/commands/seed_products.py
```
