from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.views.static import serve

from shop.dashboard import sales_dashboard

urlpatterns = [
    # Must come before 'admin/' below — Django tries patterns in order, and
    # once 'admin/' matches as a prefix it hands off entirely to admin's own
    # urlconf, which doesn't know about this path and would 404 rather than
    # falling through to this line if it were listed after.
    path('admin/dashboard/', sales_dashboard, name='sales-dashboard'),
    path('admin/', admin.site.urls),
    path('api/', include('shop.urls')),
]

# Serve product photos (media files) regardless of DEBUG.
#
# NOTE: Django's usual `django.conf.urls.static.static()` helper looks like
# it does this, but internally it ALWAYS returns an empty list when
# DEBUG=False — no matter how you call it. That's why the previous fix
# (just removing the `if settings.DEBUG:` around it) didn't actually work.
# Calling the underlying view directly, like this, bypasses that check.
#
# This isn't the most efficient way to serve images at real scale (a CDN
# like Cloudinary/S3 would be better long-term), but for this store's size
# it's simple and works.
urlpatterns += [
    path('media/<path:path>', serve, {'document_root': settings.MEDIA_ROOT}),
]
