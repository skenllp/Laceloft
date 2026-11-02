from django.db import models


class Category(models.Model):
    """Tags like 'Running', 'Limited Edition', 'Collab' — matches the
    `cats` array on each product in the old eleven-real-products.js file."""
    name = models.CharField(max_length=60, unique=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    GENDER_CHOICES = [
        ('Men', 'Men'),
        ('Women', 'Women'),
        ('Unisex', 'Unisex'),
    ]

    sku = models.CharField(max_length=40, unique=True, primary_key=True)
    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=120)

    price = models.PositiveIntegerField(help_text='Current price in ₹')
    strike = models.PositiveIntegerField(
        default=0, help_text='Original/MRP price in ₹, 0 if not on sale'
    )

    categories = models.ManyToManyField(Category, related_name='products', blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='Unisex')

    # Stored as a JSON list of ints, e.g. [7, 8, 9, 10] — mirrors the frontend shape exactly
    sizes = models.JSONField(default=list, help_text='List of available UK sizes, e.g. [7, 8, 9, 10]')

    # How many pairs are left *per size*, e.g. {"7": 3, "8": 0, "9": 5}.
    # Keys are strings (JSON requires string keys) matching entries in
    # `sizes`. A size with 0 (or missing) stock is treated as sold out even
    # if it's still listed in `sizes` — see sizes_in_stock() below.
    stock = models.JSONField(default=dict, blank=True, help_text='Stock per size, e.g. {"7": 3, "8": 0, "9": 5}')

    colorway = models.CharField(max_length=120, blank=True)
    desc = models.TextField(blank=True)

    is_new = models.BooleanField(default=False)
    on_sale = models.BooleanField(default=False)
    # Manual override to hide/show a product regardless of per-size stock
    # (e.g. discontinuing something that still has a few pairs left).
    # Actual sellability of a given size is still governed by `stock`.
    in_stock = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.sku})'

    def sizes_in_stock(self):
        """Sizes with 1+ pairs actually left, in the same order as `sizes`.
        Used by the API so the frontend can disable sold-out sizes instead
        of just trusting the static `sizes` list, which only says a size
        exists for this product at all — not that any are left."""
        stock = self.stock if isinstance(self.stock, dict) else {}

        def qty(size):
            # A bad value (e.g. "" or "3 pairs" typed via the API) counts as
            # 0 rather than crashing the whole catalogue response.
            try:
                return int(stock.get(str(size), 0))
            except (TypeError, ValueError):
                return 0

        return [s for s in (self.sizes or []) if qty(s) > 0]


class ProductImage(models.Model):
    """Multiple images per product, in display order — replaces the
    hardcoded images[] array from the old JS catalog."""
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/')
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.product.sku} — image {self.order}'


def generate_order_id():
    """No longer used — the Order model was removed — but migration
    0001_initial still references it by import path, so it must exist."""
    import random
    return 'ELV-' + ''.join(random.choices('0123456789', k=5))
