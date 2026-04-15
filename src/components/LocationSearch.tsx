import { useState, useRef, useEffect, useCallback } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
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

export default function LocationSearch({ currentLocation, onSelectLocation }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (query.trim().length < 2) {
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
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2 text-sm font-body text-foreground">
        <MapPin className="w-4 h-4 text-primary" />
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <span className="font-heading font-semibold">{currentLocation.name}</span>
            <span className="text-xs text-muted-foreground">
              ({currentLocation.lat.toFixed(2)}°, {currentLocation.lon.toFixed(2)}°)
            </span>
          </button>
        ) : (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchLocation")}
              className="w-56 pl-7 pr-2 py-1 text-sm rounded-md bg-background border border-border/50 outline-none focus:border-primary/50 font-body"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
            />
          </div>
        )}
      </div>

      {open && (results.length > 0 || error || loading) && (
        <div className="absolute top-full mt-1 left-0 w-72 rounded-lg border border-border/50 bg-card shadow-xl z-[100] overflow-hidden">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> {t("searchingLocations")}
            </div>
          )}
          {error && !loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">{error}</div>
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
