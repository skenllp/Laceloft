import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.management import call_command
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from .models import Category, Product, ProductImage


class TempMediaMixin:
    """Points MEDIA_ROOT at a throwaway folder so tests never touch media/."""

    @classmethod
    def setUpClass(cls):
        cls._media = tempfile.mkdtemp()
        cls._media_override = override_settings(MEDIA_ROOT=cls._media)
        cls._media_override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._media_override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)


class ProductApiTests(TempMediaMixin, TestCase):
    def setUp(self):
        self.client = APIClient()
        self.running = Category.objects.create(name='Running')
        self.p = Product.objects.create(
            sku='TEST-1', name='Test Runner', brand='Eleven', price=1999, strike=2499,
            gender='Men', sizes=[7, 8, 9], stock={'7': 2, '8': 0}, colorway='Black',
            desc='A shoe.', is_new=True, on_sale=True,
        )
        self.p.categories.add(self.running)
        ProductImage.objects.create(product=self.p, image='products/TEST-1_1.jpeg', order=0)

    def test_list_shape(self):
        res = self.client.get('/api/products/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        item = res.json()[0]
        self.assertEqual(item['sku'], 'TEST-1')
        self.assertEqual(item['brand'], 'Laceloft')  # legacy own-brand relabelled
        self.assertEqual(item['cats'], ['Running'])
        self.assertEqual(item['gender'], ['Men'])
        self.assertEqual(item['sizes'], [7, 8, 9])
        self.assertEqual(item['sizesInStock'], [7])
        self.assertTrue(item['stockTracked'])
        self.assertTrue(item['inStock'])
        self.assertTrue(item['isNew'])
        self.assertTrue(item['onSale'])
        self.assertEqual(item['images'], ['http://testserver/media/products/TEST-1_1.jpeg'])

    def test_detail_by_sku(self):
        res = self.client.get('/api/products/TEST-1/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['name'], 'Test Runner')
        self.assertEqual(self.client.get('/api/products/NOPE/').status_code, 404)

    def test_stock_states(self):
        self.p.stock = {}
        self.p.save()
        item = self.client.get('/api/products/TEST-1/').json()
        self.assertIsNone(item['inStock'])  # untracked = ask on WhatsApp
        self.assertFalse(item['stockTracked'])

        self.p.stock = {'7': 0}
        self.p.save()
        self.assertFalse(self.client.get('/api/products/TEST-1/').json()['inStock'])

        self.p.stock = {'7': 5}
        self.p.in_stock = False  # manual override wins
        self.p.save()
        self.assertFalse(self.client.get('/api/products/TEST-1/').json()['inStock'])

    def test_bad_stock_value_does_not_crash(self):
        self.p.stock = {'7': 'lots', '8': 3}
        self.p.save()
        res = self.client.get('/api/products/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()[0]['sizesInStock'], [8])

    def test_api_is_read_only(self):
        staff = User.objects.create_user('staff', password='x', is_staff=True)
        self.client.force_authenticate(staff)
        self.assertEqual(self.client.post('/api/products/', {'sku': 'X'}).status_code, 405)
        self.assertEqual(self.client.delete('/api/products/TEST-1/').status_code, 405)
        self.assertTrue(Product.objects.filter(sku='TEST-1').exists())

    def test_list_query_count_is_constant(self):
        for i in range(10):
            p = Product.objects.create(sku=f'X-{i}', name='x', brand='b', price=1)
            p.categories.add(self.running)
        with CaptureQueriesContext(connection) as ctx:
            self.client.get('/api/products/')
        self.assertLessEqual(len(ctx), 3)  # products + images + categories

    def test_orders_endpoint_removed(self):
        self.assertEqual(self.client.get('/api/orders/').status_code, 404)


# The production static storage needs `collectstatic` to have been run before
# admin pages can render; tests use the plain one instead.
@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class AdminTests(TempMediaMixin, TestCase):
    def test_product_admin_pages_load(self):
        admin = User.objects.create_superuser('admin', 'a@example.com', 'pw')
        self.client.force_login(admin)
        Product.objects.create(sku='TEST-1', name='Test', brand='B', price=1, stock={'8': 2})
        for url in ['/admin/', '/admin/shop/product/', '/admin/shop/product/add/',
                    '/admin/shop/product/TEST-1/change/', '/admin/shop/category/']:
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_add_product_through_admin(self):
        admin = User.objects.create_superuser('admin', 'a@example.com', 'pw')
        self.client.force_login(admin)
        res = self.client.post('/admin/shop/product/add/', {
            'sku': 'NEW-1', 'name': 'New Shoe', 'brand': 'Acme', 'price': 1500, 'strike': 0,
            # Size 9 ticked; size 11 has stock but was not ticked -> added automatically.
            'gender': 'Unisex', 'sizes': ['9'], 'stock': '{"8": 4, "11": 2}', 'colorway': '', 'desc': '',
            'in_stock': 'on',
            'images-TOTAL_FORMS': '0', 'images-INITIAL_FORMS': '0',
            'images-MIN_NUM_FORMS': '0', 'images-MAX_NUM_FORMS': '1000',
        })
        self.assertEqual(res.status_code, 302, res.content[:2000])
        item = APIClient().get('/api/products/NEW-1/').json()
        self.assertEqual(item['sizes'], [8, 9, 11])
        self.assertEqual(item['sizesInStock'], [8, 11])
        self.assertEqual(item['brand'], 'Acme')

    def test_brand_optional_and_sku_locked(self):
        admin = User.objects.create_superuser('admin', 'a@example.com', 'pw')
        self.client.force_login(admin)
        res = self.client.post('/admin/shop/product/add/', {
            'sku': 'NB-1', 'name': 'No Brand', 'brand': '', 'price': 900, 'strike': 0,
            'gender': 'Unisex', 'stock': '{}', 'colorway': '', 'desc': '', 'in_stock': 'on',
            'images-TOTAL_FORMS': '0', 'images-INITIAL_FORMS': '0',
            'images-MIN_NUM_FORMS': '0', 'images-MAX_NUM_FORMS': '1000',
        })
        self.assertEqual(res.status_code, 302, res.content[:2000])
        page = self.client.get('/admin/shop/product/NB-1/change/').content.decode()
        self.assertNotIn('name="sku"', page)  # read-only once saved
        self.assertIn('size-ticks', page)  # size tick boxes rendered

    def test_list_quick_edit(self):
        admin = User.objects.create_superuser('admin', 'a@example.com', 'pw')
        self.client.force_login(admin)
        Product.objects.create(sku='Q-1', name='Quick', brand='B', price=1000)
        res = self.client.post('/admin/shop/product/', {
            'form-TOTAL_FORMS': '1', 'form-INITIAL_FORMS': '1', 'form-MIN_NUM_FORMS': '0', 'form-MAX_NUM_FORMS': '1000',
            'form-0-sku': 'Q-1', 'form-0-price': '1250', 'form-0-in_stock': 'on', '_save': 'Save',
        })
        self.assertEqual(res.status_code, 302, res.content[:2000])
        self.assertEqual(Product.objects.get(sku='Q-1').price, 1250)

    def test_publish_button(self):
        from unittest import mock
        admin = User.objects.create_superuser('admin', 'a@example.com', 'pw')
        self.client.force_login(admin)
        self.assertIn('Publish to website', self.client.get('/admin/shop/product/').content.decode())

        with override_settings(FRONTEND_DEPLOY_HOOK=''):
            res = self.client.post('/admin/shop/product/publish/', follow=True)
        self.assertIn('not set up yet', res.content.decode())

        with override_settings(FRONTEND_DEPLOY_HOOK='https://api.render.com/deploy/x'), \
                mock.patch('shop.admin.urllib.request.urlopen') as urlopen:
            res = self.client.post('/admin/shop/product/publish/', follow=True)
        urlopen.assert_called_once()
        self.assertEqual(urlopen.call_args[0][0].full_url, 'https://api.render.com/deploy/x')
        self.assertIn('Website update started', res.content.decode())


class SeedCommandTests(TempMediaMixin, TestCase):
    def media_files(self):
        import os
        return sorted(os.listdir(f'{self._media}/products'))

    def test_seed_creates_then_keeps_admin_edits(self):
        call_command('seed_products', stdout=open('nul' if __import__('os').name == 'nt' else '/dev/null', 'w'))
        count = Product.objects.count()
        self.assertGreater(count, 0)
        files = self.media_files()
        self.assertEqual(len(files), ProductImage.objects.count())

        p = Product.objects.first()
        p.price = 1
        p.save()
        call_command('seed_products', stdout=open('nul' if __import__('os').name == 'nt' else '/dev/null', 'w'))
        p.refresh_from_db()
        self.assertEqual(p.price, 1)  # admin edit survived a redeploy
        self.assertEqual(Product.objects.count(), count)
        self.assertEqual(self.media_files(), files)  # no duplicate copies

    def test_update_flag_overwrites(self):
        devnull = open('nul' if __import__('os').name == 'nt' else '/dev/null', 'w')
        call_command('seed_products', stdout=devnull)
        p = Product.objects.first()
        original = p.price
        p.price = 1
        p.save()
        call_command('seed_products', '--update', stdout=devnull)
        p.refresh_from_db()
        self.assertEqual(p.price, original)

    def test_missing_photo_files_are_restored(self):
        devnull = open('nul' if __import__('os').name == 'nt' else '/dev/null', 'w')
        call_command('seed_products', stdout=devnull)
        p = Product.objects.filter(images__isnull=False).first()
        n = p.images.count()
        # Simulate Render wiping the disk: rows point at files that are gone.
        p.images.update(image='products/gone.jpeg')
        call_command('seed_products', stdout=devnull)
        self.assertEqual(p.images.count(), n)
        self.assertNotIn('gone.jpeg', ''.join(p.images.values_list('image', flat=True)))


class ThumbnailTests(TempMediaMixin, TestCase):
    def test_thumbs_created_and_served(self):
        devnull = open('nul' if __import__('os').name == 'nt' else '/dev/null', 'w')
        call_command('seed_products', stdout=devnull)
        sku = ProductImage.objects.first().product.sku
        # Seed photos are bulk-created; before make_thumbs the API falls back
        # to the original photo rather than a broken link.
        item = APIClient().get(f'/api/products/{sku}/').json()
        self.assertEqual(item['thumbs'], item['images'])

        call_command('make_thumbs', stdout=devnull)
        item = APIClient().get(f'/api/products/{sku}/').json()
        self.assertEqual(len(item['thumbs']), len(item['images']))
        self.assertTrue(all(u.endswith('.webp') and '/media/products/thumbs/' in u for u in item['thumbs']))

    def test_admin_upload_gets_thumb(self):
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image
        buf = BytesIO()
        Image.new('RGB', (1200, 900), 'white').save(buf, 'JPEG')
        p = Product.objects.create(sku='UP-1', name='Upload', brand='B', price=1)
        ProductImage.objects.create(product=p, image=SimpleUploadedFile('shoe.jpg', buf.getvalue(), content_type='image/jpeg'))
        thumb = APIClient().get('/api/products/UP-1/').json()['thumbs'][0]
        self.assertTrue(thumb.endswith('.webp'))
        from PIL import Image as Im
        import os
        with Im.open(os.path.join(self._media, 'products', 'thumbs', os.path.basename(thumb))) as im:
            self.assertEqual(im.width, 640)
