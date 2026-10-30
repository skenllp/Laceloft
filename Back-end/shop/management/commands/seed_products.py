import json
import shutil
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from django.conf import settings

from shop.models import Product, ProductImage, Category

SEED_DIR = Path(__file__).resolve().parent.parent.parent / 'seed_data'
PRODUCTS_JSON = SEED_DIR / 'products.json'
IMAGES_DIR = SEED_DIR / 'product_images'


class Command(BaseCommand):
    help = (
        'Imports your existing product catalog (the old eleven-real-products.js, '
        'already converted to JSON) plus its real product photos into the database. '
        'Safe to re-run — existing SKUs are updated, not duplicated.'
    )

    def add_arguments(self, parser):
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
        created, updated = 0, 0

        for item in data:
            product, was_created = Product.objects.update_or_create(
                sku=item['sku'],
                defaults={
                    'name': item['name'],
                    'brand': item['brand'],
                    'price': item['price'],
                    'strike': item.get('strike', 0),
                    'gender': (item.get('gender') or ['Unisex'])[0],
                    'sizes': item.get('sizes', []),
                    'colorway': item.get('colorway', ''),
                    'desc': item.get('desc', ''),
                    'is_new': item.get('isNew', False),
                    'on_sale': item.get('onSale', False),
                    'in_stock': item.get('inStock', True),
                },
            )
            created += was_created
            updated += not was_created

            # categories
            product.categories.clear()
            for cat_name in item.get('cats', []):
                cat, _ = Category.objects.get_or_create(name=cat_name)
                product.categories.add(cat)

            # images — copy each real photo from seed_data/product_images into
            # this product's media folder and attach it
            product.images.all().delete()
            for order, rel_path in enumerate(item.get('images', [])):
                # rel_path looks like 'images/products/sb-dunk-stussy/1.jpeg'
                filename = Path(rel_path).name
                folder = Path(rel_path).parent.name
                src = IMAGES_DIR / folder / filename
                if not src.exists():
                    self.stdout.write(self.style.WARNING(f'  missing image file: {src}'))
                    continue
                with open(src, 'rb') as fh:
                    django_file = File(fh, name=f'{product.sku}_{filename}')
                    ProductImage.objects.create(product=product, image=django_file, order=order)

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created} products created, {updated} updated.'
        ))
