import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { SpecialistStaff } from "@shared/types";
import { Users, Send, CheckCircle2, UserPlus } from "lucide-react";

export const CoachPage: React.FC = () => {
  const { t } = useTranslation();

  const [staffList, setStaffList] = useState<SpecialistStaff[]>([
    {
      id: "staff-1",
      name: "Dr. Varga Tamás",
      roleTitle: t("coach.headCoach"),
      discipline: "strength_coach",
      email: "varga.tamas@apex.hu",
      status: "active"
    },
    {
      id: "staff-2",
      name: "Molnár Eszter",
      roleTitle: t("coach.dietitian"),
      discipline: "dietitian",
      email: "eszter.diet@apex.hu",
      status: "active"
    },
    {
      id: "staff-3",
      name: "Kiss Péter",
      roleTitle: t("coach.physiotherapist"),
      discipline: "physiotherapist",
      email: "peter.physio@apex.hu",
      status: "active"
    }
  ]);

  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackNote.trim()) return;
    setFeedbackSuccess(true);
    setFeedbackNote("");
    setTimeout(() => setFeedbackSuccess(false), 3000);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const newStaff: SpecialistStaff = {
      id: `staff-${Date.now()}`,
      name: inviteEmail.split("@")[0] || "Új Szakember",
      roleTitle: t("coach.physician"),
      discipline: "physician",
      email: inviteEmail.trim(),
      status: "invited"
    };
    setStaffList([...staffList, newStaff]);
    setInviteEmail("");
    setShowInviteModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">{t("coach.title")}</h1>
            <p className="text-xs text-slate-400 sm:text-sm">{t("coach.subtitle")}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowInviteModal(!showInviteModal)}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-purple-500 shadow-md shadow-purple-600/20"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {t("coach.inviteSpecialist")}
        </button>
      </div>

      {showInviteModal && (
        <form
          onSubmit={handleInvite}
          className="rounded-2xl border border-purple-500/30 bg-slate-900/90 p-5 shadow-xl space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-200">{t("coach.inviteSpecialist")}</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="szakember@apex.hu"
              className="flex-1 rounded-lg border border-brand-muted bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500"
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {staffList.map((staff) => (
          <div
            key={staff.id}
            className="rounded-2xl border border-brand-muted bg-brand-card p-5 shadow-lg space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-400 border border-purple-500/20">
                  {staff.roleTitle}
                </span>
                <h2 className="text-base font-bold text-slate-100 mt-2">{staff.name}</h2>
                <p className="text-xs text-slate-400">{staff.email}</p>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  staff.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {staff.status === "active" ? "Aktív" : "Meghívva"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Feedback Note to Team */}
      <div className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-200">{t("coach.feedback")}</h2>

        {feedbackSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("coach.feedbackSent")}</span>
          </div>
        )}

        <form onSubmit={handleSendFeedback} className="space-y-3">
          <textarea
            rows={3}
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
            placeholder="Oszd meg az edzővel és a csapattal a mai érzést, fáradtságot vagy észrevételt..."
            className="w-full rounded-xl border border-brand-muted bg-slate-900/80 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 transition-colors"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Küldés
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoachPage;
