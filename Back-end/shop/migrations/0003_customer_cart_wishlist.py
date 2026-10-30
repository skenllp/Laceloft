# Generated manually to add server-side cart/wishlist sync for Customer

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0002_order_user_customer'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='cart',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='customer',
            name='wishlist',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
