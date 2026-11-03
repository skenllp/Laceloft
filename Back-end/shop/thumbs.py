"""Small WebP copies of product photos for grids and cards.

Phones were downloading ~200 KB originals to show them ~190px wide. Each
photo gets a 640px-wide WebP at products/thumbs/<name>.webp; the API sends
it as `thumbs` and falls back to the original when a thumb is missing.
"""
from io import BytesIO
from pathlib import PurePosixPath

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps

THUMB_WIDTH = 640


def thumb_name(image_name):
    return f'products/thumbs/{PurePosixPath(image_name).stem}.webp'


def make_thumb(image_name, overwrite=False):
    """Creates the thumb for a stored photo. Returns True if one was written.
    Never raises: a bad upload should not break saving the product."""
    name = thumb_name(image_name)
    try:
        if not overwrite and default_storage.exists(name):
            return False
        with default_storage.open(image_name, 'rb') as fh:
            im = Image.open(fh)
            # JPEGs can be decoded at reduced size, which keeps a 12-megapixel
            # phone photo from using ~50 MB on the 512 MB free instance.
            im.draft('RGB', (THUMB_WIDTH * 2, THUMB_WIDTH * 2))
            im = ImageOps.exif_transpose(im)
            im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        if im.width > THUMB_WIDTH:
            im = im.resize((THUMB_WIDTH, round(im.height * THUMB_WIDTH / im.width)), Image.LANCZOS)
        buf = BytesIO()
        im.save(buf, 'WEBP', quality=78, method=6)
        if default_storage.exists(name):
            default_storage.delete(name)
        default_storage.save(name, ContentFile(buf.getvalue()))
        return True
    except Exception as exc:  # noqa: BLE001 — logged, never fatal
        print(f'Laceloft: thumbnail failed for {image_name}: {exc}')
        return False
