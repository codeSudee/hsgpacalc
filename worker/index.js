// Redirect www to the apex domain (301); everything else is served from static assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.hsgpacalc.com') {
      url.hostname = 'hsgpacalc.com';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
