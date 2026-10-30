import json

from django import forms
from django.contrib import admin
from django.utils.safestring import mark_safe

from .models import Category, Product, ProductImage, Order, OrderItem, Customer, Coupon


class StockWidget(forms.Textarea):
    """
    Renders Product.stock (a {"7": 3, "8": 0, ...} JSON dict) as a row of
    plain number inputs — one per UK size — instead of a raw JSON textarea,
    which is what Django admin shows for any JSONField by default.

    The real JSONField textarea stays in the DOM (just hidden), so Django's
    normal validation/saving is completely untouched — this widget only
    changes what the *person* sees and interacts with. A small inline
    script keeps the hidden textarea's value in sync with the number
    inputs as they're edited, and again right before the form submits as a
    safety net.

    Shows a fixed 3–13 UK size range rather than only the sizes already in
    this specific product's `sizes` list — covers virtually every adult
    shoe size in one go, and avoids a chicken-and-egg problem where adding
    a brand-new size to `sizes` and setting its stock would otherwise need
    two separate saves (once to add the size, a second time — after
    reloading the page — to actually set its stock).
    """
    SIZE_RANGE = list(range(3, 14))  # UK 3–13

    def render(self, name, value, attrs=None, renderer=None):
        if isinstance(value, str):
            try:
                data = json.loads(value) if value else {}
            except (ValueError, TypeError):
                data = {}
        else:
            data = value or {}

        attrs = dict(attrs or {})
        textarea_id = attrs.get('id') or f'id_{name}'
        attrs['id'] = textarea_id
        # Keep a JS-safe version of the id for the sync function name below
        # (Django ids are normally already underscore-only, but formsets
        # can add hyphens — better safe than a silent JS syntax error).
        js_safe_id = ''.join(c if c.isalnum() else '_' for c in textarea_id)

        rows_html = ''.join(
            f'<div style="display:flex; flex-direction:column; align-items:center; gap:4px;">'
            f'<label style="font-size:11px; color:#888;">UK {size}</label>'
            f'<input type="number" min="0" data-stock-size="{size}" '
            f'value="{int(data.get(str(size), 0) or 0)}" '
            f'style="width:56px; padding:5px; text-align:center;" '
            f'oninput="window.__syncStock_{js_safe_id}()">'
            f'</div>'
            for size in self.SIZE_RANGE
        )

        # The hidden textarea is what actually gets submitted with the form
        # — everything above is just a friendlier way to edit its value.
        hidden_textarea = super().render(name, json.dumps(data), attrs)

        script = f'''<script>
        (function(){{
          function sync(){{
            var wrap = document.getElementById("{textarea_id}_stockwrap");
            var out = {{}};
            wrap.querySelectorAll("[data-stock-size]").forEach(function(inp){{
              var v = parseInt(inp.value, 10) || 0;
              if (v > 0) out[inp.getAttribute("data-stock-size")] = v;
            }});
            document.getElementById("{textarea_id}").value = JSON.stringify(out);
          }}
          window.__syncStock_{js_safe_id} = sync;
          document.addEventListener("DOMContentLoaded", function(){{
            var form = document.getElementById("{textarea_id}").closest("form");
            if (form) form.addEventListener("submit", sync);
          }});
        }})();
        </script>'''

        return mark_safe(
            f'<div id="{textarea_id}_stockwrap" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:8px;">{rows_html}</div>'
            f'<div style="display:none;">{hidden_textarea}</div>'
            f'{script}'
        )


class ProductAdminForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = '__all__'
        widgets = {'stock': StockWidget}


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'user']
    search_fields = ['name', 'phone', 'user__email']


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    list_display = ['name', 'sku', 'brand', 'price', 'gender', 'is_new', 'on_sale', 'in_stock']
    list_filter = ['gender', 'is_new', 'on_sale', 'in_stock', 'categories']
    search_fields = ['name', 'sku', 'brand']
    filter_horizontal = ['categories']
    inlines = [ProductImageInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    search_fields = ['name']


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_percent', 'active', 'min_order_value', 'valid_until', 'created_at']
    list_editable = ['active']
    list_filter = ['active']
    search_fields = ['code']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'sku', 'name', 'size', 'price', 'qty']
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_id', 'customer_name', 'customer_phone', 'city', 'total', 'payment_method', 'payment_status', 'status', 'created_at']
    list_editable = ['status', 'payment_status']
    list_filter = ['status', 'payment_method', 'payment_status', 'created_at', 'state']
    search_fields = ['order_id', 'customer_phone', 'customer_name', 'pincode', 'razorpay_payment_id']
    readonly_fields = [
        'order_id', 'subtotal', 'discount', 'total', 'coupon_code', 'created_at', 'updated_at',
        'payment_method', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
    ]
    fieldsets = (
        (None, {'fields': ('order_id', 'user', 'status')}),
        ('Customer', {'fields': ('customer_name', 'customer_phone', 'customer_email')}),
        ('Shipping address', {'fields': ('address_line1', 'address_line2', 'city', 'state', 'pincode')}),
        ('Totals', {'fields': ('subtotal', 'discount', 'total', 'coupon_code')}),
        # payment_status is editable here (and from the list view) so staff
        # can mark a Cash on Delivery order as "Paid" once the cash is
        # actually collected — it doesn't happen automatically like it
        # does for Razorpay orders.
        ('Payment', {'fields': ('payment_method', 'payment_status', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    inlines = [OrderItemInline]
    # This is the key improvement over the old fake admin.html:
    # changing `status` here (or right from the list view, since it's
    # list_editable) actually updates the order, and the track-order page
    # picks it up immediately.

    def save_model(self, request, obj, form, change):
        # Detect a transition *into* 'cancelled' (from anything else) so we
        # can give the reserved pairs back to stock automatically — covers
        # both the detail-page dropdown and the quick list_editable column,
        # since both route through save_model().
        became_cancelled = (
            change and 'status' in form.changed_data and obj.status == 'cancelled'
        )
        super().save_model(request, obj, form, change)
        if became_cancelled:
            obj.restore_stock()
