from django.db import migrations


def seed_built10(apps, schema_editor):
    Coupon = apps.get_model('shop', 'Coupon')
    Coupon.objects.get_or_create(
        code='BUILT10',
        defaults={'discount_percent': 10, 'active': True},
    )


def remove_built10(apps, schema_editor):
    Coupon = apps.get_model('shop', 'Coupon')
    Coupon.objects.filter(code='BUILT10').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0008_coupon'),
    ]

    operations = [
        migrations.RunPython(seed_built10, remove_built10),
    ]
