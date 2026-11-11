import shutil
import tempfile
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from .models import Category, Product, ProductImage


PLAIN_STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}


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
@override_settings(STORAGES=PLAIN_STORAGES)
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

    def test_publish_button_on_own_server_writes_the_flag_file(self):
        import os
        admin = User.objects.create_superuser('admin', 'a@example.com', 'pw')
        self.client.force_login(admin)
        flag = os.path.join(tempfile.mkdtemp(), 'rebuild.flag')
        self.addCleanup(shutil.rmtree, os.path.dirname(flag), True)
        with override_settings(FRONTEND_REBUILD_FLAG=flag, FRONTEND_DEPLOY_HOOK=''):
            res = self.client.post('/admin/shop/product/publish/', follow=True)
        self.assertTrue(os.path.getsize(flag) > 0)
        self.assertIn('Website update started', res.content.decode())
        with override_settings(FRONTEND_REBUILD_FLAG=os.path.join(os.path.dirname(flag), 'nope', 'x'), FRONTEND_DEPLOY_HOOK=''):
            res = self.client.post('/admin/shop/product/publish/', follow=True)
        self.assertIn('Could not start the website update', res.content.decode())


class SeedCommandTests(TempMediaMixin, TestCase):
    def media_files(self):
        import os
        return sorted(os.listdir(f'{self._media}/products'))

    def test_seed_creates_then_keeps_admin_edits(self):
        call_command('seed_products', stdout=StringIO())
        count = Product.objects.count()
        self.assertGreater(count, 0)
        files = self.media_files()
        self.assertEqual(len(files), ProductImage.objects.count())

        p = Product.objects.first()
        p.price = 1
        p.save()
        call_command('seed_products', stdout=StringIO())
        p.refresh_from_db()
        self.assertEqual(p.price, 1)  # admin edit survived a redeploy
        self.assertEqual(Product.objects.count(), count)
        self.assertEqual(self.media_files(), files)  # no duplicate copies

    def test_update_flag_overwrites(self):
        devnull = StringIO()
        call_command('seed_products', stdout=devnull)
        p = Product.objects.first()
        original = p.price
        p.price = 1
        p.save()
        call_command('seed_products', '--update', stdout=devnull)
        p.refresh_from_db()
        self.assertEqual(p.price, original)

    def test_missing_photo_files_are_restored(self):
        devnull = StringIO()
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
        devnull = StringIO()
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


@override_settings(STORAGES=PLAIN_STORAGES)
class NoPhotoWarningTests(TempMediaMixin, TestCase):
    def test_warns_when_saved_without_a_photo(self):
        admin = User.objects.create_superuser('admin', 'a@example.com', 'pw')
        self.client.force_login(admin)
        res = self.client.post('/admin/shop/product/add/', {
            'sku': 'NP-1', 'name': 'No Photo Shoe', 'brand': '', 'price': 900, 'strike': 0,
            'gender': 'Unisex', 'stock': '{}', 'colorway': '', 'desc': '', 'in_stock': 'on',
            'images-TOTAL_FORMS': '0', 'images-INITIAL_FORMS': '0',
            'images-MIN_NUM_FORMS': '0', 'images-MAX_NUM_FORMS': '1000',
        }, follow=True)
        self.assertIn('has no photos yet', res.content.decode())

    def test_big_jpeg_thumbnail(self):
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image
        buf = BytesIO()
        Image.new('RGB', (4000, 3000), 'white').save(buf, 'JPEG')
        p = Product.objects.create(sku='BIG-1', name='Big', brand='B', price=1)
        ProductImage.objects.create(product=p, image=SimpleUploadedFile('big.jpg', buf.getvalue(), content_type='image/jpeg'))
        thumb = APIClient().get('/api/products/BIG-1/').json()['thumbs'][0]
        self.assertTrue(thumb.endswith('.webp'))


@override_settings(STORAGES=PLAIN_STORAGES)
class SecurityTests(TestCase):
    def test_admin_login_locks_after_repeated_failures(self):
        User.objects.create_superuser('boss', 'b@example.com', 'a-Strong-pass-123')
        for _ in range(5):
            self.client.post('/admin/login/', {'username': 'boss', 'password': 'wrong'})
        # Even the correct password is refused once the account is locked.
        res = self.client.post('/admin/login/', {'username': 'boss', 'password': 'a-Strong-pass-123'})
        self.assertEqual(res.status_code, 429)
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_other_users_failures_do_not_lock_the_admin(self):
        # Behind a shared proxy IP, strangers' failed logins must not lock the real admin out.
        User.objects.create_superuser('boss', 'b@example.com', 'a-Strong-pass-123')
        for i in range(10):
            self.client.post('/admin/login/', {'username': f'bot{i}', 'password': 'wrong'})
        res = self.client.post('/admin/login/', {'username': 'boss', 'password': 'a-Strong-pass-123'})
        self.assertEqual(res.status_code, 302)

    def test_admin_login_still_works_for_correct_password(self):
        User.objects.create_superuser('boss', 'b@example.com', 'a-Strong-pass-123')
        self.client.post('/admin/login/', {'username': 'boss', 'password': 'wrong'})
        res = self.client.post('/admin/login/', {'username': 'boss', 'password': 'a-Strong-pass-123'})
        self.assertEqual(res.status_code, 302)

    def test_api_is_read_only_and_json_only(self):
        c = APIClient()
        self.assertEqual(c.post('/api/products/', {}).status_code, 405)
        self.assertEqual(c.delete('/api/products/X/').status_code, 405)
        res = c.get('/api/products/', HTTP_ACCEPT='text/html')
        self.assertIn('application/json', res['Content-Type'])


@override_settings(STORAGES=PLAIN_STORAGES)
class StaffGroupTests(TestCase):
    def test_shop_staff_group_can_add_and_edit_but_not_delete(self):
        from django.contrib.auth.models import Group
        codes = set(Group.objects.get(name='Shop staff').permissions.values_list('codename', flat=True))
        self.assertIn('add_product', codes)
        self.assertIn('change_product', codes)
        self.assertIn('add_productimage', codes)
        self.assertNotIn('delete_product', codes)
        self.assertFalse(any(c.endswith('_user') for c in codes))

    def test_group_page_lists_permissions_in_plain_words(self):
        from django.contrib.auth.models import Group
        self.client.force_login(User.objects.create_superuser('boss', 'b@example.com', 'a-Strong-pass-123'))
        page = self.client.get(f'/admin/auth/group/{Group.objects.get(name="Shop staff").pk}/change/').content.decode()
        self.assertIn('Products: edit', page)
        self.assertIn('What is a group?', page)
        self.assertNotIn('access attempt', page)


class RealCatalogueTests(TempMediaMixin, TestCase):
    def seed(self):
        call_command('seed_products', stdout=StringIO())

    def test_stock_per_size_is_loaded(self):
        self.seed()
        item = APIClient().get('/api/products/LL-001/').json()
        self.assertEqual(item['name'], 'Nike Shox R4')
        self.assertEqual(item['price'], 3199)
        self.assertEqual(item['sizesInStock'], [7, 8])
        self.assertTrue(item['inStock'])
        self.assertTrue(item['images'])

    def test_every_selling_price_is_below_its_original_price(self):
        self.seed()
        for p in Product.objects.all():
            self.assertLess(p.price, p.strike, p.sku)

    def test_old_catalogue_removal_spares_other_products(self):
        from importlib import import_module
        from django.apps import apps
        migration = import_module('shop.migrations.0012_remove_old_catalogue')
        Product.objects.create(sku='AD-SMB-BRN', name='Old', brand='B', price=1)
        Product.objects.create(sku='ADMIN-ADDED', name='Kept', brand='B', price=1)
        migration.remove_old_products(apps, None)
        self.assertEqual(list(Product.objects.values_list('sku', flat=True)), ['ADMIN-ADDED'])

    def test_product_deleted_in_admin_is_not_restored_by_seed(self):
        from django.contrib.admin.models import DELETION, LogEntry
        from django.contrib.contenttypes.models import ContentType
        self.seed()
        user = User.objects.create_superuser('boss', 'b@example.com', 'a-Strong-pass-123')
        Product.objects.get(sku='LL-001').delete()
        LogEntry.objects.create(
            user=user, content_type=ContentType.objects.get_for_model(Product), object_id='LL-001',
            object_repr='Nike Shox R4', action_flag=DELETION,
        )
        self.seed()
        self.assertFalse(Product.objects.filter(sku='LL-001').exists())
        self.assertTrue(Product.objects.filter(sku='LL-002').exists())


class SaleConsistencyTests(TestCase):
    def test_on_sale_follows_the_prices_not_the_stored_flag(self):
        Product.objects.create(sku='A', name='A', brand='', price=1000, strike=1500, on_sale=False)
        Product.objects.create(sku='B', name='B', brand='', price=1000, strike=0, on_sale=True)
        items = {p['sku']: p for p in APIClient().get('/api/products/').json()}
        self.assertTrue(items['A']['onSale'])
        self.assertFalse(items['B']['onSale'])

    def test_admin_rejects_original_price_at_or_below_selling_price(self):
        from .admin import ProductAdminForm
        form = ProductAdminForm(data={'sku': 'C', 'name': 'C', 'brand': '', 'price': 2000, 'strike': 1500, 'gender': 'Men', 'stock': '{}'})
        self.assertFalse(form.is_valid())
        self.assertIn('strike', form.errors)


@override_settings(STORAGES=PLAIN_STORAGES)
class HiddenPermissionTests(TestCase):
    def test_saving_a_group_keeps_permissions_the_form_does_not_list(self):
        from django.contrib.auth.models import Group, Permission
        group = Group.objects.get(name='Shop staff')
        hidden = Permission.objects.get(codename='add_logentry')
        group.permissions.add(hidden)
        listed = list(group.permissions.exclude(pk=hidden.pk).values_list('pk', flat=True))
        self.client.force_login(User.objects.create_superuser('boss', 'b@example.com', 'a-Strong-pass-123'))
        res = self.client.post(f'/admin/auth/group/{group.pk}/change/', {'name': 'Shop staff', 'permissions': listed})
        self.assertEqual(res.status_code, 302)
        self.assertTrue(group.permissions.filter(pk=hidden.pk).exists())
