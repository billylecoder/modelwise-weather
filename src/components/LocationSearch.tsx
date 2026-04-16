import { useState, useRef, useEffect, useCallback } from "react";
import { Search, MapPin, Loader2, Navigation } from "lucide-react";
import { Location } from "@/data/weatherApi";
import { useI18n } from "@/i18n";

interface GeoResult {
  id: number;
  name: string;
  country: string;
  country_code: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

interface Props {
  currentLocation: Location;
  onSelectLocation: (loc: Location) => void;
}

const flagEmoji = (code: string) => {
  const cc = code.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
};

const COORD_REGEX = /^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/;

function parseCoords(input: string): { lat: number; lon: number } | null {
  const match = input.trim().match(COORD_REGEX);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat, lon };
}

function validateCoords(lat: number, lon: number): string | null {
  if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90";
  if (lon < -180 || lon > 180) return "Longitude must be between -180 and 180";
  return null;
}

export default function LocationSearch({ currentLocation, onSelectLocation }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordHint, setCoordHint] = useState<{ lat: number; lon: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en`
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const items: GeoResult[] = data.results ?? [];
      setResults(items);
      if (items.length === 0) setError(t("locationNotFound"));
    } catch {
      setResults([]);
      setError(t("locationError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    // Check if input looks like coordinates
    const coords = parseCoords(trimmed);
    if (coords) {
      setResults([]);
      setLoading(false);
      const validationError = validateCoords(coords.lat, coords.lon);
      if (validationError) {
        setError(validationError);
        setCoordHint(null);
      } else {
        setError(null);
        setCoordHint(coords);
      }
      return;
    }

    setCoordHint(null);

    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (r: GeoResult) => {
    const name = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
    onSelectLocation({ name, lat: r.latitude, lon: r.longitude, country: r.country_code });
    setQuery("");
    setOpen(false);
    setResults([]);
    setCoordHint(null);
  };

  const applyCoords = (lat: number, lon: number) => {
    onSelectLocation({ name: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`, lat, lon, country: "" });
    setQuery("");
    setOpen(false);
    setResults([]);
    setCoordHint(null);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-2">
      <MapPin className="w-4 h-4 text-primary shrink-0" />
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 hover:text-primary transition-colors text-sm font-body"
      >
        <span className="font-heading font-semibold">{currentLocation.name}</span>
        <span className="text-xs text-muted-foreground">
          ({currentLocation.lat.toFixed(2)}°, {currentLocation.lon.toFixed(2)}°)
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-80 rounded-lg border border-border/50 bg-card shadow-xl z-[100] overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchOrCoords")}
                className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md bg-background border border-border/50 outline-none focus:border-primary/50 font-body"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setQuery("");
                  }
                  if (e.key === "Enter" && coordHint) {
                    applyCoords(coordHint.lat, coordHint.lon);
                  }
                }}
              />
            </div>
          </div>

          {/* Coordinate hint */}
          {coordHint && (
            <button
              onClick={() => applyCoords(coordHint.lat, coordHint.lon)}
              className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors flex items-center gap-2 text-sm"
            >
              <Navigation className="w-4 h-4 text-primary" />
              <div className="min-w-0 flex-1">
                <span className="font-heading font-medium">{t("goToCoords")}</span>
                <span className="text-muted-foreground ml-1.5">
                  {coordHint.lat.toFixed(4)}°, {coordHint.lon.toFixed(4)}°
                </span>
              </div>
            </button>
          )}

          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> {t("searchingLocations")}
            </div>
          )}
          {error && !loading && (
            <div className="px-3 py-2 text-xs text-destructive">{error}</div>
          )}
          {!loading && results.map((r) => (
            <button
              key={r.id}
              onClick={() => select(r)}
              className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors flex items-center gap-2 text-sm"
            >
              <span className="text-base">{flagEmoji(r.country_code)}</span>
              <div className="min-w-0 flex-1">
                <span className="font-heading font-medium">{r.name}</span>
                {r.admin1 && (
                  <span className="text-muted-foreground">, {r.admin1}</span>
                )}
                <span className="text-muted-foreground"> — {r.country}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
