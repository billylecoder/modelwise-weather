import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { fetchWarnings, type Warning, type WarningColor } from "@/data/warnings";

interface Props {
  lat: number;
  lon: number;
  country: string;
  locationName: string;
}

const COLOR_STYLES: Record<WarningColor, { bg: string; border: string; text: string; icon: string }> = {
  green:  { bg: "bg-emerald-500/10",  border: "border-emerald-500/30",  text: "text-emerald-100",  icon: "text-emerald-300" },
  yellow: { bg: "bg-yellow-500/10",   border: "border-yellow-500/40",   text: "text-yellow-100",   icon: "text-yellow-300" },
  orange: { bg: "bg-orange-500/15",   border: "border-orange-500/40",   text: "text-orange-100",   icon: "text-orange-300" },
  red:    { bg: "bg-red-500/15",      border: "border-red-500/50",      text: "text-red-100",      icon: "text-red-300" },
  purple: { bg: "bg-fuchsia-500/15",  border: "border-fuchsia-500/50",  text: "text-fuchsia-100",  icon: "text-fuchsia-300" },
};

export default function WarningsBanner({ lat, lon, country, locationName }: Props) {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchWarnings(lat, lon, country, locationName)
      .then((w) => { if (!cancelled) setWarnings(w); })
      .catch(() => setWarnings([]))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [lat, lon, country, locationName]);

  if (loading || warnings.length === 0) return null;

  const top = warnings[0];
  const topStyle = COLOR_STYLES[top.color];

  return (
    <div className={`rounded-xl border ${topStyle.border} ${topStyle.bg} backdrop-blur-sm overflow-hidden`}>
      <div className={`px-4 py-3 flex items-center gap-3 ${topStyle.text}`}>
        <AlertTriangle className={`w-5 h-5 shrink-0 ${topStyle.icon}`} />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider opacity-70 font-body">{top.source}</span>
          <span className="font-heading font-semibold text-sm truncate">{top.event}</span>
        </div>
      </div>

      <div className="border-t border-border/20 divide-y divide-border/10">
        {warnings.map((w, i) => {
          const s = COLOR_STYLES[w.color];
          const isOpen = expanded === i;

          return (
            <div key={i} className={s.bg}>
              <button
                onClick={() => setExpanded(isOpen ? null : i)}
                className={`w-full px-4 py-2 flex items-center gap-3 text-left ${s.text}`}
              >
                <span className="text-[10px] opacity-70 font-body">{w.source}</span>
                <span className="font-heading font-medium text-xs flex-1 truncate">{w.event}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isOpen && w.description && (
                <div className={`px-4 pb-3 pt-1 text-xs ${s.text}`}>
                  <p className="font-body opacity-90">{w.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
