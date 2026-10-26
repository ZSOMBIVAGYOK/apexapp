import React, { useState } from "react";
import {
  Card,
  Button,
  Badge,
  BottomSheet,
  Input,
  Select,
  showToast
} from "@shared/ui";
import {
  ShieldAlert,
  Plus,
  Trash2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

import {
  SupplementLogEntry,
  ThirdPartyCertification
} from "@shared/types/nutrition";
import {
  ANTI_DOPING_NOTICE,
  THIRD_PARTY_CERTS
} from "@shared/lib/nutrition";

const INITIAL_SUPPLEMENTS: SupplementLogEntry[] = [
  {
    id: "sup_1",
    athleteId: "athlete-self",
    name: "Whey Isolate 90",
    brand: "BioTechUSA Iso Whey Zero",
    batchNumber: "L-240918-B",
    dosage: "30g (1 adagolókanál)",
    timing: "post_workout",
    thirdPartyCert: "informed_sport",
    expiryDate: "2027-04",
    notes: "Edzés utáni regenerációhoz 300ml vízben.",
    loggedAt: "2026-10-20T08:00:00Z"
  },
  {
    id: "sup_2",
    athleteId: "athlete-self",
    name: "Kreatin-monohidrát (Creapure)",
    brand: "Reflex Nutrition Creapure",
    batchNumber: "CREA-89914",
    dosage: "5g",
    timing: "morning",
    thirdPartyCert: "informed_sport",
    expiryDate: "2027-11",
    notes: "Napi fenntartó adag reggeli mellé.",
    loggedAt: "2026-10-15T09:00:00Z"
  },
  {
    id: "sup_3",
    athleteId: "athlete-self",
    name: "D3-vitamin + K2 (4000 NE)",
    brand: "GAL D3-vitamin cseppek",
    batchNumber: "GAL-D3-202611",
    dosage: "4 csepp (4000 NE)",
    timing: "morning",
    thirdPartyCert: "none",
    expiryDate: "2026-12",
    notes: "Téli mikrotápanyag pótlás, laborvizsgálat alapján.",
    loggedAt: "2026-10-01T08:30:00Z"
  }
];

export const SupplementsTab: React.FC = () => {
  const [supplements, setSupplements] = useState<SupplementLogEntry[]>(INITIAL_SUPPLEMENTS);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [dosage, setDosage] = useState("");
  const [timing, setTiming] = useState<SupplementLogEntry["timing"]>("morning");
  const [cert, setCert] = useState<ThirdPartyCertification>("informed_sport");
  const [notes, setNotes] = useState("");

  const handleAddSupplement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newEntry: SupplementLogEntry = {
      id: `sup_${Date.now()}`,
      athleteId: "athlete-self",
      name: name.trim(),
      brand: brand.trim(),
      batchNumber: batchNumber.trim() || "Nincs megadva",
      dosage: dosage.trim() || "1 adag",
      timing,
      thirdPartyCert: cert,
      notes: notes.trim() || undefined,
      loggedAt: new Date().toISOString()
    };

    setSupplements([newEntry, ...supplements]);
    setShowAddModal(false);
    setName("");
    setBrand("");
    setBatchNumber("");
    setDosage("");
    setNotes("");

    showToast({
      title: "Kiegészítő rögzítve",
      message: `${newEntry.name} (Tételszám: ${newEntry.batchNumber})`,
      type: "success"
    });
  };

  const handleDelete = (id: string) => {
    setSupplements(supplements.filter((s) => s.id !== id));
    showToast({
      title: "Kiegészítő törölve",
      type: "info"
    });
  };

  const timingLabels: Record<SupplementLogEntry["timing"], string> = {
    morning: "Reggel",
    pre_workout: "Edzés előtt",
    post_workout: "Edzés után",
    evening: "Este",
    with_meal: "Étkezéssel"
  };

  return (
    <div className="space-y-6">
      {/* PERMANENT, UN-DISMISSIBLE ANTI-DOPING WARNING */}
      <div className="rounded-20 border-2 border-status-rest/30 bg-status-rest/10 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-12 bg-status-rest/20 text-status-rest shrink-0 mt-0.5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-13 font-bold uppercase tracking-wider text-status-rest">
                {ANTI_DOPING_NOTICE.titleHu}
              </h3>
              <Badge variant="rest" size="sm">
                Szigorú felelősség
              </Badge>

            </div>
            <p className="text-12 leading-relaxed text-text-primary">
              {ANTI_DOPING_NOTICE.bodyHu}
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-11 text-text-secondary">
              <a
                href="https://www.antidopping.hu"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand font-medium hover:underline"
              >
                HUNADO Tiltólista ellenőrző <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://sport.wetestyoutrust.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand font-medium hover:underline"
              >
                Informed Sport tételkereső <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.koelnerliste.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand font-medium hover:underline"
              >
                Kölner Liste adatbázis <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Header and Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-16 font-bold text-text-primary">
            Aktív táplálékkiegészítő napló ({supplements.length})
          </h3>
          <p className="text-12 text-text-secondary">
            Rögzítsd a termékek tételszámát (batch number) az esetleges vizsgálati auditokhoz.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Új kiegészítő
        </Button>
      </div>

      {/* List of Supplements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supplements.map((sup) => {
          const certInfo = THIRD_PARTY_CERTS[sup.thirdPartyCert];
          return (
            <Card key={sup.id} variant="surface" radius="20" className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-15 font-bold text-text-primary">
                      {sup.name}
                    </h4>
                  </div>
                  <span className="text-12 text-text-secondary block mt-0.5">
                    {sup.brand}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(sup.id)}
                  className="p-1.5 text-text-tertiary hover:text-status-rest transition-colors rounded-8"
                  title="Törlés"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Batch number & Timing tags */}
              <div className="space-y-2 pt-2 border-t border-border-hairline text-12">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Tételszám (Batch):</span>
                  <span className="font-mono text-12 font-bold px-2 py-0.5 rounded-6 bg-bg-elevated border border-border-hairline text-text-primary">
                    {sup.batchNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Adagolás:</span>
                  <span className="font-medium text-text-primary">{sup.dosage}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Időzítés:</span>
                  <span className="text-brand font-medium">{timingLabels[sup.timing]}</span>
                </div>
              </div>

              {/* 3rd party lab verification badge */}
              <div className="pt-2 border-t border-border-hairline">
                <div className="flex items-center gap-2">
                  {certInfo.trusted ? (
                    <ShieldCheck className="w-4 h-4 text-status-ready shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-status-caution shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span
                      className={`text-11 font-semibold block truncate ${
                        certInfo.trusted ? "text-status-ready" : "text-status-caution"
                      }`}
                    >
                      {certInfo.labelHu}
                    </span>
                    <span className="text-[10px] text-text-tertiary block truncate">
                      {certInfo.descriptionHu}
                    </span>
                  </div>
                </div>
              </div>

              {sup.notes && (
                <p className="text-11 text-text-secondary italic pt-1">
                  "{sup.notes}"
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Supplement BottomSheet */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Új kiegészítő rögzítése"
        description="Mindig ellenőrizd és írd be a termék dobozán szereplő tételszámot (Batch Number)!"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleAddSupplement} disabled={!name.trim()}>
              Mentés
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSupplement} className="space-y-4 py-2">
          <Input
            label="Kiegészítő megnevezése"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="pl. Tejsavófehérje izolátum"
            required
          />

          <Input
            label="Gyártó / Márka"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="pl. BioTechUSA, Reflex Nutrition, Thorne"
          />

          <div className="space-y-1">
            <Input
              label="Tételszám (Batch Number / LOT) *"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="pl. L-240918-B (a doboz alján vagy kupakján található)"
              required
            />
            <p className="text-10 text-text-tertiary">
              A WADA objektív felelősség elve miatt nélkülözhetetlen egy esetleges laborvizsgálat során.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Adagolás"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="pl. 1 adagolókanál (30g)"
            />
            <Select
              label="Időzítés"
              value={timing}
              onChange={(val) => setTiming(val as SupplementLogEntry["timing"])}
              options={[
                { value: "morning", label: "Reggel" },
                { value: "pre_workout", label: "Edzés előtt" },
                { value: "post_workout", label: "Edzés után" },
                { value: "evening", label: "Este" },
                { value: "with_meal", label: "Étkezéssel" }
              ]}
            />
          </div>

          <Select
            label="Független laboratóriumi tanúsítvány"
            value={cert}
            onChange={(val) => setCert(val as ThirdPartyCertification)}


            options={[
              { value: "informed_sport", label: "Informed Sport (LGC tesztelt)" },
              { value: "koelner_liste", label: "Kölner Liste (Kölni lista)" },
              { value: "nsf_sport", label: "NSF Certified for Sport" },
              { value: "bscg", label: "BSCG Certified Drug Free" },
              { value: "none", label: "Nincs független bevizsgálás (Kockázatos)" }
            ]}
          />

          <Input
            label="Megjegyzés / cél (opcionális)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="pl. Sportorvosi javaslatra"
          />
        </form>
      </BottomSheet>
    </div>
  );
};
