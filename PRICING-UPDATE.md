# Laceloft budget catalogue update

All 38 seeded products and frontend fallback items now have matching proposed INR prices (₹799–₹2,199).
These are draft selling prices: verify landed cost, margin, taxes and shipping before publication.

No reference/compare-at prices or sale claims are fabricated. Descriptions do not claim brand authenticity or official affiliation. Product photography can still show logos: confirm you have the right to sell the items and that product images accurately represent the goods.

## Update an existing local Django database
Run from `Back-end` with its virtual environment activated:

    python manage.py seed_products

This command updates products matching existing SKUs. It also re-imports product images. Do not run against a production database without a backup. If you have manually edited product details, review changes before reseeding.

Restart your frontend dev server after replacing files. If API product prices still differ, check which backend host is configured in `Front-end/.env.local`.
