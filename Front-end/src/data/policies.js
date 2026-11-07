/* ===== Laceloft — policy pages =====
   Add the client's real wording here; never invent it. Each section is
   { heading: '...', body: '...' }. A page with sections is published normally.
   A page with none says the details are available on request and is hidden from
   search engines. When a page gets its wording, also add its path to
   STATIC_ROUTES in scripts/postbuild.mjs so it joins the sitemap. */

export const POLICIES = {
  shipping: { title: 'Shipping Information', topic: 'shipping', sections: [] },
  exchange: { title: 'Exchange Policy', topic: 'exchanges', sections: [] },
  privacy: { title: 'Privacy Policy', topic: 'privacy', sections: [] },
}
