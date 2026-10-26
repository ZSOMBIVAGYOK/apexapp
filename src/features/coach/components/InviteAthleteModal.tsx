import React, { useState } from "react";
import { BottomSheet, Button, Input, Select, showToast } from "@shared/ui";
import { Copy, Check, UserPlus, Sparkles } from "lucide-react";
import { MemberSpecialty } from "@shared/types/dataModel";
import { createSharingInvite } from "@shared/lib/sharing/sharingService";

export interface InviteAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteCreated?: (code: string) => void;
}

export const InviteAthleteModal: React.FC<InviteAthleteModalProps> = ({
  isOpen,
  onClose,
  onInviteCreated
}) => {
  const [athleteEmail, setAthleteEmail] = useState("");
  const [roleType, setRoleType] = useState<"athlete" | "specialist">("athlete");
  const [specialty, setSpecialty] = useState<MemberSpecialty>("nutrition");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const res = await createSharingInvite({
        memberRole: roleType === "athlete" ? "coach" : "specialist",
        specialty: roleType === "specialist" ? specialty : undefined,
        inviteeEmail: athleteEmail.trim() || undefined
      });

      setGeneratedCode(res.code);
      onInviteCreated?.(res.code);

      showToast({
        title: "Meghívókód sikeresen létrehozva",
        message: `Kód: ${res.code} (7 napig érvényes)`,
        type: "success"
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "A meghívókód generálása sikertelen.";
      showToast({
        title: "Hiba történt a meghívókód létrehozásakor",
        message: errorMsg,
        type: "error"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast({
      title: "Kód kimásolva a vágólapra",
      message: generatedCode,
      type: "info"
    });
  };

  const handleReset = () => {
    setGeneratedCode(null);
    setAthleteEmail("");
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleReset}
      title="Sportoló vagy Szakember meghívása"
      description="Hozz létre egy biztonságos, egyszer használatos meghívókódot a csapatod bővítéséhez."
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={handleReset}>
            {generatedCode ? "Kész" : "Mégse"}
          </Button>
          {!generatedCode && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerate}
              isLoading={isGenerating}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Meghívókód generálása
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {!generatedCode ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1">
              <label className="text-12 font-medium text-text-secondary">Meghívandó fél szerepköre</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRoleType("athlete")}
                  className={`p-3 rounded-12 text-13 font-semibold border transition-all text-left ${
                    roleType === "athlete"
                      ? "bg-brand/10 border-brand text-brand"
                      : "bg-surface-elevated/40 border-border-hairline text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Sportoló
                  <span className="block text-11 font-normal opacity-80 mt-0.5">
                    Edzésterv és felkészülés követése
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleType("specialist")}
                  className={`p-3 rounded-12 text-13 font-semibold border transition-all text-left ${
                    roleType === "specialist"
                      ? "bg-brand/10 border-brand text-brand"
                      : "bg-surface-elevated/40 border-border-hairline text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Szakember
                  <span className="block text-11 font-normal opacity-80 mt-0.5">
                    Dietetikus, gyógytornász, orvos...
                  </span>
                </button>
              </div>
            </div>

            {roleType === "specialist" && (
              <Select
                label="Szakterület"
                value={specialty}
                onChange={(val) => setSpecialty(val as MemberSpecialty)}
                options={[
                  { value: "nutrition", label: "Dietetikus / Sporttáplálkozási szakértő" },
                  { value: "physio", label: "Fizioterapeuta / Gyógytornász" },
                  { value: "strength", label: "Erőnléti edző" },
                  { value: "psychology", label: "Sportpszichológus" },
                  { value: "medical", label: "Sportorvos" },
                  { value: "other", label: "Egyéb szakember" }
                ]}
              />
            )}

            <Input
              type="email"
              label="E-mail cím (opcionális)"
              value={athleteEmail}
              onChange={(e) => setAthleteEmail(e.target.value)}
              placeholder="sportolo@apex.hu"
              hint="Ha megadod, a meghívókód csak erre az e-mail címre váltható be."
            />
          </form>
        ) : (
          <div className="space-y-4 text-center py-4">
            <div className="p-3.5 rounded-full bg-brand/10 text-brand w-max mx-auto">
              <Sparkles className="h-8 w-8" />
            </div>

            <div>
              <p className="text-12 text-text-secondary">Küldd el ezt a meghívókódot a sportolónak:</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-28 font-mono font-bold tracking-widest text-text-primary bg-surface-elevated px-4 py-2 rounded-14 border border-brand/30">
                  {generatedCode}
                </span>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleCopy}
                  leftIcon={copied ? <Check className="h-4 w-4 text-ready" /> : <Copy className="h-4 w-4" />}
                >
                  {copied ? "Másolva" : "Másolás"}
                </Button>
              </div>
            </div>

            <p className="text-11 text-text-tertiary">
              A kód <strong>7 napig érvényes</strong>. A sportoló a Regisztráció vagy a Profil &gt; Megosztás menüpontban válthatja be.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
