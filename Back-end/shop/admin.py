import json
import urllib.error
import urllib.request

from django import forms
from django.conf import settings
from django.contrib import admin, messages
from django.core.files.storage import default_storage
from django.db.models import Count
from django.shortcuts import redirect
from django.urls import path
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import Category, Product, ProductImage
from .thumbs import thumb_name

admin.site.site_header = 'Laceloft admin'
admin.site.site_title = 'Laceloft admin'
admin.site.index_title = 'Manage the shop'


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
        if not isinstance(data, dict):
            data = {}

        def qty(size):
            try:
                return max(0, int(data.get(str(size), 0) or 0))
            except (TypeError, ValueError):
                return 0

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
            f'value="{qty(size)}" '
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


SIZE_CHOICES = [(s, f'UK {s}') for s in StockWidget.SIZE_RANGE]


class ProductAdminForm(forms.ModelForm):
    # Tick boxes instead of typing a JSON list like [6, 7, 8].
    sizes = forms.TypedMultipleChoiceField(
        choices=SIZE_CHOICES, coerce=int, required=False,
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'size-ticks'}),
        label='Sizes',
        help_text='Sizes this pair comes in. Any size you give stock to below is ticked automatically.',
    )

    class Meta:
        model = Product
        fields = '__all__'
        widgets = {'stock': StockWidget}
        labels = {
            'sku': 'SKU (product code)',
            'price': 'Selling price (₹)',
            'strike': 'Original price (₹)',
            'desc': 'Description',
            'colorway': 'Colour',
            'is_new': 'Show "New" badge',
            'on_sale': 'On sale',
            'in_stock': 'Available to order',
            'stock': 'Stock per size',
        }
        help_texts = {
            'sku': 'Short unique code, e.g. AD-SMB-BRN. It is part of the product link, so it cannot be changed after saving.',
            'brand': 'Leave empty if the brand is not verified — nothing is shown on the site then.',
            'strike': 'Price before discount, shown crossed out. Leave 0 if not on sale.',
            'desc': 'A few lines on material, fit and styling.',
            'is_new': 'Keep this on for only your latest 6–8 pairs, so the badge still means something.',
            'in_stock': 'Untick to show the pair as sold out whatever the stock numbers say.',
            'stock': 'Pairs left in each size. 0 = sold out in that size. Leave all at 0 if you are not tracking stock.',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['brand'].required = False
        # Keep any unusual sizes already saved (e.g. 2 or 14) selectable.
        current = self.instance.sizes if self.instance.pk and isinstance(self.instance.sizes, list) else []
        extra = sorted({int(s) for s in current if str(s).isdigit()} - set(StockWidget.SIZE_RANGE))
        if extra:
            self.fields['sizes'].choices = sorted(SIZE_CHOICES + [(s, f'UK {s}') for s in extra])

    def clean(self):
        data = super().clean()
        stock = data.get('stock') or {}
        stocked = set()
        for size, qty in (stock.items() if isinstance(stock, dict) else []):
            try:
                if int(qty) > 0:
                    stocked.add(int(size))
            except (TypeError, ValueError):
                pass
        data['sizes'] = sorted(set(data.get('sizes') or []) | stocked)
        return data


def thumb_url(image_field):
    name = thumb_name(image_field.name)
    return default_storage.url(name) if default_storage.exists(name) else image_field.url


PREVIEW = '<img src="{}" alt="" style="height:{}px;width:{}px;object-fit:contain;border-radius:10px;background:#f4f0e8">'


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ['preview', 'image', 'order']
    readonly_fields = ['preview']
    verbose_name = 'photo'
    verbose_name_plural = 'Photos (lowest "order" number is shown first)'

    @admin.display(description='Preview')
    def preview(self, obj):
        if not obj.pk or not obj.image:
            return '—'
        return format_html(PREVIEW, thumb_url(obj.image), 72, 72)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    change_list_template = 'admin/shop/product/change_list.html'
    list_display = ['photo', 'name', 'sku', 'price', 'is_new', 'on_sale', 'in_stock', 'stock_summary']
    list_display_links = ['photo', 'name']
    list_editable = ['price', 'is_new', 'on_sale', 'in_stock']
    list_filter = ['is_new', 'on_sale', 'in_stock', 'gender', 'categories']
    search_fields = ['name', 'sku', 'brand', 'colorway']
    filter_horizontal = ['categories']
    inlines = [ProductImageInline]
    list_per_page = 50
    fieldsets = (
        ('Basics', {'fields': ('sku', 'name', 'brand', 'colorway', 'categories', 'gender')}),
        ('Price', {'fields': ('price', 'strike', 'on_sale')}),
        ('Sizes & stock', {'fields': ('sizes', 'stock', 'in_stock')}),
        ('Description & badge', {'fields': ('desc', 'is_new')}),
    )

    class Media:
        css = {'all': ('shop/admin.css',)}

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('images')

    def get_readonly_fields(self, request, obj=None):
        # SKU is the primary key: editing it would save a second product
        # instead of renaming this one, so lock it once the product exists.
        return ['sku'] if obj else []

    @admin.display(description='')
    def photo(self, obj):
        first = next(iter(obj.images.all()), None)
        return format_html(PREVIEW, thumb_url(first.image), 48, 48) if first else '—'

    @admin.display(description='Stock')
    def stock_summary(self, obj):
        if not obj.stock:
            return 'not tracked'
        n = len(obj.sizes_in_stock())
        return f'{n} size{"" if n == 1 else "s"}' if n else 'sold out'

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        # After a form error the browser silently forgets the chosen photo, so
        # a product can end up saved without one. Say so, loudly. (Query the table:
        # the prefetched `product.images` is stale and would still look empty.)
        product = form.instance
        if not ProductImage.objects.filter(product=product).exists():
            messages.warning(
                request,
                f'"{product.name}" has no photos yet, so the shop shows a grey placeholder. '
                'Open it again, choose a photo under "Photos", and save. '
                '(If the form showed an error before, the browser clears the chosen photo — pick it again.)',
            )

    # ---- "Publish to website" button (templates/admin/shop/product/change_list.html) ----
    def get_urls(self):
        return [
            path('publish/', self.admin_site.admin_view(self.publish_view), name='shop_product_publish'),
        ] + super().get_urls()

    def publish_view(self, request):
        """Rebuilds the storefront through its Render deploy hook, so new or
        renamed products get WhatsApp/Google link previews and a sitemap
        entry. Prices, stock and photos are live without this."""
        if request.method != 'POST':
            return redirect('admin:shop_product_changelist')
        hook = settings.FRONTEND_DEPLOY_HOOK
        if not hook:
            messages.warning(request, 'Publishing is not set up yet: add FRONTEND_DEPLOY_HOOK to the backend environment on Render.')
        else:
            try:
                with urllib.request.urlopen(urllib.request.Request(hook, method='POST'), timeout=15):
                    pass
                messages.success(request, 'Website update started. Link previews and the sitemap refresh in about 2 minutes.')
            except (urllib.error.URLError, OSError) as exc:
                messages.error(request, f'Could not start the website update: {exc}')
        return redirect('admin:shop_product_changelist')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'product_count']
    search_fields = ['name']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(n=Count('products'))

    @admin.display(description='Products', ordering='n')
    def product_count(self, obj):
        return obj.n
