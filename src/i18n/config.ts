import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import pcm from "./locales/pcm.json";

const STORAGE_KEY = "zikalyze_settings";

// Get saved language from localStorage
const getSavedLanguage = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Map language names to codes
      const langMap: Record<string, string> = {
        English: "en",
        Spanish: "es",
        French: "fr",
        German: "de",
        Chinese: "zh",
        Japanese: "ja",
        Pidgin: "pcm",
      };
      return langMap[parsed.language] || "en";
    }
  } catch {
    // Ignore errors
  }
  return "en";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    zh: { translation: zh },
    ja: { translation: ja },
    pcm: { translation: pcm },
  },
  lng: getSavedLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

// Language code to name mapping
export const languageNames: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Chinese",
  ja: "Japanese",
  pcm: "Pidgin",
};

// Name to code mapping
export const languageCodes: Record<string, string> = {
  English: "en",
  Spanish: "es",
  French: "fr",
  German: "de",
  Chinese: "zh",
  Japanese: "ja",
  Pidgin: "pcm",
};
