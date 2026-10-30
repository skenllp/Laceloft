"""
Order email notifications, sent via Resend's HTTP API.

Deliberately uses plain urllib (like create_razorpay_order in views.py)
instead of the `resend` PyPI package, so there's no extra dependency to
install/maintain for something this small.

Required environment variables (set on Render, or locally for testing):
  RESEND_API_KEY     — from your Resend dashboard
  SELLER_NOTIFY_EMAIL — your own email, to receive new-order alerts

Optional:
  RESEND_FROM_EMAIL  — defaults to Resend's shared sandbox sender,
                        'Laceloft <onboarding@resend.dev>'. On that sandbox
                        sender, Resend only actually delivers to the email
                        address your Resend account is registered with —
                        so customer confirmation emails will silently only
                        reach *you* until you verify your own domain in
                        Resend and switch this to something like
                        'Laceloft <orders@yourdomain.com>'. Seller alerts
                        work immediately either way, since they're sent to
                        that same address.

Every function here fails silently (logs to the console, doesn't raise) —
a broken email provider should never be able to break checkout. Check your
runserver terminal / Render logs for 'Laceloft: email failed ->' if
notifications aren't arriving.
"""
import json
import urllib.error
import urllib.request

from django.conf import settings

RESEND_API_URL = 'https://api.resend.com/emails'


def _send_email(to, subject, html):
    api_key = getattr(settings, 'RESEND_API_KEY', '')
    if not api_key:
        print('Laceloft: email skipped (RESEND_API_KEY not set) ->', subject, '->', to)
        return False

    from_email = getattr(settings, 'RESEND_FROM_EMAIL', 'Laceloft <onboarding@resend.dev>')
    payload = json.dumps({
        'from': from_email,
        'to': [to],
        'subject': subject,
        'html': html,
    }).encode('utf-8')

    req = urllib.request.Request(
        RESEND_API_URL,
        data=payload,
        method='POST',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            # Resend rejects requests with no User-Agent (HTTP 403, error
            # code 1010) — Python's urllib doesn't reliably send one on its
            # own in every environment, so set it explicitly.
            'User-Agent': 'Laceloft/1.0',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read()
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        print(f'Laceloft: email failed -> {subject} -> {to} -> HTTP {e.code}: {body}')
        return False
    except Exception as e:
        print(f'Laceloft: email failed -> {subject} -> {to} -> {e}')
        return False


def _items_html(order):
    rows = ''.join(
        f'<tr><td style="padding:6px 0;">{item.name} &middot; {item.size} &times;{item.qty}</td>'
        f'<td style="padding:6px 0; text-align:right;">&#8377;{item.price * item.qty:,.0f}</td></tr>'
        for item in order.items.all()
    )
    return f'<table style="width:100%; border-collapse:collapse; font-size:14px;">{rows}</table>'


def send_order_confirmation_email(order):
    """To the customer, once an order is actually placed (COD: immediately;
    Razorpay: right after payment is verified — see views.py)."""
    if not order.customer_email:
        return  # email is optional at checkout; nothing to send to
    payment_line = (
        f'Please keep &#8377;{order.total:,.0f} ready in cash for delivery.'
        if order.payment_method == 'cod'
        else f'We\u2019ve received your payment of &#8377;{order.total:,.0f}.'
    )
    html = f"""
      <div style="font-family:sans-serif; max-width:520px; margin:0 auto;">
        <h2 style="margin-bottom:4px;">Thanks for your order, {order.customer_name}!</h2>
        <p style="color:#555;">Order <strong>{order.order_id}</strong> has been placed.</p>
        <p>{payment_line}</p>
        {_items_html(order)}
        <p style="margin-top:16px; color:#555;">
          Shipping to: {order.address_line1}, {order.city}, {order.state} {order.pincode}
        </p>
        <p style="color:#888; font-size:12px; margin-top:24px;">
          Track your order anytime at your Laceloft account, or via Track Order using
          your order ID and phone number.
        </p>
      </div>
    """
    _send_email(order.customer_email, f'Your Laceloft order {order.order_id} is confirmed', html)


def send_seller_alert_email(order):
    """To you (the seller), so you know to start fulfilling — especially
    important for COD, since there's no payment-gateway notification for
    those the way there is for Razorpay."""
    seller_email = getattr(settings, 'SELLER_NOTIFY_EMAIL', '')
    if not seller_email:
        print('Laceloft: seller alert skipped (SELLER_NOTIFY_EMAIL not set)')
        return
    html = f"""
      <div style="font-family:sans-serif; max-width:520px; margin:0 auto;">
        <h2 style="margin-bottom:4px;">New order: {order.order_id}</h2>
        <p><strong>{order.payment_method.upper()}</strong> &middot; &#8377;{order.total:,.0f}</p>
        <p>{order.customer_name} &middot; {order.customer_phone}</p>
        {_items_html(order)}
        <p style="margin-top:16px; color:#555;">
          Ship to: {order.address_line1}, {order.address_line2 or ''} {order.city}, {order.state} {order.pincode}
        </p>
      </div>
    """
    _send_email(seller_email, f'New order {order.order_id} — {order.payment_method.upper()} — \u20b9{order.total:,.0f}', html)


def send_password_reset_email(user, reset_url):
    """To a customer who requested a password reset (see views.py's
    forgot_password_view). reset_url already has the uid/token baked in —
    this function just formats and sends it."""
    if not user.email:
        return
    html = f"""
      <div style="font-family:sans-serif; max-width:520px; margin:0 auto;">
        <h2 style="margin-bottom:4px;">Reset your Laceloft password</h2>
        <p style="color:#555;">
          We got a request to reset the password for this account. Click
          below to choose a new one — this link works for a limited time
          and can only be used once.
        </p>
        <p style="margin:24px 0;">
          <a href="{reset_url}" style="background:#111; color:#fff; padding:12px 20px;
             text-decoration:none; display:inline-block;">Reset password</a>
        </p>
        <p style="color:#888; font-size:12px;">
          Didn't request this? You can safely ignore this email — your
          password won't change unless you click the link above and set a
          new one.
        </p>
      </div>
    """
    _send_email(user.email, 'Reset your Laceloft password', html)
