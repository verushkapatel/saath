// saath.cc: serves the Saath site from getsaath.pages.dev under the saath.cc address. www goes to the bare domain.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.hostname === "www.saath.cc") return Response.redirect(`https://saath.cc${url.pathname}${url.search}`, 301);
    const upstream = new URL(url.pathname + url.search, "https://getsaath.pages.dev");
    const response = await fetch(new Request(upstream, request), { redirect: "manual", cf: { cacheTtl: 0 } });
    const headers = new Headers(response.headers);
    const location = headers.get("location");
    if (location) headers.set("location", location.replace("https://getsaath.pages.dev", "https://saath.cc"));
    const type = headers.get("content-type") ?? "";
    if (type.includes("text/html") || url.pathname.endsWith("/sw.js")) headers.set("cache-control", "no-cache, must-revalidate");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
