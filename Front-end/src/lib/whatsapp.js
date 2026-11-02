/* ===== Laceloft — WhatsApp helpers =====
   A wa.me link can only pre-fill text. A WhatsApp enquiry is NOT a completed
   order until the seller confirms it, so the UI never shows an "order placed"
   state after opening WhatsApp. */

import { WHATSAPP_NUMBER } from './config'
import { fmtPrice } from './api'
import { productPath } from './catalog'

/** Generic chat link, optionally with a prefilled message. */
export function whatsappChatLink(text) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/** Prefilled order message for a product (size / colour / quantity). */
export function buildWhatsAppLink(product, { size, color, quantity = 1 } = {}) {
  const colour = color || product.colorway
  const productUrl =
    typeof window !== 'undefined'
      ? window.location.origin + productPath(product.sku)
      : ''
  const lines = [
    "Hi Laceloft, I'd like to place an order.",
    '',
    `Product: ${product.name}`,
    size ? `Size: ${size}` : null,
    colour ? `Colour: ${colour}` : null,
    `Quantity: ${quantity}`,
    `Price: ${fmtPrice(product.price)}`,
    productUrl ? `Product Link: ${productUrl}` : null,
    '',
    'Please confirm availability, delivery charges and the final amount.',
  ].filter((l) => l !== null)
  return whatsappChatLink(lines.join('\n'))
}
