import { readBoundaryCountry } from "../src/shared/config/boundaryCountries";

type CountryContext = {
  request: Request & { cf?: { country?: string | null } };
  next: () => Promise<Response>;
};

export function onRequest({ request, next }: CountryContext) {
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
  if (
    !/^\/(ko|en)\/(demo|editor)(\/|\/index\.html)?$/.test(url.pathname) ||
    readBoundaryCountry(url.search)
  )
    return next();

  // Country chooses boundary data, independently of UI language. Geographical
  // defaults must never be cached as a permanent language redirect.
  url.searchParams.set("country", request.cf?.country === "KR" ? "KR" : "US");
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.href,
      "Cache-Control": "private, no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
    },
  });
}
