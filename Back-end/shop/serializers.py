from django.core.files.storage import default_storage
from rest_framework import serializers
from .models import Product, ProductImage
from .thumbs import thumb_name


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['image', 'order']


class ProductSerializer(serializers.ModelSerializer):
    brand = serializers.SerializerMethodField()
    # Shaped to match the old eleven-real-products.js objects as closely as
    # possible, so the existing frontend JS needs minimal changes.
    cats = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    # Same order as `images`: small WebP copies for grids (see thumbs.py),
    # or the original photo where no thumb exists yet.
    thumbs = serializers.SerializerMethodField()
    isNew = serializers.BooleanField(source='is_new')
    onSale = serializers.BooleanField(source='on_sale')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    # True only if the manual override is on AND at least one size actually
    # has stock left — so this flips to false automatically once the last
    # pair sells, instead of needing someone to remember to toggle it.
    inStock = serializers.SerializerMethodField()
    stockTracked = serializers.SerializerMethodField()
    # Which sizes can actually be bought right now (stock > 0). `sizes`
    # stays as the full "sizes this shoe comes in" list so nothing that
    # already reads it breaks; the frontend uses sizesInStock to grey
    # out/disable the sold-out ones. See Product.sizes_in_stock() in models.py.
    sizesInStock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'sku', 'name', 'brand', 'price', 'strike',
            'cats', 'gender', 'sizes', 'sizesInStock', 'stockTracked', 'isNew', 'onSale', 'inStock',
            'images', 'thumbs', 'colorway', 'desc', 'createdAt',
        ]

    def get_brand(self, obj):
        return 'Laceloft' if (obj.brand or '').strip().casefold() == 'eleven' else obj.brand

    def get_cats(self, obj):
        # .all() (not values_list) so this uses the view's prefetch instead
        # of running one extra query per product.
        return [c.name for c in obj.categories.all()]

    def get_gender(self, obj):
        return [obj.gender]

    def get_stockTracked(self, obj):
        # A freshly seeded catalogue may not have per-size inventory entered yet.
        return bool(obj.stock)

    def get_inStock(self, obj):
        if not obj.in_stock:
            return False
        # None = ask the seller to confirm, NOT a claim of availability.
        if not obj.stock:
            return None
        return len(obj.sizes_in_stock()) > 0

    def get_sizesInStock(self, obj):
        return obj.sizes_in_stock() if obj.stock else []

    def get_images(self, obj):
        request = self.context.get('request')
        urls = []
        for img in obj.images.all():
            url = img.image.url
            urls.append(request.build_absolute_uri(url) if request else url)
        return urls

    def get_thumbs(self, obj):
        request = self.context.get('request')
        urls = []
        for img in obj.images.all():
            name = thumb_name(img.image.name)
            url = default_storage.url(name) if default_storage.exists(name) else img.image.url
            urls.append(request.build_absolute_uri(url) if request else url)
        return urls
