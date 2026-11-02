from django.core.management.base import BaseCommand

from shop.models import ProductImage
from shop.thumbs import make_thumb


class Command(BaseCommand):
    help = 'Creates missing grid thumbnails for product photos (use --all to rebuild every one).'

    def add_arguments(self, parser):
        parser.add_argument('--all', action='store_true', help='Rebuild thumbnails that already exist too.')

    def handle(self, *args, **options):
        made = sum(
            make_thumb(name, overwrite=options['all'])
            for name in ProductImage.objects.values_list('image', flat=True)
        )
        self.stdout.write(self.style.SUCCESS(f'Done. {made} thumbnails written.'))
