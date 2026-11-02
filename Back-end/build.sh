#!/usr/bin/env bash
# Render runs this as the "Build Command" for the backend web service.
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Free-tier Render has no Shell access, so create the superuser and load
# products right here during the build instead. Uses env vars:
#   DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_PASSWORD
# `|| true` because this errors out (harmlessly) once the user already exists.
python manage.py createsuperuser --noinput || true

# Safe to run every deploy: only adds seed products that don't exist yet
# (admin edits are kept) and re-copies the seed photos, which Render's
# disk loses on each deploy. Use `seed_products --update` to overwrite.
python manage.py seed_products
