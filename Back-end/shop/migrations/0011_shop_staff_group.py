"""Creates a ready-made "Shop staff" group: add, edit and view products, photos
and categories, but not delete. Only created if missing, so edits made to the
group in /admin/ are never overwritten."""
from django.db import migrations


def create_shop_staff(apps, schema_editor):
    # Permissions are normally created after migrations finish; make sure they
    # exist now so the group can be given them on a brand-new database too.
    from django.contrib.auth.management import create_permissions
    for app_config in apps.get_app_configs():
        app_config.models_module = True
        create_permissions(app_config, apps=apps, verbosity=0)
        app_config.models_module = None

    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    group, created = Group.objects.get_or_create(name='Shop staff')
    if created:
        group.permissions.set(Permission.objects.filter(
            content_type__app_label='shop',
            content_type__model__in=['product', 'productimage', 'category'],
            codename__regex=r'^(add|change|view)_',
        ))


class Migration(migrations.Migration):
    dependencies = [
        ('shop', '0010_remove_orders_customers_coupons'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.RunPython(create_shop_staff, migrations.RunPython.noop),
    ]
