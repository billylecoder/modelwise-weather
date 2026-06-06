import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n";

/**
 * Embeds official NOAA outlook graphics:
 *  - SPC Convective Outlooks (Day 1/2/3)
 *  - NHC Tropical Weather Outlooks (Atlantic & East Pacific, 5-day)
 *
 * All imagery is public-domain NOAA content served from www.spc.noaa.gov
 * and www.nhc.noaa.gov, which permit hot-linking. Each card links to the
 * authoritative product page.
 */

interface OutlookCard {
  title: string;
  img: string;
  href: string;
  alt: string;
}

const SPC_CARDS: OutlookCard[] = [
  {
    title: "Day 1 Convective Outlook",
    img: "https://www.spc.noaa.gov/products/outlook/day1otlk.gif",
    href: "https://www.spc.noaa.gov/products/outlook/day1otlk.html",
    alt: "SPC Day 1 Convective Outlook",
  },
  {
    title: "Day 2 Convective Outlook",
    img: "https://www.spc.noaa.gov/products/outlook/day2otlk.gif",
    href: "https://www.spc.noaa.gov/products/outlook/day2otlk.html",
    alt: "SPC Day 2 Convective Outlook",
  },
  {
    title: "Day 3 Convective Outlook",
    img: "https://www.spc.noaa.gov/products/outlook/day3otlk.gif",
    href: "https://www.spc.noaa.gov/products/outlook/day3otlk.html",
    alt: "SPC Day 3 Convective Outlook",
  },
];

const NHC_CARDS: OutlookCard[] = [
  {
    title: "Atlantic — 7-Day Tropical Outlook",
    img: "https://www.nhc.noaa.gov/xgtwo/two_atl_7d0.png",
    href: "https://www.nhc.noaa.gov/gtwo.php?basin=atlc&fdays=7",
    alt: "NHC Atlantic 7-Day Tropical Weather Outlook",
  },
  {
    title: "East Pacific — 7-Day Tropical Outlook",
    img: "https://www.nhc.noaa.gov/xgtwo/two_pac_7d0.png",
    href: "https://www.nhc.noaa.gov/gtwo.php?basin=epac&fdays=7",
    alt: "NHC Eastern Pacific 7-Day Tropical Weather Outlook",
  },
];

function OutlookGrid({ cards, bust }: { cards: OutlookCard[]; bust: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map((c) => (
        <a
          key={c.title}
          href={c.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group block glass-card rounded-xl overflow-hidden border border-border/40 hover:border-primary/40 transition-colors"
        >
          <div className="aspect-[4/3] bg-muted/20 overflow-hidden flex items-center justify-center">
            <img
              src={`${c.img}?t=${bust}`}
              alt={c.alt}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="font-heading font-medium truncate">{c.title}</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </a>
      ))}
    </div>
  );
}

export default function NoaaOutlooks() {
  const { t } = useI18n();
  const [bust, setBust] = useState(() => Date.now());

  const refresh = () => setBust(Date.now());

  return (
    <section className="glass-card rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-sm">{t("noaaOutlooksTitle")}</h2>
          <p className="text-[11px] text-muted-foreground font-body mt-0.5">
            {t("noaaOutlooksSubtitle")}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh images"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-medium text-xs uppercase tracking-wide text-muted-foreground">
            {t("spcOutlooks")}
          </h3>
          <a
            href="https://www.spc.noaa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            spc.noaa.gov <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <OutlookGrid cards={SPC_CARDS} bust={bust} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-medium text-xs uppercase tracking-wide text-muted-foreground">
            {t("nhcOutlooks")}
          </h3>
          <a
            href="https://www.nhc.noaa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            nhc.noaa.gov <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <OutlookGrid cards={NHC_CARDS} bust={bust} />
      </div>
    </section>
  );
}
