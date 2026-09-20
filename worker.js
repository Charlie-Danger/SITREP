/* ============================================================
   Proxy CORS para o SITREP — Cloudflare Worker
   ------------------------------------------------------------
   Porquê: as redes ADS-B (adsb.fi, adsb.lol, airplanes.live,
   OpenSky) e o api.fogos.pt não enviam cabeçalhos CORS. Um
   browser nunca lhes chega em direto, nem a partir de HTTPS.
   Os proxies públicos servem de recurso, mas são partilhados e
   caem com frequência — foi o que deixou o painel 34 segundos
   à espera antes de desistir.

   Este Worker corre na rede da Cloudflare, é gratuito até
   100.000 pedidos por dia, e só aceita os domínios listados
   abaixo — não é um proxy aberto que qualquer um possa abusar.

   COMO PUBLICAR (5 minutos, sem instalar nada):
     1. Conta gratuita em dash.cloudflare.com
     2. Compute (Workers) → Create → Start from Hello World
     3. Apagar o código de exemplo e colar este ficheiro inteiro
     4. Deploy
     5. Copiar o endereço que aparece, algo como
        https://sitrep-proxy.<o-teu-nome>.workers.dev
     6. No painel: Posição → não; botão Chave → campo "Proxy
        próprio" → colar o endereço → Guardar

   Depois disso o painel usa este proxy primeiro e só recorre
   aos públicos se ele falhar.
   ============================================================ */

/* Só estes domínios são reencaminhados. Sem esta lista, o Worker
   seria um proxy aberto e acabaria a servir tráfego alheio. */
const PERMITIDOS = [
  "api.fogos.pt",
  "opendata.adsb.fi",
  "api.adsb.lol",
  "api.airplanes.live",
  "opensky-network.org",
  "api.planespotters.net",
  "services-eu1.arcgis.com",
  "api.open-meteo.com",
  "api.ipma.pt",
  "adaguc.lsasvcs.ipma.pt",
  "api.bigdatacloud.net"
];

/* Opcional: restringir a origem. Deixar vazio aceita qualquer uma;
   pôr aqui o endereço do teu GitHub Pages impede que outros sites
   usem este Worker. Exemplo: "https://utilizador.github.io" */
const ORIGEM_PERMITIDA = "";

function permitido(alvo) {
  try {
    const h = new URL(alvo).hostname;
    return PERMITIDOS.some(d => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
}

function cabecalhos(origem) {
  return {
    "Access-Control-Allow-Origin": ORIGEM_PERMITIDA || origem || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store"
  };
}

export default {
  async fetch(request) {
    const origem = request.headers.get("Origin") || "";

    if (ORIGEM_PERMITIDA && origem && origem !== ORIGEM_PERMITIDA) {
      return new Response("origem não autorizada", { status: 403 });
    }

    // preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cabecalhos(origem) });
    }
    if (request.method !== "GET") {
      return new Response("só GET", { status: 405, headers: cabecalhos(origem) });
    }

    const alvo = new URL(request.url).searchParams.get("url");
    if (!alvo) {
      return new Response(
        "Proxy CORS do SITREP. Uso: ?url=<endereço>\n\n" +
        "Domínios servidos:\n  " + PERMITIDOS.join("\n  "),
        { status: 400, headers: { ...cabecalhos(origem), "Content-Type": "text/plain; charset=utf-8" } }
      );
    }
    if (!permitido(alvo)) {
      return new Response("domínio não permitido", { status: 403, headers: cabecalhos(origem) });
    }

    try {
      /* 12 s: acima disto o painel já desistiu na mesma */
      const resposta = await fetch(alvo, {
        method: "GET",
        headers: { "Accept": "application/json", "User-Agent": "sitrep-proxy/1.0" },
        signal: AbortSignal.timeout(12000),
        cf: { cacheTtl: 5, cacheEverything: false }   /* 5 s trava rajadas sem servir dados velhos */
      });

      const corpo = await resposta.arrayBuffer();
      return new Response(corpo, {
        status: resposta.status,
        headers: {
          ...cabecalhos(origem),
          "Content-Type": resposta.headers.get("Content-Type") || "application/json"
        }
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ erro: "falha ao contactar a origem", detalhe: String(e) }),
        { status: 502, headers: { ...cabecalhos(origem), "Content-Type": "application/json" } }
      );
    }
  }
};
