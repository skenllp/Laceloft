import json
from pathlib import Path

from django.contrib.admin.models import DELETION, LogEntry
from django.contrib.contenttypes.models import ContentType
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from shop.models import Product, ProductImage, Category

SEED_DIR = Path(__file__).resolve().parent.parent.parent / 'seed_data'
PRODUCTS_JSON = SEED_DIR / 'products.json'
IMAGES_DIR = SEED_DIR / 'product_images'


class Command(BaseCommand):
    help = (
        'Imports the seed catalogue (seed_data/products.json) and its photos. '
        'By default only ADDS products that do not exist yet, so edits made in '
        '/admin/ are kept; existing products only get missing photos restored. '
        'Use --update to overwrite existing products with the seed data.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--update', action='store_true',
            help='Overwrite details, categories and photos of existing seed SKUs '
                 'with the values in products.json (discards admin edits to them).',
        )
        parser.add_argument(
            '--clear', action='store_true',
            help='Delete all existing products before importing.',
        )

    def handle(self, *args, **options):
        if not PRODUCTS_JSON.exists():
            self.stderr.write(self.style.ERROR(f'Could not find {PRODUCTS_JSON}'))
            return

        if options['clear']:
            Product.objects.all().delete()
            self.stdout.write('Cleared existing products.')

        data = json.loads(PRODUCTS_JSON.read_text(encoding='utf-8'))
        created = updated = repaired = skipped = 0
        # A product someone deleted in /admin/ stays deleted: the admin's own
        # log records it, and this runs on every deploy.
        removed = set(LogEntry.objects.filter(
            content_type=ContentType.objects.get_for_model(Product), action_flag=DELETION,
        ).values_list('object_id', flat=True))
        existing = set(Product.objects.values_list('sku', flat=True))

        for item in data:
            if item['sku'] in removed and item['sku'] not in existing:
                skipped += 1
                continue
            fields = {
                'name': item['name'],
                'brand': item['brand'],
                'price': item['price'],
                'strike': item.get('strike', 0),
                'gender': (item.get('gender') or ['Unisex'])[0],
                'sizes': item.get('sizes', []),
                'stock': item.get('stock', {}),
                'colorway': item.get('colorway', ''),
                'desc': item.get('desc', ''),
                'is_new': item.get('isNew', False),
                'on_sale': item.get('onSale', False),
                'in_stock': item.get('inStock', True),
            }
            product, was_created = Product.objects.get_or_create(sku=item['sku'], defaults=fields)

            # Always (re)write the seed photos to fixed file names. Render's
            # disk is wiped on every deploy, so this is what puts them back —
            # and fixed names mean re-running never piles up duplicate copies.
            seed_names = self.write_seed_images(product.sku, item.get('images', []))

            if was_created or options['update']:
                if not was_created:
                    for key, value in fields.items():
                        setattr(product, key, value)
                    product.save()
                    updated += 1
                else:
                    created += 1
                product.categories.set(
                    Category.objects.get_or_create(name=name)[0] for name in item.get('cats', [])
                )
                self.replace_images(product, seed_names)
            elif self.drop_missing_images(product) and not product.images.exists():
                # Every photo row pointed at a file that no longer exists
                # (e.g. an upload lost when Render wiped the disk) — fall
                # back to the seed photos rather than showing none.
                self.replace_images(product, seed_names)
                repaired += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created} created, {updated} updated, {repaired} had missing photos restored, '
            f'{len(data) - created - updated - skipped} existing products left as they are, '
            f'{skipped} deleted in the admin and not restored.'
        ))

    def write_seed_images(self, sku, rel_paths):
        """Copies each seed photo to media/products/<SKU>_<file>, overwriting
        any previous copy. Returns the storage names, in display order."""
        names = []
        for rel_path in rel_paths:
            # rel_path looks like 'images/products/sb-dunk-stussy/1.jpeg'
            src = IMAGES_DIR / Path(rel_path).parent.name / Path(rel_path).name
            if not src.exists():
                self.stdout.write(self.style.WARNING(f'  missing image file: {src}'))
                continue
            name = f'products/{sku}_{Path(rel_path).name}'
            if default_storage.exists(name):
                default_storage.delete(name)
            with open(src, 'rb') as fh:
                default_storage.save(name, File(fh))
            names.append(name)
        return names

    def replace_images(self, product, names):
        product.images.all().delete()
        ProductImage.objects.bulk_create(
            ProductImage(product=product, image=name, order=i) for i, name in enumerate(names)
        )

    def drop_missing_images(self, product):
        """Deletes image rows whose file is gone. Returns True if any were."""
        missing = [img.pk for img in product.images.all() if not default_storage.exists(img.image.name)]
        product.images.filter(pk__in=missing).delete()
        return bool(missing)
