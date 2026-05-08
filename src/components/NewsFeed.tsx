import { useEffect, useState } from "react";
import { Newspaper, ExternalLink, Loader2 } from "lucide-react";
import { fetchWeatherNews, type NewsItem } from "@/data/news";
import { useI18n } from "@/i18n";

interface Props {
  country?: string;
  variant?: "full" | "compact";
  limit?: number;
  className?: string;
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NewsFeed({ country, variant = "full", limit = 12, className = "" }: Props) {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWeatherNews(country, lang)
      .then((n) => { if (!cancelled) setItems(n.slice(0, limit)); })
      .catch(() => setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [country, lang, limit]);

  const compact = variant === "compact";

  return (
    <div className={`glass-card rounded-xl ${compact ? "p-4" : "p-5"} ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="w-4 h-4 text-primary" />
        <h2 className={`font-heading font-semibold ${compact ? "text-xs" : "text-sm"}`}>
          {t("newsTab")}
        </h2>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />}
      </div>

      {!loading && items.length === 0 && (
        <p className="text-xs text-muted-foreground font-body">{t("noNews")}</p>
      )}

      <ul className="space-y-2.5">
        {items.map((n, i) => (
          <li key={i} className="border-b border-border/30 last:border-0 pb-2.5 last:pb-0">
            <a
              href={n.link}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-2 hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3 mt-1 shrink-0 opacity-50 group-hover:opacity-100" />
              <div className="min-w-0 flex-1">
                <p className={`font-heading font-medium ${compact ? "text-xs" : "text-sm"} leading-snug`}>
                  {n.title}
                </p>
                {!compact && n.description && (
                  <p className="text-[11px] text-muted-foreground font-body mt-1 line-clamp-2">
                    {n.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-body">
                  {n.source && <span>{n.source}</span>}
                  {n.pubDate && <span>· {timeAgo(n.pubDate)}</span>}
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <p className="text-[10px] text-muted-foreground font-body mt-3 pt-2 border-t border-border/30">
        {t("newsCredit")}
      </p>
    </div>
  );
}
