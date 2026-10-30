# Generated manually to add shipping address fields to Order,
# now that checkout collects them instead of handing off to WhatsApp.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0003_customer_cart_wishlist'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='address_line1',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='order',
            name='address_line2',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='order',
            name='city',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='order',
            name='state',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='order',
            name='pincode',
            field=models.CharField(blank=True, max_length=10),
        ),
    ]
