# Laceloft — Django backend

A small product catalogue: you add and edit products in the Django admin,
and the storefront reads them from a read-only JSON API. Orders happen on
WhatsApp, so there are no orders, accounts or payments here.

## Setup

```bash
cd Back-end
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser  # your admin login
python manage.py seed_products    # optional: load the 38 starter products
python manage.py runserver
```

- Admin (add/edit products, upload photos, set stock per size): http://127.0.0.1:8000/admin/
- API: http://127.0.0.1:8000/api/products/

## API

| Method | URL                    | What                      |
|--------|------------------------|---------------------------|
| GET    | `/api/products/`       | Full catalogue            |
| GET    | `/api/products/<sku>/` | One product               |

The API is read-only. Everything else returns 404/405.

## Seeding

`python manage.py seed_products` only **adds** seed products that don't exist
yet, so edits you make in `/admin/` are kept. It also re-copies the seed photos
(Render's disk is wiped on each deploy) under fixed file names, so repeated runs
never pile up duplicates.

- `--update` overwrites existing seed products' details and photos with `products.json`.
- `--clear` deletes all products first. Never use it on live data.

## Tests

```bash
python manage.py test
```

## Production (Render)

Set these environment variables: `SECRET_KEY` (the app refuses to start on
Render without it), `DATABASE_URL` (Postgres), `ALLOWED_HOSTS`,
`CORS_ALLOWED_ORIGINS` (your frontend's https origin), `DEBUG=False`.

Photos you upload in `/admin/` live on local disk, which Render wipes on every
deploy. Use a persistent disk or move `media/` to S3/Cloudinary, otherwise
uploaded photos are lost on the next deploy (seed photos are restored
automatically).

## Layout

```
eleven_backend/   settings, urls
shop/
  models.py       Product, ProductImage, Category
  serializers.py  API shape
  views.py        read-only product API
  admin.py        admin panel (per-size stock editor)
  seed_data/      starter products + photos
  tests.py
```
