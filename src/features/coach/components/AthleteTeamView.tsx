import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, Avatar, Badge, SectionHeader, showToast } from "@shared/ui";
import { UserPlus, MessageSquare, ShieldCheck, Mail, ArrowRight } from "lucide-react";
import { InviteAthleteModal } from "./InviteAthleteModal";

interface TeamMember {
  id: string;
  name: string;
  roleTitle: string;
  specialty: string;
  email: string;
  avatarUrl?: string;
  status: "active" | "invited";
  permissionsSummary: string;
}

export const AthleteTeamView: React.FC = () => {
  const [members] = useState<TeamMember[]>([
    {
      id: "mem-1",
      name: "Dr. Varga Tamás",
      roleTitle: "Vezetőedző",
      specialty: "Erőnlét & Terheléstervezés",
      email: "varga.tamas@apex.hu",
      status: "active",
      permissionsSummary: "Edzés (Írás), Regeneráció (Olvasás), Üzenetek (Írás)"
    },
    {
      id: "mem-2",
      name: "Molnár Eszter",
      roleTitle: "Sportdietetikus",
      specialty: "Versenyfrissítés & Tápanyagbevitel",
      email: "eszter.diet@apex.hu",
      status: "active",
      permissionsSummary: "Étrend (Írás), Regeneráció (Olvasás), Üzenetek (Írás)"
    },
    {
      id: "mem-3",
      name: "Kiss Péter",
      roleTitle: "Fizioterapeuta",
      specialty: "Sérülésmegelőzés & Rehabilitáció",
      email: "peter.physio@apex.hu",
      status: "active",
      permissionsSummary: "Egészség (Írás), Edzés (Olvasás), Üzenetek (Írás)"
    }
  ]);

  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const handleSendMessage = (member: TeamMember) => {
    showToast({
      title: "Üzenetküldés megnyitva",
      message: `${member.name} közvetlen csatornája aktív.`,
      type: "info"
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader
          title="Szakmai Stábom (Csapatom)"
          description="A felkészülésedet segítő edzők, dietetikusok, fizioterapeuták és sportorvosok."
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link to="/settings/sharing">
            <Button variant="secondary" size="sm" leftIcon={<ShieldCheck className="h-4 w-4" />}>
              Megosztási engedélyek
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Szakember meghívása
          </Button>
        </div>
      </div>

      {/* Sharing Permissions Callout Card */}
      <Card
        variant="surface"
        radius="20"
        className="p-4 border border-brand/20 bg-brand/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-10 bg-brand/10 text-brand shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-13 font-semibold text-text-primary">Adatvédelmi garancia</h4>
            <p className="text-12 text-text-secondary mt-0.5">
              Az adataid kizárólagos tulajdonosa te vagy. A szakemberek csak azokat a modulokat látják,
              amelyeket kifejezetten megosztottál velük, és a hozzáférésüket bármikor, egyetlen kattintással visszavonhatod.
            </p>
          </div>
        </div>
        <Link to="/settings/sharing" className="shrink-0">
          <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
            Engedélyek szerkesztése
          </Button>
        </Link>
      </Card>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {members.map((member) => (
          <Card
            key={member.id}
            variant="surface"
            radius="20"
            className="p-5 flex flex-col justify-between space-y-4 border border-border-hairline"
          >
            <div>
              <div className="flex items-start justify-between">
                <Avatar name={member.name} size="lg" status="ready" />
                <Badge variant={member.status === "active" ? "ready" : "caution"} dot size="sm">
                  {member.status === "active" ? "Aktív" : "Meghívva"}
                </Badge>
              </div>

              <div className="mt-3">
                <span className="text-11 px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
                  {member.roleTitle}
                </span>
                <h3 className="text-16 font-bold text-text-primary mt-1">{member.name}</h3>
                <p className="text-12 text-text-secondary mt-0.5">{member.specialty}</p>

                <p className="text-11 text-text-tertiary flex items-center gap-1.5 mt-2 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span>{member.email}</span>
                </p>

                <div className="mt-3 pt-3 border-t border-border-hairline">
                  <p className="text-10 uppercase tracking-wider text-text-tertiary font-semibold">
                    Megosztott modulok
                  </p>
                  <p className="text-11 text-text-secondary mt-0.5">{member.permissionsSummary}</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => handleSendMessage(member)}
                leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
              >
                Üzenet a stábtagnak
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <InviteAthleteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
};
