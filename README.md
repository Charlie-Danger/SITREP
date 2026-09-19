# SITREP Arganil

Painel de consciência situacional para incêndios rurais no concelho de
Arganil e arredores. Página única, sem servidor próprio, sem base de
dados: tudo o que mostra é obtido no browser de quem a abre, a partir
de fontes públicas.

**Não é uma fonte oficial.** Em emergência: **112**.

---

## Publicar com HTTPS

Aberta a partir do disco (`file://`), metade das fontes recusa os
pedidos: o browser envia `Origin: null` e APIs como o fogos.pt e as
redes ADS-B rejeitam-no. Servida por HTTPS, a origem passa a ser
legítima e tudo funciona — além de ficarem disponíveis a
**geolocalização** e o **Wake Lock** (manter o ecrã aceso), que os
browsers só concedem em contexto seguro.

### GitHub Pages, sem linha de comandos

1. Criar um repositório **público** em <https://github.com/new>,
   por exemplo `sitrep-arganil`.
2. **Add file → Upload files**, arrastar `index.html` e este `README.md`,
   e confirmar (*Commit changes*).
3. **Settings → Pages**. Em *Source*, escolher **Deploy from a branch**,
   ramo `main`, pasta `/ (root)`. Guardar.
4. Um a dois minutos depois a página fica em
   `https://<utilizador>.github.io/sitrep-arganil/`

Esse endereço abre em qualquer telemóvel, sem instalar nada. Para
atualizar, substituir o `index.html` pelo mesmo caminho.

### Alternativa imediata

<https://app.netlify.com/drop> — arrastar a pasta para a página dá um
endereço HTTPS em segundos, sem conta. Bom para testar; o endereço é
aleatório e o alojamento temporário.

---

## Uso local

Também funciona servida a partir do próprio computador, o que basta
para uso pessoal na rede de casa:

```
python3 -m http.server 8000
```

e abrir `http://localhost:8000/index.html`. Nesse caso os pedidos
diretos passam, mas a geolocalização continua indisponível — só
`localhost` e HTTPS contam como contexto seguro, e o endereço
`192.168.x.x` que o telemóvel usa não é nenhum dos dois.

---

## Vistas

**SITREP** — mapa sobre satélite com ocorrências, vias condicionadas,
focos VIIRS e área ardida; painéis com ocorrências ordenadas por
distância, vento e propagação provável, aeronaves e descargas.

**Radar** — vista de instrumento: base escura com topónimos, anéis de
distância com passo que acompanha o zoom, escala de rumo, contactos
ADS-B com etiqueta e o eixo de descargas a vermelho.

Botão **Modo dia** inverte o mapa e troca as cores dos dados para
versões escuras — legível ao sol, que é onde isto costuma ser usado.

## Posição de referência

Por omissão, Arganil. Com HTTPS pede a posição real. Pode ser mudada
com o botão **Posição** e um clique no mapa, arrastando o marcador, com
o botão direito, ou com um toque longo no telemóvel. Distâncias, rumos,
anéis do radar e o raio de consulta às ocorrências passam a ser
calculados a partir daí.

---

## Fontes

| O quê | Origem | Notas |
|---|---|---|
| Ocorrências | PROCIV/ANEPC (ArcGIS) + api.fogos.pt | fundidas pelo número SADO comum |
| Vias condicionadas | naturezas do PROCIV (4305, 3301, 3313, 3321) | inferência, não registo de cortes |
| Meteorologia | Open-Meteo | vento a 10 m, sem correção orográfica |
| Cota do terreno | Open-Meteo Elevation | para a altura acima do solo |
| Focos e área ardida | EFFIS / Copernicus | ~2 passagens/dia |
| Potência radiativa e risco | LSA-SAF / IPMA (MSG/SEVIRI) | 15 em 15 min, pixel de ~3 km |
| Aeronaves | adsb.fi, adsb.lol, airplanes.live, OpenSky | em cascata; ADS-B Exchange opcional com chave |
| Fotografias | Planespotters | crédito ao fotógrafo incluído |

Cartografia: Esri (satélite, topográfico, Dark Gray Canvas) e
OpenStreetMap.

## Limites que importam

**Descargas são inferidas, não reportadas.** Nenhuma aeronave transmite
"larguei aqui". O que se deteta é um mínimo de altura acima do solo
seguido de subida, junto a uma ocorrência ativa. A altura resulta da
altitude ADS-B menos a cota do terreno, com a barométrica corrigida
pelo QNH e a geométrica pela ondulação do geoide (54 m, aproximação
para Portugal continental). O erro esperado anda nas dezenas de metros:
**uma descarga isolada não é de confiança — o sinal está no padrão
repetido.**

**Ausência de marcador nunca significa ausência do facto.** A cobertura
ADS-B no interior é irregular e um corte de estrada decidido no terreno
pela GNR pode nunca chegar a nenhuma base de dados.

**A área ardida MODIS só deteta manchas acima de ~40 ha.** Um incêndio
pequeno não aparece nessa camada — não é avaria. Os hectares por
ocorrência vêm do ICNF e são bem mais finos.

## Chave do ADS-B Exchange

Opcional e paga. É guardada apenas no `localStorage` do browser de quem
a introduz, nunca no ficheiro — a página pode ser partilhada sem
partilhar a subscrição. Pedidos autenticados não passam por proxy, para
a chave não ser exposta a terceiros.

Sem chave, as quatro redes comunitárias são usadas em cascata, sem
quota e sem custo.
