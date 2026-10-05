/** Public NFC landing page. Never resolves a card credential without staff authentication. */
function customerOrigin(value?: string): string {
  try {
    const origin = new URL(value || "https://tickets.villiersdorpskou.co.za").origin;
    return origin.startsWith("https://") ? origin : "https://tickets.villiersdorpskou.co.za";
  } catch { return "https://tickets.villiersdorpskou.co.za"; }
}

export function walletCardPage(request: Request, configuredCustomerOrigin?: string): Response {
  const path = new URL(request.url).pathname;
  const valid = path === "/" || /^\/n\/VSW2\.[A-Za-z0-9_-]{43}$/.test(path);
  const token = path.match(/^\/n\/(VSW2\.[A-Za-z0-9_-]{43})$/)?.[1];
  const backend = customerOrigin(configuredCustomerOrigin);
  const customerLink = token ? `${backend}/connect-card#${token}` : `${backend}/my-wallet`;
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-robots-tag": "noindex, nofollow, noarchive",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  };
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405, headers: {...headers, allow: "GET, HEAD"}});
  const html = `<!doctype html><html lang="af"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skoukaart · Villiersdorp Skou</title><style>*{box-sizing:border-box}body{margin:0;background:#f7f0e2;color:#103b29;font:18px/1.6 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}main{max-width:520px;background:#fffaf1;border:1px solid #dfcca2;border-radius:24px;padding:32px;box-shadow:0 14px 48px #103b2910}small{font-weight:700;letter-spacing:.1em}h1{font-size:36px;line-height:1.15;margin:18px 0}a{display:block;text-align:center;background:#087746;color:white;border-radius:14px;padding:14px;text-decoration:none;font-weight:700;margin:24px 0}p{margin:16px 0}.note{font-size:15px;color:#526357}</style></head><body><main><small>VILLIERSDORP SKOU</small><h1>${valid ? "Jou Skoukaart" : "Ongeldige kaartskakel"}</h1><p>${valid ? "Vul jou kaart nou veilig aan, of koppel ’n selfoon vir ’n private beursieskakel, betaal-QR en transaksiegeskiedenis." : "Vra asseblief ’n Skou-kassier om jou kaart te lees en die koppeling na te gaan."}</p><a href="${customerLink}">Laai kaart of koppel beursie</a><p class="note">Jy het net ’n aktiveringskode van die kassier nodig wanneer jy ’n private beursieskakel wil skep. Geen rekeningregistrasie is nodig om aan te vul nie.</p><p class="note">Personeel: gebruik Skoukaart → Lees skoukaart in die iPhone-app, of die beursie-aanvulling in die personeel-app.</p></main></body></html>`;
  return new Response(request.method === 'HEAD' ? null : html, {status: valid ? 200 : 404, headers});
}
