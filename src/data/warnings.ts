// Official weather warnings: NWS (US) + SPC severe outlooks + MeteoAlarm (EU)

export type WarningSeverity = "minor" | "moderate" | "severe" | "extreme" | "unknown";
export type WarningColor = "yellow" | "orange" | "red" | "purple" | "green";

export interface Warning {
  source: string;          // e.g. "NWS", "EMY (HNMS) via MeteoAlarm"
  event: string;
  headline?: string;
  description?: string;       // short (1–2 line) summary
  descriptionFull?: string;   // full official text
  severity: WarningSeverity;
  color: WarningColor;
  effective?: string;
  expires?: string;
  area?: string;
  url?: string;
  sortKey?: number;           // lower comes first within same color
}

// MeteoAlarm country-code → feed slug
const METEOALARM_FEEDS: Record<string, string> = {
  AT: "feeds-austria", BE: "feeds-belgium", BA: "feeds-bosnia-herzegovina",
  BG: "feeds-bulgaria", HR: "feeds-croatia", CY: "feeds-cyprus",
  CZ: "feeds-czechia", DK: "feeds-denmark", EE: "feeds-estonia",
  FI: "feeds-finland", FR: "feeds-france", DE: "feeds-germany",
  GR: "feeds-greece", HU: "feeds-hungary", IS: "feeds-iceland",
  IE: "feeds-ireland", IL: "feeds-israel", IT: "feeds-italy",
  LV: "feeds-latvia", LT: "feeds-lithuania", LU: "feeds-luxembourg",
  MT: "feeds-malta", MD: "feeds-moldova", ME: "feeds-montenegro",
  NL: "feeds-netherlands", MK: "feeds-north-macedonia", NO: "feeds-norway",
  PL: "feeds-poland", PT: "feeds-portugal", RO: "feeds-romania",
  RS: "feeds-serbia", SK: "feeds-slovakia", SI: "feeds-slovenia",
  ES: "feeds-spain", SE: "feeds-sweden", CH: "feeds-switzerland",
  UA: "feeds-ukraine", GB: "feeds-united-kingdom",
};

// Official national meteorological service for each country (issuer of warnings)
export const OFFICIAL_WX_SERVICE: Record<string, { name: string; url: string }> = {
  US: { name: "NWS / NOAA",                       url: "https://www.weather.gov/" },
  GB: { name: "Met Office",                       url: "https://www.metoffice.gov.uk/weather/warnings-and-advice" },
  IE: { name: "Met Éireann",                      url: "https://www.met.ie/warnings" },
  FR: { name: "Météo-France",                     url: "https://vigilance.meteofrance.fr/" },
  DE: { name: "DWD",                              url: "https://www.dwd.de/DE/wetter/warnungen/warnWetter_node.html" },
  AT: { name: "ZAMG / GeoSphere Austria",         url: "https://warnungen.zamg.at/" },
  CH: { name: "MeteoSwiss",                       url: "https://www.meteoswiss.admin.ch/weather/hazards.html" },
  IT: { name: "Servizio Meteo AM / Protezione Civile", url: "https://www.meteoam.it/" },
  ES: { name: "AEMET",                            url: "https://www.aemet.es/en/eltiempo/prediccion/avisos" },
  PT: { name: "IPMA",                             url: "https://www.ipma.pt/en/otempo/prev-sam/" },
  NL: { name: "KNMI",                             url: "https://www.knmi.nl/nederland-nu/weer/waarschuwingen" },
  BE: { name: "RMI / KMI",                        url: "https://www.meteo.be/en/belgium" },
  LU: { name: "MeteoLux",                         url: "https://www.meteolux.lu/" },
  DK: { name: "DMI",                              url: "https://www.dmi.dk/vejr/" },
  NO: { name: "MET Norway",                       url: "https://www.met.no/en" },
  SE: { name: "SMHI",                             url: "https://www.smhi.se/en/weather/sweden-weather/warnings" },
  FI: { name: "FMI",                              url: "https://en.ilmatieteenlaitos.fi/warnings" },
  IS: { name: "Veðurstofa Íslands",               url: "https://en.vedur.is/weather/forecasts/alerts/" },
  PL: { name: "IMGW",                             url: "https://meteo.imgw.pl/dyn/?osmet=true" },
  CZ: { name: "ČHMÚ",                             url: "https://www.chmi.cz/" },
  SK: { name: "SHMÚ",                             url: "https://www.shmu.sk/" },
  HU: { name: "OMSZ",                             url: "https://www.met.hu/idojaras/veszelyjelzes/" },
  RO: { name: "ANM",                              url: "https://www.meteoromania.ro/" },
  BG: { name: "NIMH",                             url: "https://www.meteo.bg/" },
  GR: { name: "EMY (HNMS)",                       url: "http://www.emy.gr/" },
  CY: { name: "Cyprus Department of Meteorology", url: "https://www.moa.gov.cy/ms" },
  HR: { name: "DHMZ",                             url: "https://meteo.hr/" },
  SI: { name: "ARSO",                             url: "https://meteo.arso.gov.si/" },
  RS: { name: "RHMSS",                            url: "https://www.hidmet.gov.rs/" },
  BA: { name: "FHMZ BiH",                         url: "https://www.fhmzbih.gov.ba/" },
  MK: { name: "UHMR",                             url: "https://uhmr.gov.mk/" },
  ME: { name: "ZHMS",                             url: "https://www.meteo.co.me/" },
  EE: { name: "Estonian Weather Service",         url: "https://www.ilmateenistus.ee/" },
  LV: { name: "LVĢMC",                            url: "https://videscentrs.lvgmc.lv/" },
  LT: { name: "LHMT",                             url: "https://www.meteo.lt/" },
  MT: { name: "MaltaMetOffice",                   url: "https://www.maltairport.com/weather/" },
  MD: { name: "SHS Moldova",                      url: "https://www.meteo.md/" },
  UA: { name: "UkrHMC",                           url: "https://www.meteo.gov.ua/" },
  IL: { name: "Israel Meteorological Service",    url: "https://ims.gov.il/en" },
};

// Public CORS proxies (chained as fallbacks). MeteoAlarm has no CORS headers.
const PROXIES = [
  (u: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u: string) => `https://r.jina.ai/${u}`,
];
async function fetchViaProxy(url: string): Promise<Response | null> {
  for (const wrap of PROXIES) {
    try {
      const r = await fetch(wrap(url));
      if (r.ok) return r;
    } catch {}
  }
  return null;
}

const SEVERITY_TO_COLOR: Record<WarningSeverity, WarningColor> = {
  minor: "yellow", moderate: "orange", severe: "red", extreme: "purple", unknown: "yellow",
};

// Map MeteoAlarm "awareness_level" param ("1; white" → green, "2; green", "3; yellow", "4; orange", "5; red")
function meteoalarmLevelToSeverity(lvl?: string): { sev: WarningSeverity; color: WarningColor } {
  if (!lvl) return { sev: "unknown", color: "yellow" };
  const n = parseInt(lvl, 10);
  if (n >= 5) return { sev: "extreme", color: "red" };
  if (n >= 4) return { sev: "severe", color: "orange" };
  if (n >= 3) return { sev: "moderate", color: "yellow" };
  if (n >= 2) return { sev: "minor", color: "green" };
  return { sev: "unknown", color: "yellow" };
}

// --- NWS (US) ---------------------------------------------------------------
async function fetchNWS(lat: number, lon: number): Promise<Warning[]> {
  const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
  const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
  if (!res.ok) return [];
  const data = await res.json();
  const features = data?.features ?? [];
  return features.map((f: any): Warning => {
    const p = f.properties ?? {};
    const sev = (p.severity ?? "unknown").toLowerCase() as WarningSeverity;
    const validSev: WarningSeverity = ["minor", "moderate", "severe", "extreme"].includes(sev) ? sev : "unknown";
    return {
      source: "NWS",
      event: p.event ?? "Weather Alert",
      headline: p.headline,
      description: p.description,
      severity: validSev,
      color: SEVERITY_TO_COLOR[validSev],
      effective: p.effective,
      expires: p.expires,
      area: p.areaDesc,
      url: p["@id"] ?? p.id,
    };
  });
}

// --- Point-in-polygon (ray casting) ----------------------------------------
function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > lat) !== (yj > lat) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function pointInPolygon(lon: number, lat: number, poly: number[][][]): boolean {
  if (!poly.length) return false;
  if (!pointInRing(lon, lat, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) if (pointInRing(lon, lat, poly[i])) return false;
  return true;
}
function pointInGeometry(lon: number, lat: number, geom: any): boolean {
  if (!geom) return false;
  if (geom.type === "Polygon") return pointInPolygon(lon, lat, geom.coordinates);
  if (geom.type === "MultiPolygon") return geom.coordinates.some((p: number[][][]) => pointInPolygon(lon, lat, p));
  return false;
}

// --- SPC severe outlooks (Day 1/2/3) ---------------------------------------
const SPC_DAYS = [
  { day: 1, url: "https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson" },
  { day: 2, url: "https://www.spc.noaa.gov/products/outlook/day2otlk_cat.lyr.geojson" },
  { day: 3, url: "https://www.spc.noaa.gov/products/outlook/day3otlk_cat.lyr.geojson" },
];

const SPC_RISK_COLOR: Record<string, WarningColor> = {
  TSTM: "green", MRGL: "green", SLGT: "yellow", ENH: "orange", MDT: "red", HIGH: "purple",
};
const SPC_RISK_SEV: Record<string, WarningSeverity> = {
  TSTM: "minor", MRGL: "minor", SLGT: "moderate", ENH: "moderate", MDT: "severe", HIGH: "extreme",
};

async function fetchSPC(lat: number, lon: number): Promise<Warning[]> {
  const out: Warning[] = [];
  await Promise.all(
    SPC_DAYS.map(async ({ day, url }) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        // Choose the highest-risk feature containing the point
        let best: { label: string; props: any } | null = null;
        const order = ["TSTM", "MRGL", "SLGT", "ENH", "MDT", "HIGH"];
        for (const f of data.features ?? []) {
          if (!pointInGeometry(lon, lat, f.geometry)) continue;
          const label = f.properties?.LABEL;
          if (!label) continue;
          if (!best || order.indexOf(label) > order.indexOf(best.label)) {
            best = { label, props: f.properties };
          }
        }
        if (best) {
          out.push({
            source: `SPC Day ${day}`,
            event: `Severe Weather Outlook — Day ${day}`,
            severity: SPC_RISK_SEV[best.label] ?? "unknown",
            color: SPC_RISK_COLOR[best.label] ?? "yellow",
            effective: best.props.VALID_ISO,
            expires: best.props.EXPIRE_ISO,
            url: `https://www.spc.noaa.gov/products/outlook/day${day}otlk.html`,
          });
        }
      } catch {}
    })
  );
  return out;
}

// --- MeteoAlarm (Europe) ---------------------------------------------------
async function fetchMeteoAlarm(country: string, locationName?: string): Promise<Warning[]> {
  const cc = country.toUpperCase();
  const slug = METEOALARM_FEEDS[cc];
  if (!slug) return [];
  const issuer = OFFICIAL_WX_SERVICE[cc];
  const sourceLabel = issuer ? `${issuer.name} via MeteoAlarm` : "MeteoAlarm";
  try {
    const url = `https://feeds.meteoalarm.org/api/v1/warnings/${slug}`;
    let res: Response | null = null;
    try {
      const r = await fetch(url);
      if (r.ok) res = r;
    } catch {}
    if (!res) res = await fetchViaProxy(url);
    if (!res) return [];

    const text = await res.text();
    const jsonStart = text.indexOf("{");
    if (jsonStart < 0) return [];
    let data: any;
    try { data = JSON.parse(text.slice(jsonStart)); } catch { return []; }

    const out: Warning[] = [];
    const now = Date.now();
    const tokens = (locationName ?? "")
      .toLowerCase()
      .split(/[,/]/)
      .map(s => s.trim())
      .filter(s => s.length >= 3);

    for (const w of data?.warnings ?? []) {
      const infos = w?.alert?.info ?? [];
      const info = infos.find((i: any) => (i.language ?? "").toLowerCase().startsWith("en")) ?? infos[0];
      if (!info) continue;

      const effectiveMs = info.effective || info.onset ? new Date(info.effective ?? info.onset).getTime() : NaN;
      const expiresMs = info.expires ? new Date(info.expires).getTime() : NaN;
      if (!Number.isNaN(expiresMs) && expiresMs < now) continue;
      if (!Number.isNaN(effectiveMs) && effectiveMs > now + 7 * 24 * 3600 * 1000) continue;

      const areas: string[] = (info.area ?? []).map((a: any) => a.areaDesc).filter(Boolean);
      // Strict area filter — only include warnings for the user's specific area
      if (tokens.length && areas.length) {
        const matches = areas.some((a) => {
          const al = a.toLowerCase();
          return tokens.some(t => al.includes(t) || t.includes(al));
        });
        if (!matches) continue;
      }

      const params: any[] = info.parameter ?? [];
      const lvl = params.find((p) => (p.valueName ?? "").toLowerCase().includes("awareness_level"))?.value
        ?? params.find((p) => (p.valueName ?? "").toLowerCase() === "awareness_level")?.value;
      const { sev, color } = meteoalarmLevelToSeverity(lvl);

      out.push({
        source: sourceLabel,
        event: info.event ?? "Weather Warning",
        headline: info.headline,
        description: info.description ?? info.instruction,
        severity: sev,
        color,
        effective: info.effective ?? info.onset,
        expires: info.expires,
        area: areas.join(", "),
        url: info.web ?? issuer?.url,
      });
    }
    const colorOrder = { purple: 4, red: 3, orange: 2, yellow: 1, green: 0 } as const;
    out.sort((a, b) => (colorOrder[b.color] ?? 0) - (colorOrder[a.color] ?? 0));
    return out;
  } catch {
    return [];
  }
}

export async function fetchWarnings(lat: number, lon: number, country: string, locationName?: string): Promise<Warning[]> {
  const cc = (country ?? "").toUpperCase();
  if (cc === "US") {
    const [nws, spc] = await Promise.all([fetchNWS(lat, lon), fetchSPC(lat, lon)]);
    return [...nws, ...spc];
  }
  return fetchMeteoAlarm(cc, locationName);
}
