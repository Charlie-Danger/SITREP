/* ============================================================
   Service worker do SITREP Arganil
   ------------------------------------------------------------
   A regra que decide tudo: dados operacionais NUNCA saem de cache.
   Um painel de emergência que mostra ocorrências de ontem com ar de
   agora é pior do que um painel que diz honestamente que falhou.
   Só a aplicação e a cartografia são guardadas.
   ============================================================ */
var VER    = "sitrep-v1";
var SHELL  = VER + "-shell";
var TILES  = VER + "-tiles";
var TILE_MAX = 1200;          /* ~40 MB de tiles; cobre o concelho com folga */

/* a casca: o que faz a aplicação existir */
var APP = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
];

/* hosts cujas respostas são dados vivos: sempre da rede, nunca de cache */
var DADOS = [
  "api.fogos.pt",
  "services-eu1.arcgis.com",
  "api.open-meteo.com",
  "opendata.adsb.fi",
  "api.adsb.lol",
  "api.airplanes.live",
  "opensky-network.org",
  "api.planespotters.net",
  "adaguc.lsasvcs.ipma.pt",
  "adsbexchange-com1.p.rapidapi.com",
  "api.allorigins.win",
  "api.codetabs.com",
  "corsproxy.io",
  "workers.dev",
  "deno.dev"
];

/* cartografia: imagens estáveis, valem a pena guardar */
var MAPAS = [
  "server.arcgisonline.com",
  "tile.openstreetmap.org",
  "maps.effis.emergency.copernicus.eu"
];

function ehDe(url, lista){
  try {
    var h = new URL(url).hostname;
    return lista.some(function(d){ return h === d || h.endsWith("." + d); });
  } catch(e){ return false; }
}

self.addEventListener("install", function(ev){
  ev.waitUntil(
    caches.open(SHELL).then(function(c){
      /* um recurso em falta não pode impedir a instalação inteira */
      return Promise.all(APP.map(function(u){
        return c.add(new Request(u, { cache:"reload" })).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(ev){
  ev.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.filter(function(k){
        return k.indexOf(VER) !== 0;
      }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* mantém a cache de tiles abaixo do limite, descartando as mais antigas */
function podarTiles(){
  caches.open(TILES).then(function(c){
    c.keys().then(function(ks){
      if (ks.length <= TILE_MAX) return;
      var excesso = ks.length - TILE_MAX;
      for (var i = 0; i < excesso; i++) c.delete(ks[i]);
    });
  });
}

self.addEventListener("fetch", function(ev){
  var req = ev.request;
  if (req.method !== "GET") return;

  /* 1. dados operacionais: só rede. Nunca servir leituras antigas. */
  if (ehDe(req.url, DADOS)) return;

  /* 2. cartografia: cache primeiro, e o que for novo é guardado */
  if (ehDe(req.url, MAPAS)){
    ev.respondWith(
      caches.open(TILES).then(function(c){
        return c.match(req).then(function(hit){
          if (hit) return hit;
          return fetch(req).then(function(res){
            if (res && (res.ok || res.type === "opaque")){
              c.put(req, res.clone());
              podarTiles();
            }
            return res;
          }).catch(function(){
            /* sem rede e sem tile guardado: devolve vazio em vez de erro */
            return new Response("", { status:504, statusText:"tile indisponível" });
          });
        });
      })
    );
    return;
  }

  /* 3. a aplicação: rede primeiro para apanhar versões novas,
        cache como rede de segurança quando não há ligação */
  ev.respondWith(
    fetch(req).then(function(res){
      if (res && res.ok && (req.url.indexOf(self.registration.scope) === 0 ||
                            req.url.indexOf("cdnjs.cloudflare.com") >= 0 ||
                            req.url.indexOf("fonts.g") >= 0)){
        var copia = res.clone();
        caches.open(SHELL).then(function(c){ c.put(req, copia); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status:504 });
      });
    })
  );
});

/* permite à página forçar a atualização sem esperar pelo ciclo normal */
self.addEventListener("message", function(ev){
  if (ev.data === "skipWaiting") self.skipWaiting();
});
