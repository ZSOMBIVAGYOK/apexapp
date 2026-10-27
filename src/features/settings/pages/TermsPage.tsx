import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, Button, SectionHeader, Badge } from "@shared/ui";
import { ArrowLeft, AlertTriangle, ShieldCheck, HeartPulse, Trash2 } from "lucide-react";

export const TermsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 px-4">
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => navigate(-1)}
      >
        {t("common.back", "Vissza")}
      </Button>

      <SectionHeader
        title="Általános Felhasználási Feltételek"
        description="Apex Sportolói & Teljesítmény Menedzsment Rendszer Béta Verzió"
        badge={<Badge variant="caution">BÉTA 1.0</Badge>}
      />

      <div className="space-y-4">
        {/* Section 1: Beta Disclaimer */}
        <Card variant="surface" radius="20" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-text-primary">
            <AlertTriangle className="h-5 w-5 text-status-caution" aria-hidden="true" />
            <h2 className="text-16 font-bold">1. Tesztverzió (Nyílt Béta) Feltételei</h2>
          </div>
          <p className="text-14 leading-relaxed text-text-secondary">
            Az Apex webalkalmazás jelenleg meghívásos, illetve közvetlen hivatkozással elérhető nyílt béta fázisban üzemel. A szolgáltatás célja a sportolói edzéstervezés, regeneráció- és készenlét-elemzés gyakorlati tesztelése és finomhangolása. A béta fázisban a funkciók folyamatosan bővülhetnek, módosulhatnak vagy finomodhatnak.
          </p>
        </Card>

        {/* Section 2: Medical Disclaimer */}
        <Card variant="surface" radius="20" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-text-primary">
            <HeartPulse className="h-5 w-5 text-status-rest" aria-hidden="true" />
            <h2 className="text-16 font-bold">2. Nem Orvosi Tanácsadás</h2>
          </div>
          <p className="text-14 leading-relaxed text-text-secondary">
            Az alkalmazás által számított élettani mutatók (edzéskészenlét, HRV rmSSD, alvásminőség, edzésterhelési pontszámok és táplálkozási javaslatok) kizárólag sporttudományi és edzésmódszertani tájékoztatást szolgálnak. Az Apex nem orvosi eszköz, és semmilyen körülmények között nem minősül orvosi diagnózisnak, orvosi tanácsadásnak vagy orvosi kezelésnek. Fájdalom, sérülés, kimerültség vagy bármilyen egészségügyi probléma esetén haladéktalanul fordulj szakorvoshoz!
          </p>
        </Card>

        {/* Section 3: Data & GDPR */}
        <Card variant="surface" radius="20" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-text-primary">
            <ShieldCheck className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 className="text-16 font-bold">3. Egészségügyi Adatok Védelme és Hozzájárulás</h2>
          </div>
          <p className="text-14 leading-relaxed text-text-secondary">
            A rendszer használata során rögzített biometrikus és jólléti adatok (pulzus, alvás, testsúly, izomláz, táplálkozási napló) a GDPR 9. cikke szerinti különleges kategóriájú adatoknak minősülnek. Ezek feldolgozása kizárólag a sportoló kifejezett és önkéntes hozzájárulása alapján történik, kizárólag az edzések és a regeneráció támogatása céljából. Az adatokat harmadik félnek reklám vagy marketing céljára soha nem adjuk át.
          </p>
          <div className="rounded-12 border border-border-hairline bg-bg-elevated p-3 text-12 text-text-tertiary">
            Adattárolás helye: Google Cloud Európai Unió (EEA) szerverek, TLS 1.3 titkosított kommunikáció és AES-256 szintű adatbázis-védelem.
          </div>
        </Card>

        {/* Section 4: Export and Deletion */}
        <Card variant="surface" radius="20" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-text-primary">
            <Trash2 className="h-5 w-5 text-status-rest" aria-hidden="true" />
            <h2 className="text-16 font-bold">4. Fiók Törlése és Adathordozhatóság</h2>
          </div>
          <p className="text-14 leading-relaxed text-text-secondary">
            Minden sportolónak elidegeníthetetlen joga van adatai teljes ellenőrzésére: a Beállítások menüben egyetlen gombnyomással letöltheted teljes profilodat és edzésnaplódat szabványos JSON formátumban (GDPR Art. 20), illetve bármikor kérheted a fiókod és összes rögzített adatod azonnali, végleges és visszaállíthatatlan törlését (GDPR Art. 17).
          </p>
        </Card>
      </div>
    </div>
  );
};

export default TermsPage;
