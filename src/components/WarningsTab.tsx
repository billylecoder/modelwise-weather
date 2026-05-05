import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { fetchWarnings, OFFICIAL_WX_SERVICE, type Warning, type WarningColor } from "@/data/warnings";
import { useI18n } from "@/i18n";

interface Props {
  lat: number;
  lon: number;
  country: string;
  locationName: string;
}

const COLOR_STYLES: Record<WarningColor, { bg: string; border: string; text: string; chip: string; icon: string }> = {
  green:  { bg: "bg-emerald-500/10",  border: "border-emerald-500/30",  text: "text-emerald-100",  chip: "bg-emerald-500/30 text-emerald-50",  icon: "text-emerald-300" },
  yellow: { bg: "bg-yellow-500/10",   border: "border-yellow-500/40",   text: "text-yellow-100",   chip: "bg-yellow-500/40 text-yellow-50",    icon: "text-yellow-300" },
  orange: { bg: "bg-orange-500/15",   border: "border-orange-500/40",   text: "text-orange-100",   chip: "bg-orange-500/50 text-orange-50",    icon: "text-orange-300" },
  red:    { bg: "bg-red-500/15",      border: "border-red-500/50",      text: "text-red-100",      chip: "bg-red-500/60 text-red-50",          icon: "text-red-300" },
  purple: { bg: "bg-fuchsia-500/15",  border: "border-fuchsia-500/50",  text: "text-fuchsia-100",  chip: "bg-fuchsia-500/60 text-fuchsia-50",  icon: "text-fuchsia-300" },
};

const SEV_RANK: Record<string, number> = { extreme: 4, severe: 3, moderate: 2, minor: 1, unknown: 0 };

export default function WarningsTab({ lat, lon, country, locationName }: Props) {
  const { t } = useI18n();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWarnings(lat, lon, country, locationName)
      .then((w) => {
        if (cancelled) return;
        setWarnings([...w].sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0)));
      })
      .catch(() => setWarnings([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [lat, lon, country, locationName]);

  const issuer = OFFICIAL_WX_SERVICE[(country ?? "").toUpperCase()];

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-heading font-semibold text-base">{t("warningsTab")} — {locationName}</h2>
            {issuer && (
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                {t("warningsSourceLabel")}:{" "}
                <a href={issuer.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {issuer.name}
                </a>
              </p>
            )}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {!loading && warnings.length === 0 && (
        <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground font-body">
          {t("noWarnings")}
        </div>
      )}

      <div className="space-y-3">
        {warnings.map((w, i) => {
          const s = COLOR_STYLES[w.color];
          return (
            <div key={i} className={`rounded-xl border ${s.border} ${s.bg} ${s.text} p-4 space-y-2`}>
              <div className="flex items-center gap-2 flex-wrap">
                <AlertTriangle className={`w-4 h-4 ${s.icon}`} />
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-heading font-bold ${s.chip}`}>
                  {w.severity}
                </span>
                <span className="text-[10px] uppercase tracking-wider opacity-70 font-body">{w.source}</span>
                <span className="font-heading font-semibold text-sm">{w.event}</span>
              </div>
              {w.headline && <p className="font-heading font-semibold text-sm">{w.headline}</p>}
              {w.description && (
                <p className="font-body text-xs whitespace-pre-line opacity-90 leading-relaxed">{w.description}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-body opacity-75 pt-1">
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
          );
        })}
      </div>
    </div>
  );
}
