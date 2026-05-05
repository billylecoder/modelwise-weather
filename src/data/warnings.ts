// Official weather warnings: NWS (US) + SPC severe outlooks + MeteoAlarm (EU)

export type WarningSeverity = "minor" | "moderate" | "severe" | "extreme" | "unknown";
export type WarningColor = "yellow" | "orange" | "red" | "purple" | "green";

export interface Warning {
  source: string;          // e.g. "NWS", "SPC", "MeteoAlarm"
  event: string;           // e.g. "Tornado Warning", "Slight Risk"
  headline?: string;
  description?: string;
  severity: WarningSeverity;
  color: WarningColor;
  effective?: string;
  expires?: string;
  area?: string;
  url?: string;
}

// MeteoAlarm country-code → feed slug (most common EU countries).
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
            event: best.props.LABEL2 ?? best.label,
            severity: SPC_RISK_SEV[best.label] ?? "unknown",
            color: SPC_RISK_COLOR[best.label] ?? "yellow",
            effective: best.props.VALID_ISO,
            expires: best.props.EXPIRE_ISO,
            description: `Convective outlook category: ${best.props.LABEL2 ?? best.label}.`,
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
  const slug = METEOALARM_FEEDS[country.toUpperCase()];
  if (!slug) return [];
  try {
    const res = await fetch(`https://feeds.meteoalarm.org/api/v1/warnings/${slug}`);
    if (!res.ok) return [];
    const data = await res.json();
    const out: Warning[] = [];
    const placeLower = (locationName ?? "").toLowerCase();
    for (const w of data?.warnings ?? []) {
      const infos = w?.alert?.info ?? [];
      // prefer english locale
      const info = infos.find((i: any) => (i.language ?? "").toLowerCase().startsWith("en")) ?? infos[0];
      if (!info) continue;
      const params: any[] = info.parameter ?? [];
      const lvl = params.find((p) => (p.valueName ?? "").toLowerCase().includes("awareness_level"))?.value
        ?? params.find((p) => (p.valueName ?? "").toLowerCase() === "awareness_level")?.value;
      const { sev, color } = meteoalarmLevelToSeverity(lvl);
      const areas = (info.area ?? []).map((a: any) => a.areaDesc).filter(Boolean);
      out.push({
        source: "MeteoAlarm",
        event: info.event ?? "Weather Warning",
        headline: info.headline,
        description: info.description,
        severity: sev,
        color,
        effective: info.effective ?? info.onset,
        expires: info.expires,
        area: areas.join(", "),
        url: info.web,
      });
      // tag relevance for sorting
      (out[out.length - 1] as any)._relevant =
        placeLower && areas.some((a: string) => placeLower.includes(a.toLowerCase()) || a.toLowerCase().includes(placeLower.split(",")[0].trim()));
    }
    // Relevant to selected place first, then by severity
    const sevOrder = { extreme: 4, severe: 3, moderate: 2, minor: 1, unknown: 0 } as const;
    out.sort((a, b) => {
      const ra = (a as any)._relevant ? 1 : 0;
      const rb = (b as any)._relevant ? 1 : 0;
      if (ra !== rb) return rb - ra;
      return sevOrder[b.severity] - sevOrder[a.severity];
    });
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
