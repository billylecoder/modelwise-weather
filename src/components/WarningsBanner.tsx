import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { fetchWarnings, type Warning, type WarningColor } from "@/data/warnings";

interface Props {
  lat: number;
  lon: number;
  country: string;
  locationName: string;
}

const COLOR_STYLES: Record<WarningColor, { bg: string; border: string; text: string; chip: string; icon: string }> = {
  green: {
    bg: "bg-emerald-500/10", border: "border-emerald-500/30",
    text: "text-emerald-100", chip: "bg-emerald-500/30 text-emerald-50", icon: "text-emerald-300",
  },
  yellow: {
    bg: "bg-yellow-500/10", border: "border-yellow-500/40",
    text: "text-yellow-100", chip: "bg-yellow-500/40 text-yellow-50", icon: "text-yellow-300",
  },
  orange: {
    bg: "bg-orange-500/15", border: "border-orange-500/40",
    text: "text-orange-100", chip: "bg-orange-500/50 text-orange-50", icon: "text-orange-300",
  },
  red: {
    bg: "bg-red-500/15", border: "border-red-500/50",
    text: "text-red-100", chip: "bg-red-500/60 text-red-50", icon: "text-red-300",
  },
  purple: {
    bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/50",
    text: "text-fuchsia-100", chip: "bg-fuchsia-500/60 text-fuchsia-50", icon: "text-fuchsia-300",
  },
};

const SEV_RANK: Record<string, number> = { extreme: 4, severe: 3, moderate: 2, minor: 1, unknown: 0 };

function resolveColor(w: Warning): WarningColor {
  if (w.source.toLowerCase().includes("spc")) return w.color;
  switch (w.severity) {
    case "extreme": return "red";
    case "severe": return "orange";
    case "moderate": return "yellow";
    case "minor": return "green";
    default: return w.color;
  }
}

export default function WarningsBanner({ lat, lon, country, locationName }: Props) {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWarnings(lat, lon, country, locationName)
      .then((w) => {
        if (cancelled) return;

        const now = Date.now();

        const filtered = w.filter((warn) => {
          const notExpired = !warn.expires || new Date(warn.expires).getTime() > now;
          const matchesRegion =
            !warn.area ||
            warn.area.toLowerCase().includes(locationName.toLowerCase()) ||
            warn.area.toLowerCase().includes(country.toLowerCase());
          return notExpired && matchesRegion;
        });

        const sorted = filtered.sort(
          (a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0)
        );

        setWarnings(sorted);
      })
      .catch(() => setWarnings([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [lat, lon, country, locationName]);

  if (loading || warnings.length === 0) return null;

  const top = warnings[0];
  const topStyle = COLOR_STYLES[resolveColor(top)];

  return (
    <div className={`rounded-xl border ${topStyle.border} ${topStyle.bg} backdrop-blur-sm overflow-hidden`}>
      <div className={`px-4 py-3 flex items-center gap-3 ${topStyle.text}`}>
        <AlertTriangle className={`w-5 h-5 shrink-0 ${topStyle.icon}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-heading font-bold ${topStyle.chip}`}>
              {top.severity}
            </span>
            <span className="text-[10px] uppercase tracking-wider opacity-70 font-body">{top.source}</span>
            <span className="font-heading font-semibold text-sm truncate">{top.event}</span>
          </div>
          {top.headline && <p className="text-xs opacity-90 mt-0.5 font-body line-clamp-1">{top.headline}</p>}
        </div>
        {warnings.length > 1 && (
          <span className={`text-[10px] px-2 py-1 rounded-full font-body ${topStyle.chip}`}>
            +{warnings.length - 1} more
          </span>
        )}
      </div>

      <div className="border-t border-border/20 divide-y divide-border/10">
        {warnings.map((w, i) => {
          const s = COLOR_STYLES[resolveColor(w)];
          const isOpen = expanded === i;
          return (
            <div key={i} className={`${s.bg}`}>
              <button
                onClick={() => setExpanded(isOpen ? null : i)}
                className={`w-full px-4 py-2 flex items-center gap-3 text-left ${s.text} hover:brightness-110 transition`}
              >
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${s.chip}`}>{w.severity}</span>
                <span className="text-[10px] opacity-70 font-body">{w.source}</span>
                <span className="font-heading font-medium text-xs flex-1 truncate">{w.event}</span>
                {w.area && <span className="text-[10px] opacity-70 hidden sm:inline truncate max-w-[40%]">{w.area}</span>}
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 opacity-70" /> : <ChevronDown className="w-3.5 h-3.5 opacity-70" />}
              </button>
              {isOpen && (
                <div className={`px-4 pb-3 pt-1 text-xs space-y-2 ${s.text}`}>
                  {w.headline && <p className="font-heading font-semibold">{w.headline}</p>}
                  {w.description && <p className="font-body whitespace-pre-line opacity-90">{w.description}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-75 text-[10px] font-body">
                    {w.area && <span>Area: {w.area}</span>}
                    {w.effective && <span>From: {new Date(w.effective).toLocaleString()}</span>}
                    {w.expires && <span>Until: {new Date(w.expires).toLocaleString()}</span>}
                    {w.url && (
                      <a href={w.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                        Source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
