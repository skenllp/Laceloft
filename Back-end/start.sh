#!/usr/bin/env bash
# Render "Start Command" for the backend: bash start.sh
# Runs when the persistent disk is mounted, then starts the server.
set -o errexit

# Restores any seed photo missing from the disk; admin uploads are untouched.
python manage.py seed_products
python manage.py make_thumbs

exec gunicorn eleven_backend.wsgi:application
