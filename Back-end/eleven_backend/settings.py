"""
Django settings for the Laceloft backend.
Keep this simple to start — swap SQLite for Postgres and tighten
security settings before going to production (see README).
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ---- SECURITY -------------------------------------------------------------
# In production (Render) these come from environment variables you set in
# the Render dashboard. Locally, if you don't set them, these fallbacks let
# `runserver` keep working exactly as before.
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-CHANGE-ME-before-deploying')

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = []
# Render sets this automatically to your service's *.onrender.com hostname.
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
# Comma-separated list for your own domain(s), e.g. "api.yoursite.com".
ALLOWED_HOSTS += [h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['*']  # local dev only — always set ALLOWED_HOSTS explicitly in production

# ---- HTTPS enforcement (production only) -----------------------------
# Gated on RENDER_EXTERNAL_HOSTNAME rather than "not DEBUG" so it's tied
# to "are we actually running behind Render's HTTPS-terminating proxy"
# rather than just the DEBUG flag — this way flipping DEBUG locally never
# accidentally triggers an HTTPS redirect loop against plain http://127.0.0.1.
IS_PRODUCTION = bool(RENDER_EXTERNAL_HOSTNAME)
if IS_PRODUCTION:
    # The fallback key above is public (it's in this file), so anyone could
    # forge admin session cookies with it. Refuse to start rather than run
    # production on it — set SECRET_KEY in the Render dashboard.
    if 'SECRET_KEY' not in os.environ:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured('SECRET_KEY environment variable must be set in production.')
    # Render terminates TLS in front of the app and forwards over plain
    # HTTP internally, adding this header so Django can tell the original
    # request was HTTPS. Only trust this header when we know we're
    # actually behind Render's proxy (IS_PRODUCTION) — trusting it
    # unconditionally would let anyone spoof "https" by just setting the
    # header themselves against a non-proxied server.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year, standard once you're confident HTTPS is solid
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# ---- APPS -------------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',

    'shop',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # serves static files in production
    'corsheaders.middleware.CorsMiddleware',   # must be high in the list
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'eleven_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'eleven_backend.wsgi.application'

# ---- DATABASE -------------------------------------------------------------
# SQLite locally (zero setup). On Render, set the DATABASE_URL environment
# variable to your managed Postgres instance's "Internal Database URL" and
# this switches over automatically — no code change needed.
import dj_database_url

# `or` rather than a default: Render lets you save DATABASE_URL as an empty
# string, and dj_database_url treats that as "configured but blank", which
# leaves Django with no database engine and breaks `migrate`.
DATABASES = {
    'default': dj_database_url.parse(
        os.environ.get('DATABASE_URL') or f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---- MEDIA (product images) ------------------------------------------------
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ---- DJANGO REST FRAMEWORK -------------------------------------------------
REST_FRAMEWORK = {
    # The API is read-only (see shop/views.py); staff manage products in
    # /admin/, which uses Django's own session login.
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',  # lets staff use the browsable API
    ],
    # General anti-abuse limit on every endpoint.
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
}

# ---- CORS -------------------------------------------------------------
# Allow your frontend (static site) to call this API from the browser.
# Add your real domain via the CORS_ALLOWED_ORIGINS env var on Render,
# e.g. "https://your-laceloft-domain.com"
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
] + [o.strip() for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()]
# While developing locally you can use this instead of the allowlist above:
# CORS_ALLOW_ALL_ORIGINS = True
