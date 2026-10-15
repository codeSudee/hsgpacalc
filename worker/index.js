// Redirect www to the apex domain (301); everything else is served from static assets.
// Unknown /es/ paths get the Spanish 404 page (the assets 404 fallback only knows the root 404.html).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.hsgpacalc.com') {
      url.hostname = 'hsgpacalc.com';
      return Response.redirect(url.toString(), 301);
    }
    const res = await env.ASSETS.fetch(request);
    if (res.status === 404 && (url.pathname === '/es' || url.pathname.startsWith('/es/'))) {
      const page = await env.ASSETS.fetch(new URL('/es/404/', url));
      return new Response(page.body, { status: 404, headers: page.headers });
    }
    return res;
  },
};
