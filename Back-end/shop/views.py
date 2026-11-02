from rest_framework import viewsets

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/products/          -> full catalog
    GET  /api/products/<sku>/    -> single product

    Read-only: products are added and edited in /admin/.
    """
    queryset = Product.objects.prefetch_related('images', 'categories').all()
    serializer_class = ProductSerializer
    lookup_field = 'sku'
