import { useI18n } from "@/i18n";

const CreditsFooter = () => {
  const { t } = useI18n();
  return (
    <footer className="mt-8 pt-5 border-t border-border/40">
      <div className="glass-card rounded-xl p-5 space-y-2">
        <h3 className="font-heading font-semibold text-sm">{t("creditsTitle")}</h3>
        <p className="text-[11px] text-muted-foreground font-body">{t("creditsIntro")}</p>
        <ul className="text-[11px] text-muted-foreground font-body space-y-1 list-disc pl-4">
          <li>
            {t("creditWeather")}{" "}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              open-meteo.com
            </a>
          </li>
          <li>
            {t("creditAir")}{" "}
            <a
              href="https://atmosphere.copernicus.eu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              atmosphere.copernicus.eu
            </a>
          </li>
          <li>
            {t("creditGeo")}{" "}
            <a
              href="https://nominatim.openstreetmap.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              nominatim.openstreetmap.org
            </a>
          </li>
          <li>
            {t("creditMap")}{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              OSM
            </a>
            {" · "}
            <a
              href="https://carto.com/attribution"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CARTO
            </a>
          </li>
          <li>
            {t("creditIcons")}{" "}
            <a
              href="https://lucide.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              lucide.dev
            </a>
          </li>
        </ul>
        <p className="text-[10px] text-muted-foreground/70 font-body italic pt-1">
          {t("creditDisclaimer")}
        </p>
      </div>
    </footer>
  );
};

export default CreditsFooter;
