import random
import re
import string

from django.conf import settings
from django.db import models
from django.utils import timezone


class Customer(models.Model):
    """Extra profile info for a registered shopper, on top of Django's
    built-in User (which handles email/password/auth). Created by
    /api/auth/register/ — see views.py."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='customer')
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, blank=True)

    # Server-side cart/wishlist for logged-in shoppers, so both persist
    # across devices/browsers instead of living only in localStorage.
    # Shape mirrors the frontend exactly:
    #   cart:      [{sku, name, size, price, qty, color?, shape?}, ...]
    #   wishlist:  ['SKU-1', 'SKU-2', ...]
    cart = models.JSONField(default=list, blank=True)
    wishlist = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f'{self.name} <{self.user.email}>'


class Category(models.Model):
    """Tags like 'Running', 'Limited Edition', 'Collab' — matches the
    `cats` array on each product in the old eleven-real-products.js file."""
    name = models.CharField(max_length=60, unique=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Coupon(models.Model):
    """
    Real discount codes, managed from /admin/ — replaces the old hardcoded
    'BUILT10' check that used to live entirely in cart.js. The frontend now
    calls /api/coupons/validate/ to check a code and preview the discount,
    but the *authoritative* check happens again in
    OrderCreateSerializer.create() (serializers.py) at the moment an order
    is actually placed — the frontend's number is only ever a preview,
    never trusted for what gets charged.
    """
    code = models.CharField(max_length=30, unique=True, help_text='Case-insensitive, e.g. BUILT10')
    discount_percent = models.PositiveIntegerField(help_text='e.g. 10 for 10% off')
    active = models.BooleanField(default=True)
    # Optional constraints — leave blank for "no limit".
    min_order_value = models.PositiveIntegerField(null=True, blank=True, help_text='Minimum subtotal (INR) required to use this code')
    valid_until = models.DateTimeField(null=True, blank=True, help_text='Leave blank for no expiry')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.code} ({self.discount_percent}% off)'

    def is_valid_for(self, subtotal):
        """Returns (True, '') or (False, 'reason') — used by both the
        preview endpoint and the real order-creation check, so the two
        can never disagree about whether a code is usable."""
        if not self.active:
            return False, 'This code is no longer active.'
        if self.valid_until and timezone.now() > self.valid_until:
            return False, 'This code has expired.'
        if self.min_order_value and subtotal < self.min_order_value:
            return False, f'This code needs a minimum order of \u20b9{self.min_order_value:,}.'
        return True, ''


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
    # if it's still listed in `sizes` — see get_sizes_in_stock() below and
    # OrderViewSet.create() in views.py, which validates + decrements this
    # atomically so two simultaneous orders can't both grab the last pair.
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
        return [s for s in self.sizes if int(self.stock.get(str(s), 0)) > 0]


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
    digits = ''.join(random.choices(string.digits, k=5))
    return f'ELV-{digits}'


class Order(models.Model):
    STATUS_CHOICES = [
        ('placed', 'Order placed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('out_for_delivery', 'Out for delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('razorpay', 'Prepaid (Razorpay)'),
        ('cod', 'Cash on Delivery'),
    ]

    order_id = models.CharField(max_length=20, unique=True, default=generate_order_id, editable=False)

    # Null for guest checkouts; set when a logged-in customer places the order,
    # so /api/my-orders/ can look orders up without relying on phone number.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='orders',
    )

    customer_name = models.CharField(max_length=120, blank=True)
    customer_phone = models.CharField(max_length=20)
    customer_email = models.EmailField(blank=True)

    # Shipping address — required for every new order placed through
    # checkout.html now that orders are fulfilled from the database instead
    # of over WhatsApp. Kept blank=True at the model level so older orders
    # placed before this field existed don't break admin/serialization.
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)

    subtotal = models.PositiveIntegerField(default=0)
    discount = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    coupon_code = models.CharField(max_length=40, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='placed')

    # 'razorpay' (pay online now) or 'cod' (pay cash when it arrives). COD
    # orders skip Razorpay entirely — see OrderViewSet.create in views.py —
    # and stay payment_status='pending' until marked paid manually by staff
    # once cash is collected.
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='razorpay')

    # Razorpay integration. The order row is created up-front (with
    # payment_status='pending') so we have an order_id/receipt to hand
    # Razorpay when creating its order; it only flips to 'paid' after the
    # signature is verified server-side in verify_payment_view — never
    # trust the browser's word alone that a payment succeeded.
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    razorpay_order_id = models.CharField(max_length=64, blank=True)
    razorpay_payment_id = models.CharField(max_length=64, blank=True)
    razorpay_signature = models.CharField(max_length=128, blank=True)

    # Set once restore_stock() has run for this order, so a cancelled order
    # can never have its stock "returned" twice (e.g. if cancelled more
    # than once, or cancelled after an earlier failed-payment cleanup).
    stock_restored = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.order_id

    def restore_stock(self):
        """Adds each line item's qty back to Product.stock — used when an
        order never actually completes (Razorpay order creation failed
        right after stock was reserved) or is cancelled after being placed.
        Safe to call more than once; only actually restores stock the first
        time (see stock_restored above)."""
        if self.stock_restored:
            return
        for item in self.items.select_related('product'):
            product = item.product
            if product is None:
                continue
            size_key = re.search(r'[\d.]+', str(item.size))
            size_key = size_key.group(0) if size_key else str(item.size).strip()
            product.stock[size_key] = int(product.stock.get(size_key, 0)) + item.qty
            product.save(update_fields=['stock'])
        self.stock_restored = True
        self.save(update_fields=['stock_restored'])


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    # Nullable + snapshot fields below: if a product is later deleted or its
    # price changes, this row still shows exactly what the customer bought.
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL)

    sku = models.CharField(max_length=40)
    name = models.CharField(max_length=200)
    size = models.CharField(max_length=10)
    price = models.PositiveIntegerField(help_text='Price at time of order, in ₹')
    qty = models.PositiveSmallIntegerField(default=1)

    def __str__(self):
        return f'{self.name} ({self.size}) x{self.qty}'
