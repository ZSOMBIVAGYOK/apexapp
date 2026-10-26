import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { SpecialistStaff } from "@shared/types";
import {
  Card,
  Button,
  Avatar,
  Badge,
  SectionHeader,
  BottomSheet,
  Input,
  showToast
} from "@shared/ui";
import { UserPlus, Send, Mail } from "lucide-react";

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
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackNote.trim()) return;
    setFeedbackNote("");
    showToast({
      title: "Visszajelzés elküldve",
      message: "Az edzői stáb megkapta az értesítést",
      type: "success"
    });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const newStaff: SpecialistStaff = {
      id: `staff-${Date.now()}`,
      name: inviteEmail.split("@")[0] || "Új Szakember",
      roleTitle: "Sportorvos",
      discipline: "physician",
      email: inviteEmail.trim(),
      status: "invited"
    };
    setStaffList([...staffList, newStaff]);
    setInviteEmail("");
    setShowInviteModal(false);
    showToast({
      title: "Meghívó kiküldve",
      message: `${newStaff.email} sikeresen meghívva a szakmai stábba`,
      type: "success"
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title={t("coach.title")}
        description={t("coach.subtitle")}
        action={
          <Button
            variant="primary"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowInviteModal(true)}
          >
            {t("coach.inviteSpecialist")}
          </Button>
        }
      />

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {staffList.map((staff) => (
          <Card
            key={staff.id}
            variant="surface"
            radius="20"
            className="p-5 space-y-4"
          >
            <div className="flex items-start justify-between">
              <Avatar name={staff.name} size="lg" status="ready" />
              <Badge
                variant={staff.status === "active" ? "ready" : "caution"}
                dot
                size="sm"
              >
                {staff.status === "active" ? "Aktív" : "Meghívva"}
              </Badge>
            </div>

            <div>
              <Badge variant="brand" size="sm" className="mb-2">
                {staff.roleTitle}
              </Badge>
              <h3 className="text-16 font-bold text-text-primary mt-1">{staff.name}</h3>
              <p className="text-12 text-text-secondary flex items-center gap-1.5 mt-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span>{staff.email}</span>
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Athlete Feedback Card */}
      <Card variant="surface" radius="20" className="p-6 space-y-4">
        <h3 className="text-16 font-semibold tracking-tight text-text-primary">
          {t("coach.feedback")}
        </h3>
        <p className="text-12 text-text-secondary">
          Közvetlen észrevételek, lábizom-feszülés vagy edzésterhelési feedback a vezetőedzőnek és szakembereknek.
        </p>

        <form onSubmit={handleSendFeedback} className="space-y-3">
          <textarea
            rows={3}
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
            placeholder="pl. A reggeli 400m-es küszöbsorozatok után a bal vádlim kissé kötött maradt..."
            className="w-full rounded-12 border border-border-hairline bg-bg-surface p-3.5 text-14 text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Küldés a stábnak
            </Button>
          </div>
        </form>
      </Card>

      {/* Invite BottomSheet Modal */}
      <BottomSheet
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title={t("coach.inviteSpecialist")}
        description="Hívj meg sportorvost, gyógytornászt, dietetikust vagy erőnléti edzőt a sportolói fiókodhoz."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowInviteModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={handleInvite}>
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleInvite} className="py-2">
          <Input
            type="email"
            label="Szakember E-mail címe"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="szakember@apex.hu"
          />
        </form>
      </BottomSheet>
    </div>
  );
};

export default CoachPage;
