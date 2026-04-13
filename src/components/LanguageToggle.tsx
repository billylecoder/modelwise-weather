import { useI18n } from "@/i18n";
import { Languages } from "lucide-react";

const LanguageToggle = () => {
  const { lang, setLang } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "el" : "en")}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
      title={lang === "en" ? "Μετάφραση στα Ελληνικά" : "Switch to English"}
    >
      <Languages className="w-3.5 h-3.5" />
      <span>{lang === "en" ? "EL" : "EN"}</span>
    </button>
  );
};

export default LanguageToggle;
