"""
A small staff-only sales dashboard, sitting alongside (not inside) Django
admin's own pages. Django admin has no built-in "how's business doing"
view — this fills that gap with three things a small store actually needs
day to day: total revenue vs. what's actually been collected, order volume
over the last 30 days, and which SKUs are actually selling.

Deliberately plain Django (no chart.js/frontend framework) — a handful of
aggregate queries rendered as a simple table + CSS bar chart is enough at
this scale and keeps this file dependency-free.
"""
from datetime import timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.shortcuts import render
from django.utils import timezone

from .models import Order, OrderItem


@staff_member_required
def sales_dashboard(request):
    non_cancelled = Order.objects.exclude(status='cancelled')

    total_order_value = non_cancelled.aggregate(total=Sum('total'))['total'] or 0
    payments_received = Order.objects.filter(payment_status='paid').aggregate(total=Sum('total'))['total'] or 0
    # COD orders are 'pending' until staff mark them paid after cash is
    # collected (see admin.py) — this is the gap between the two figures
    # above, i.e. money that's expected but not yet confirmed in hand.
    pending_collection = total_order_value - payments_received

    order_count = non_cancelled.count()
    cancelled_count = Order.objects.filter(status='cancelled').count()

    # ---- Orders per day, last 30 days (for the bar chart) ----
    since = timezone.now() - timedelta(days=30)
    daily = (
        non_cancelled.filter(created_at__gte=since)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'), revenue=Sum('total'))
        .order_by('day')
    )
    daily = list(daily)
    max_daily_count = max((d['count'] for d in daily), default=1)

    # ---- Best-selling SKUs (by quantity sold), all-time, non-cancelled ----
    best_sellers = (
        OrderItem.objects.exclude(order__status='cancelled')
        .values('sku', 'name')
        .annotate(total_qty=Sum('qty'), total_revenue=Sum('price'))
        .order_by('-total_qty')[:10]
    )

    # ---- Orders by status, for a quick at-a-glance breakdown ----
    status_counts = dict(
        non_cancelled.values('status').annotate(count=Count('id')).values_list('status', 'count')
    )
    # Built here (not in the template) since Django templates can't do a
    # dict lookup by a loop variable without a custom filter — this keeps
    # the template plain.
    status_breakdown = [
        (label, status_counts.get(key, 0)) for key, label in Order.STATUS_CHOICES
    ]

    # ---- Payment method split (how many are COD vs prepaid) ----
    payment_method_counts = dict(
        non_cancelled.values('payment_method').annotate(count=Count('id')).values_list('payment_method', 'count')
    )

    return render(request, 'shop/dashboard.html', {
        'total_order_value': total_order_value,
        'payments_received': payments_received,
        'pending_collection': pending_collection,
        'order_count': order_count,
        'cancelled_count': cancelled_count,
        'daily': daily,
        'max_daily_count': max_daily_count,
        'best_sellers': best_sellers,
        'status_breakdown': status_breakdown,
        'payment_method_counts': payment_method_counts,
    })
