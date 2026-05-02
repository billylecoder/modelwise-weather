import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Loader2, Navigation, Cloud } from "lucide-react";
import { Location } from "@/data/weatherApi";
import { useI18n } from "@/i18n";
import LocationMap from "@/components/LocationMap";

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
  onSelect: (loc: Location) => void;
}

const COORD_REGEX = /^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/;

function parseCoords(input: string): { lat: number; lon: number } | null {
  const m = input.trim().match(COORD_REGEX);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

const flagEmoji = (code: string) => {
  if (!code) return "📍";
  const cc = code.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
};

export default function LocationPickerScreen({ onSelect }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lon: number; name: string; country: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`
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
    const coords = parseCoords(trimmed);
    if (coords) {
      setResults([]);
      setError(null);
      setPin({ lat: coords.lat, lon: coords.lon, name: `${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°`, country: "" });
      return;
    }
    if (trimmed.length < 2) { setResults([]); setError(null); return; }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const pickResult = (r: GeoResult) => {
    const name = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
    setPin({ lat: r.latitude, lon: r.longitude, name, country: r.country_code });
    setResults([]);
    setQuery(name);
  };

  const useGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: `${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`,
          country: "",
        });
      },
      () => setError(t("locationError"))
    );
  };

  const confirm = () => {
    if (!pin) return;
    onSelect({ name: pin.name, lat: pin.lat, lon: pin.lon, country: pin.country });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center glow-primary mx-auto">
            <Cloud className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-2xl">{t("appName")}</h1>
          <p className="text-sm text-muted-foreground font-body">{t("pickLocationTitle")}</p>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchOrCoords")}
              className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg bg-background border border-border/50 outline-none focus:border-primary/50 font-body"
              onKeyDown={(e) => { if (e.key === "Enter" && pin) confirm(); }}
            />
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> {t("searchingLocations")}
            </div>
          )}
          {error && !loading && <div className="text-xs text-destructive">{error}</div>}

          {results.length > 0 && (
            <div className="rounded-lg border border-border/40 overflow-hidden divide-y divide-border/30">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => pickResult(r)}
                  className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors flex items-center gap-2 text-sm"
                >
                  <span className="text-base">{flagEmoji(r.country_code)}</span>
                  <span className="font-heading font-medium">{r.name}</span>
                  {r.admin1 && <span className="text-muted-foreground">, {r.admin1}</span>}
                  <span className="text-muted-foreground">— {r.country}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={useGeolocation}
            className="text-xs text-primary hover:underline flex items-center gap-1.5 font-body"
          >
            <Navigation className="w-3.5 h-3.5" /> {t("useMyLocation")}
          </button>

          <div>
            <p className="text-[11px] text-muted-foreground font-body mb-2">{t("tapMapHint")}</p>
            <LocationMap
              lat={pin?.lat ?? 20}
              lon={pin?.lon ?? 0}
              zoom={pin ? 9 : 2}
              height={280}
              interactive
              onPick={(lat, lon) =>
                setPin({ lat, lon, name: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`, country: "" })
              }
            />
          </div>

          {pin && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-heading font-medium truncate">{pin.name}</span>
              </div>
              <button
                onClick={confirm}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-heading font-semibold hover:opacity-90 transition-opacity"
              >
                {t("confirmLocation")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
