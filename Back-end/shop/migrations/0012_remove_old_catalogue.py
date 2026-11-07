"""Removes the original placeholder catalogue, now replaced by the real products in
seed_data/products.json. Only these exact product codes are deleted, so anything
added through /admin/ is left alone."""
from django.db import migrations

OLD_SKUS = [
    'SBD-STU-001', 'NB-9060-NRG', 'NK-CTZ-WGO', 'NB-1906R-BS', 'AJ4-THDR-BY', 'OT-MX66-BP',
    'AJ4-RED-SDE', 'AJ4-NVW-RD', 'AJ4-SB-PINE', 'PM-MJ-SLV', 'RD-SDE-LOW', 'OT-MX66-CRM',
    'AD-SMB-BRN', 'CHK-WHT-FUT', 'NB-CHK-BLK', 'AD-SMB-RED', 'OT-MX66-RED', 'NB-CHK-BLKGLD',
    'PM-RC-RED', 'OT-MX66-BW', 'OT-MX66-YLW', 'AD-FRM-WHT', 'DSG-HI-BLK', 'AD-LOW-BLK',
    'AJ1-CRT-PPL', 'AJ1-HI-TS', 'AJ1-HI-UNC', 'JEL-BBL-RED', 'JEL-BBL-WHT', 'SLD-RED',
    'SLD-WHT', 'AD-SMB-FLR', 'CHL-BT-BRN', 'CHL-BT-BLK', 'USP-BT-GRY', 'USP-BT-BLK',
    'USP-BT-TAN', 'PAT-BT-BLK',
]


def remove_old_products(apps, schema_editor):
    Product = apps.get_model('shop', 'Product')
    ProductImage = apps.get_model('shop', 'ProductImage')
    ProductImage.objects.filter(product_id__in=OLD_SKUS).delete()
    Product.objects.filter(sku__in=OLD_SKUS).delete()


class Migration(migrations.Migration):
    dependencies = [('shop', '0011_shop_staff_group')]

    operations = [migrations.RunPython(remove_old_products, migrations.RunPython.noop)]
