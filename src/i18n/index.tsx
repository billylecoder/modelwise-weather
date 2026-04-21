import React, { createContext, useContext, useState, useCallback } from "react";

type Lang = "en" | "el";

const translations = {
  en: {
    appName: "WeatherIntel",
    appSubtitle: "Multi-Model Intelligence",
    forecastTime: "Forecast Time",
    now: "Now",
    modelData: "Model Data",
    basic: "Basic",
    advanced: "Advanced",
    multiModelComparison: "Multi-Model Comparison",
    chartModels: "Chart Models",
    temperature: "Temperature",
    precipitation: "Precipitation",
    precipitationTotal: "Rain Total",
    windSpeed: "Wind Speed",
    windGusts: "Wind Gusts",
    pressure: "Pressure",
    humidity: "Humidity",
    dewPoint: "Dew Point",
    cape: "CAPE",
    temp850hPa: "Temp 850hPa",
    temp500hPa: "Temp 500hPa",
    apparentTemperature: "Feels Like",
    cloudCover: "Cloud Cover",
    snowfall: "Snow",
    referenceOverlay: "Reference overlay",
    rainfallComparison: "Rainfall comparison",
    models: "models",
    loading: "Loading weather models for",
    retry: "Retry",
    refreshData: "Refresh data",
    justNow: "Just now",
    mAgo: "m ago",
    hAgo: "h ago",
    highConfidence: "High Confidence",
    moderateConfidence: "Moderate Confidence",
    lowConfidence: "Low Confidence",
    parameters: "Parameters",
    date: "Date",
    searchLocation: "Search city…",
    searchOrCoords: "City name or lat, lon…",
    goToCoords: "Go to coordinates",
    locationNotFound: "Location not found",
    locationError: "Failed to search locations",
    searchingLocations: "Searching…",
    forecastWarning: "Forecast beyond 120h may be less reliable.",
    settings: "Settings",
    unitsSettings: "Unit Preferences",
    unitsDescription: "Choose units for each parameter. Values convert instantly.",
    wind: "Wind",
    resetDefaults: "Reset to defaults",
    hourlyForecast: "Next 24 Hours",
    fiveDayForecast: "5-Day Forecast",
  },
  el: {
    appName: "WeatherIntel",
    appSubtitle: "Πολυμοντελική Ανάλυση",
    forecastTime: "Χρόνος Πρόγνωσης",
    now: "Τώρα",
    modelData: "Δεδομένα Μοντέλου",
    basic: "Βασικά",
    advanced: "Προχωρημένα",
    multiModelComparison: "Σύγκριση Πολλαπλών Μοντέλων",
    chartModels: "Μοντέλα Γραφημάτων",
    temperature: "Θερμοκρασία",
    precipitation: "Υετός",
    precipitationTotal: "Σύνολο Βροχής",
    windSpeed: "Ταχύτητα Ανέμου",
    windGusts: "Ριπές Ανέμου",
    pressure: "Πίεση",
    humidity: "Υγρασία",
    dewPoint: "Σημείο Δρόσου",
    cape: "CAPE",
    temp850hPa: "Θερμ. 850hPa",
    temp500hPa: "Θερμ. 500hPa",
    apparentTemperature: "Αίσθηση",
    cloudCover: "Νεφοκάλυψη",
    snowfall: "Χιόνι",
    referenceOverlay: "Επικάλυψη αναφοράς",
    rainfallComparison: "Σύγκριση βροχόπτωσης",
    models: "μοντέλα",
    loading: "Φόρτωση μοντέλων για",
    retry: "Επανάληψη",
    refreshData: "Ανανέωση δεδομένων",
    justNow: "Μόλις τώρα",
    mAgo: "λ πριν",
    hAgo: "ω πριν",
    highConfidence: "Υψηλή Συμφωνία",
    moderateConfidence: "Μέτρια Συμφωνία",
    lowConfidence: "Χαμηλή Συμφωνία",
    parameters: "Παράμετροι",
    date: "Ημερομηνία",
    searchLocation: "Αναζήτηση πόλης…",
    searchOrCoords: "Όνομα πόλης ή lat, lon…",
    goToCoords: "Μετάβαση σε συντεταγμένες",
    locationNotFound: "Δεν βρέθηκε τοποθεσία",
    locationError: "Αποτυχία αναζήτησης",
    searchingLocations: "Αναζήτηση…",
    forecastWarning: "Η πρόγνωση πέραν των 120 ωρών μπορεί να είναι λιγότερο αξιόπιστη.",
    settings: "Ρυθμίσεις",
    unitsSettings: "Προτιμήσεις Μονάδων",
    unitsDescription: "Επιλέξτε μονάδες για κάθε παράμετρο. Οι τιμές μετατρέπονται άμεσα.",
    wind: "Άνεμος",
    resetDefaults: "Επαναφορά προεπιλογών",
    hourlyForecast: "Επόμενες 24 Ώρες",
    fiveDayForecast: "Πρόγνωση 5 Ημερών",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Lang>("en");

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[lang][key] ?? translations.en[key] ?? key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

// Map WeatherParam keys to translation keys
export const paramTranslationKey: Record<string, TranslationKey> = {
  temperature: "temperature",
  precipitation: "precipitation",
  precipitationTotal: "precipitationTotal",
  windSpeed: "windSpeed",
  windGusts: "windGusts",
  pressure: "pressure",
  humidity: "humidity",
  dewPoint: "dewPoint",
  cape: "cape",
  temp850hPa: "temp850hPa",
  temp500hPa: "temp500hPa",
  apparentTemperature: "apparentTemperature",
  cloudCover: "cloudCover",
  snowfall: "snowfall",
};
