from rest_framework import viewsets, permissions

from .models import Product, Order
from .serializers import ProductSerializer, OrderSerializer


class IsAdminOrReadOnly(permissions.BasePermission):
    """Anyone can read the catalog; only staff can add/edit/delete products."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class ProductViewSet(viewsets.ModelViewSet):
    """
    GET  /api/products/          -> full catalog
    GET  /api/products/<sku>/    -> single product
    POST/PUT/DELETE              -> staff only, used by the admin panel
    """
    queryset = Product.objects.prefetch_related('images', 'categories').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'sku'

    def get_serializer_context(self):
        return {'request': self.request}


class OrderViewSet(viewsets.ModelViewSet):
    """
    Staff-only order log — customers buy via WhatsApp, so orders are no
    longer created through this API. Staff can still record/track a sale
    here or in /admin/ once the WhatsApp conversation results in a sale.
    """
    queryset = Order.objects.prefetch_related('items').all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]
