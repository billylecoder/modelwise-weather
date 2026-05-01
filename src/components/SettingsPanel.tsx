import { Settings } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUnits } from "@/contexts/UnitsContext";
import { useI18n } from "@/i18n";
import { TempUnit, PrecipUnit, WindUnit, PressureUnit, SnowUnit, unitLabels } from "@/lib/units";

const Group = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <div className="space-y-2">
    <h3 className="font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide">{label}</h3>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
              active
                ? "bg-primary text-primary-foreground glow-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

const SettingsPanel = () => {
  const { t } = useI18n();
  const { units, updateUnit, reset } = useUnits();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          title={t("settings")}
          aria-label={t("settings")}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </SheetTrigger>
      <SheetContent className="bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-heading">{t("unitsSettings")}</SheetTitle>
          <SheetDescription className="font-body text-xs">{t("unitsDescription")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Group<TempUnit>
            label={t("temperature")}
            value={units.temperature}
            onChange={(v) => updateUnit("temperature", v)}
            options={[
              { value: "C", label: unitLabels.temperature.C },
              { value: "F", label: unitLabels.temperature.F },
            ]}
          />
          <Group<PrecipUnit>
            label={t("precipitation")}
            value={units.precipitation}
            onChange={(v) => updateUnit("precipitation", v)}
            options={[
              { value: "mm", label: "mm" },
              { value: "cm", label: "cm" },
              { value: "in", label: "inches" },
            ]}
          />
          <Group<WindUnit>
            label={t("wind")}
            value={units.wind}
            onChange={(v) => updateUnit("wind", v)}
            options={[
              { value: "kmh", label: "km/h" },
              { value: "mph", label: "mph" },
              { value: "kt", label: "kt" },
              { value: "bf", label: "bf" },
            ]}
          />
          <Group<PressureUnit>
            label={t("pressure")}
            value={units.pressure}
            onChange={(v) => updateUnit("pressure", v)}
            options={[
              { value: "hPa", label: "hPa" },
              { value: "mb", label: "mb" },
            ]}
          />
          <Group<SnowUnit>
            label={t("snowfall")}
            value={units.snow}
            onChange={(v) => updateUnit("snow", v)}
            options={[
              { value: "cm", label: "cm" },
              { value: "in", label: "inches" },
              { value: "mm", label: "mm" },
            ]}
          />

          <button
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body underline-offset-2 hover:underline"
          >
            {t("resetDefaults")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
