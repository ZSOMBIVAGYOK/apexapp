import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import hu from "./locales/hu.json";
import en from "./locales/en.json";

export const defaultNS = "translation";
export const resources = {
  hu: {
    translation: hu
  },
  en: {
    translation: en
  }
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "hu",
    lng: "hu", // Default language Hungarian
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"]
    }
  });

export default i18n;
