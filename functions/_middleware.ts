type PageContext = {
  request: Request;
  next: () => Promise<Response>;
};

export function onRequest({ request, next }: PageContext) {
  const url = new URL(request.url);
  if (!["GET", "HEAD"].includes(request.method)) return next();

  // Stable language URLs do not depend on IP or browser preferences. Keep the
  // neutral OAuth callback registered with Supabase and handle it in the SPA.
  if (
    /^\/(editing|integration|authentication|self-hosting(\/boundaries)?|about|demo|editor|screen)?\/?$/.test(
      url.pathname,
    )
  ) {
    url.pathname = `/ko${url.pathname === "/" ? "/" : url.pathname}`;
    return Response.redirect(url.href, 308);
  }
  // Infer boundary defaults from the locale in the client. Adding an inferred
  // country query here would pin that country when the host switches language.
  return next();
}
