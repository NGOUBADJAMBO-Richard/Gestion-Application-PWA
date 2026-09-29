import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  CATALOGUE,
  CATALOGUE_GROUP_LABELS,
  ENROLLMENT_STATUS_LABELS,
  type Enrollment,
  type EnrollmentStatus,
  type Installment,
  type Learner,
  SESSION_MODE_LABELS,
  SESSION_STATUS_LABELS,
  type SessionMode,
  type SessionStatus,
  type TrainingSession,
  buildInstallments,
  canEnroll,
  computeAcademyMetrics,
  enrollmentBalance,
  learnerName,
  sessionOccupancy,
  validateEnrollment,
  validateLearner,
  validateSession,
} from "../../domain/academy";
import { todayIso } from "../../domain/date";
import { formatMoney, money } from "../../domain/money";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { DataStateNotice } from "../components/DataStateNotice";
import { Meter, StatCard } from "../components/StatCard";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import {
  enrollmentRepository,
  learnerRepository,
  sessionRepository,
} from "../data/repositories";
import { recordActivity } from "../data/activityLog";
import { useCollection } from "../hooks/useCollection";
import { useCompanyProfile } from "../hooks/useCompanyProfile";

/**
 * CodeWave Academy.
 *
 * L'agence vend des formations depuis son site — sept modules, des parcours,
 * des ateliers — et l'application les ignorait entièrement. Le chiffre
 * d'affaires de la formation n'apparaissait nulle part, les échéanciers se
 * suivaient de mémoire, et le taux de remplissage d'une session ne se
 * connaissait qu'en comptant les chaises.
 *
 * Trois onglets, dans l'ordre où le travail se fait : on ouvre une session, on
 * enregistre des apprenants, on les inscrit.
 */

type Onglet = "sessions" | "learners" | "enrollments";

interface FormSession {
  readonly catalogueId: string;
  readonly title: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly capacity: string;
  readonly mode: SessionMode;
  readonly trainer: string;
  readonly location: string;
  readonly price: string;
  readonly hours: string;
  readonly status: SessionStatus;
  readonly notes: string;
}

interface FormLearner {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly city: string;
  readonly notes: string;
}

interface FormEnrollment {
  readonly sessionId: string;
  readonly learnerId: string;
  readonly agreedPrice: string;
  readonly discountReason: string;
  readonly installmentCount: string;
  readonly firstDueDate: string;
}

function formSessionVide(trainer: string): FormSession {
  return {
    catalogueId: "",
    title: "",
    startDate: todayIso(),
    endDate: todayIso(),
    capacity: "10",
    mode: "onsite",
    trainer,
    location: "",
    price: "0",
    hours: "0",
    status: "planned",
    notes: "",
  };
}

const FORM_LEARNER_VIDE: FormLearner = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  notes: "",
};

function tonStatutSession(status: SessionStatus): string {
  switch (status) {
    case "running":
      return "bg-primary/10 text-primary-ink";
    case "confirmed":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "done":
      return "bg-slate-500/10 text-slate-600 dark:text-slate-300";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
}

function tonStatutInscription(status: EnrollmentStatus): string {
  switch (status) {
    case "confirmed":
    case "attended":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "dropped":
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
}

function dateCourte(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function Academy() {
  const { profile } = useCompanyProfile();
  const devise = profile.currency;
  const argent = (montant: number) => formatMoney(money(montant, devise));
  const aujourdHui = todayIso();

  const sessions = useCollection(sessionRepository);
  const apprenants = useCollection(learnerRepository);
  const inscriptions = useCollection(enrollmentRepository);

  const [onglet, setOnglet] = useState<Onglet>("sessions");

  const [dialogSession, setDialogSession] = useState(false);
  const [sessionEnEdition, setSessionEnEdition] = useState<TrainingSession | null>(
    null,
  );
  const [formSession, setFormSession] = useState<FormSession>(() =>
    formSessionVide(profile.name),
  );

  const [dialogLearner, setDialogLearner] = useState(false);
  const [learnerEnEdition, setLearnerEnEdition] = useState<Learner | null>(null);
  const [formLearner, setFormLearner] = useState<FormLearner>(FORM_LEARNER_VIDE);

  const [dialogEnrollment, setDialogEnrollment] = useState(false);
  const [formEnrollment, setFormEnrollment] = useState<FormEnrollment>({
    sessionId: "",
    learnerId: "",
    agreedPrice: "0",
    discountReason: "",
    installmentCount: "1",
    firstDueDate: aujourdHui,
  });

  const [sessionASupprimer, setSessionASupprimer] =
    useState<TrainingSession | null>(null);
  const [inscriptionOuverte, setInscriptionOuverte] = useState<string | null>(null);

  const metriques = useMemo(
    () =>
      computeAcademyMetrics(
        sessions.items,
        apprenants.items,
        inscriptions.items,
        devise,
        aujourdHui,
      ),
    [sessions.items, apprenants.items, inscriptions.items, devise, aujourdHui],
  );

  const apprenantsParId = useMemo(
    () => new Map(apprenants.items.map((a) => [a.id, a])),
    [apprenants.items],
  );
  const sessionsParId = useMemo(
    () => new Map(sessions.items.map((s) => [s.id, s])),
    [sessions.items],
  );

  const sessionsTriees = useMemo(
    () => [...sessions.items].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [sessions.items],
  );

  const inscriptionsTriees = useMemo(
    () =>
      [...inscriptions.items].sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt)),
    [inscriptions.items],
  );

  // ------------------------------------------------------------- Sessions

  const appliquerCatalogue = (catalogueId: string) => {
    const entree = CATALOGUE.find((item) => item.id === catalogueId);
    if (entree === undefined) return;
    setFormSession((prev) => ({
      ...prev,
      catalogueId,
      title: entree.title,
      // Un prix au devis (`null`) ne se préremplit pas à zéro sans le dire :
      // on laisse le champ à zéro, et l'aide sous le champ l'explique.
      price: String(entree.amount ?? 0),
      hours: String(entree.hours ?? 0),
      capacity: String(entree.maxParticipants ?? prev.capacity),
    }));
  };

  const ouvrirCreationSession = () => {
    setSessionEnEdition(null);
    setFormSession(formSessionVide(profile.name));
    setDialogSession(true);
  };

  const ouvrirEditionSession = (session: TrainingSession) => {
    setSessionEnEdition(session);
    setFormSession({
      catalogueId: session.catalogueId,
      title: session.title,
      startDate: session.startDate,
      endDate: session.endDate,
      capacity: String(session.capacity),
      mode: session.mode,
      trainer: session.trainer,
      location: session.location ?? "",
      price: String(session.price),
      hours: String(session.hours),
      status: session.status,
      notes: session.notes ?? "",
    });
    setDialogSession(true);
  };

  const enregistrerSession = (evenement: React.FormEvent) => {
    evenement.preventDefault();

    const brouillon: Omit<TrainingSession, "id"> = {
      catalogueId: formSession.catalogueId,
      title: formSession.title.trim(),
      startDate: formSession.startDate,
      endDate: formSession.endDate,
      capacity: Math.round(Number(formSession.capacity) || 0),
      mode: formSession.mode,
      trainer: formSession.trainer.trim(),
      location: formSession.location.trim() || undefined,
      price: Math.round(Number(formSession.price) || 0),
      hours: Number(formSession.hours) || 0,
      status: formSession.status,
      notes: formSession.notes.trim() || undefined,
    };

    try {
      validateSession(brouillon);
    } catch (cause) {
      toast.error("Session refusée", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return;
    }

    // Réduire la capacité sous le nombre d'inscrits ferait afficher un
    // remplissage supérieur à 100 % et rendrait la session « complète » de
    // façon incompréhensible.
    if (sessionEnEdition !== null) {
      const occupe = sessionOccupancy(sessionEnEdition, inscriptions.items).taken;
      if (brouillon.capacity < occupe) {
        toast.error("Capacité trop basse", {
          description: `${occupe} apprenants sont déjà inscrits. Annule d'abord une inscription, ou garde au moins ${occupe} places.`,
        });
        return;
      }
    }

    const suite =
      sessionEnEdition === null
        ? sessions.create(brouillon)
        : sessions.update(sessionEnEdition.id, brouillon);

    void suite.then((resultat) => {
      if (resultat === undefined) return;
      if (sessionEnEdition === null) {
        recordActivity({
          kind: "sessionOpened",
          title: `Session « ${brouillon.title} » ouverte`,
          detail: `${brouillon.capacity} places · ${brouillon.trainer}`,
          href: "/academy",
          amount: brouillon.price,
        });
      }

      toast.success(
        sessionEnEdition === null ? "Session ouverte." : "Session mise à jour.",
        { description: brouillon.title },
      );
      setDialogSession(false);
      setSessionEnEdition(null);
    });
  };

  // ----------------------------------------------------------- Apprenants

  const ouvrirCreationLearner = () => {
    setLearnerEnEdition(null);
    setFormLearner(FORM_LEARNER_VIDE);
    setDialogLearner(true);
  };

  const ouvrirEditionLearner = (apprenant: Learner) => {
    setLearnerEnEdition(apprenant);
    setFormLearner({
      firstName: apprenant.firstName,
      lastName: apprenant.lastName,
      email: apprenant.email,
      phone: apprenant.phone,
      city: apprenant.city ?? "",
      notes: apprenant.notes ?? "",
    });
    setDialogLearner(true);
  };

  const enregistrerLearner = (evenement: React.FormEvent) => {
    evenement.preventDefault();

    const brouillon: Omit<Learner, "id"> = {
      firstName: formLearner.firstName.trim(),
      lastName: formLearner.lastName.trim(),
      email: formLearner.email.trim(),
      phone: formLearner.phone.trim(),
      city: formLearner.city.trim() || undefined,
      notes: formLearner.notes.trim() || undefined,
    };

    try {
      validateLearner(brouillon);
    } catch (cause) {
      toast.error("Apprenant refusé", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return;
    }

    const suite =
      learnerEnEdition === null
        ? apprenants.create(brouillon)
        : apprenants.update(learnerEnEdition.id, brouillon);

    void suite.then((resultat) => {
      if (resultat === undefined) return;
      toast.success(
        learnerEnEdition === null ? "Apprenant enregistré." : "Fiche mise à jour.",
        { description: `${brouillon.firstName} ${brouillon.lastName}` },
      );
      setDialogLearner(false);
      setLearnerEnEdition(null);
    });
  };

  // --------------------------------------------------------- Inscriptions

  const ouvrirInscription = (sessionId?: string) => {
    const session =
      sessionId === undefined ? undefined : sessionsParId.get(sessionId);
    setFormEnrollment({
      sessionId: sessionId ?? "",
      learnerId: "",
      agreedPrice: String(session?.price ?? 0),
      discountReason: "",
      installmentCount: "1",
      firstDueDate: aujourdHui,
    });
    setDialogEnrollment(true);
  };

  /** Échéancier prévisualisé, recalculé à chaque frappe. */
  const echeancierPrevu = useMemo(() => {
    const total = Math.round(Number(formEnrollment.agreedPrice) || 0);
    const nombre = Math.round(Number(formEnrollment.installmentCount) || 0);
    if (total < 0 || nombre < 1) return [];
    try {
      return buildInstallments(total, nombre, formEnrollment.firstDueDate, devise);
    } catch {
      return [];
    }
  }, [
    formEnrollment.agreedPrice,
    formEnrollment.installmentCount,
    formEnrollment.firstDueDate,
    devise,
  ]);

  const enregistrerInscription = (evenement: React.FormEvent) => {
    evenement.preventDefault();

    const session = sessionsParId.get(formEnrollment.sessionId);
    if (session === undefined) {
      toast.error("Choisis une session.");
      return;
    }
    if (formEnrollment.learnerId.length === 0) {
      toast.error("Choisis un apprenant.");
      return;
    }

    const decision = canEnroll(
      session,
      inscriptions.items,
      formEnrollment.learnerId,
    );
    if (!decision.allowed) {
      toast.error("Inscription impossible", { description: decision.reason });
      return;
    }

    const brouillon: Omit<Enrollment, "id"> = {
      sessionId: formEnrollment.sessionId,
      learnerId: formEnrollment.learnerId,
      status: "pending",
      agreedPrice: Math.round(Number(formEnrollment.agreedPrice) || 0),
      discountReason: formEnrollment.discountReason.trim() || undefined,
      installments: echeancierPrevu,
      enrolledAt: aujourdHui,
    };

    try {
      validateEnrollment(brouillon);
    } catch (cause) {
      toast.error("Inscription refusée", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return;
    }

    void inscriptions.create(brouillon).then((resultat) => {
      if (resultat === undefined) return;
      const apprenant = apprenantsParId.get(brouillon.learnerId);
      recordActivity({
        kind: "enrollmentCreated",
        title: `${apprenant === undefined ? "Apprenant" : learnerName(apprenant)} inscrit`,
        detail: session.title,
        href: "/academy",
        amount: brouillon.agreedPrice,
      });

      toast.success("Inscription enregistrée.", {
        description: `${apprenant === undefined ? "Apprenant" : learnerName(apprenant)} — ${session.title}`,
      });
      setDialogEnrollment(false);
      setOnglet("enrollments");
    });
  };

  /** Marque une échéance réglée, ou revient en arrière en cas d'erreur de clic. */
  const basculerEcheance = (inscription: Enrollment, echeanceId: string) => {
    // Seul le règlement est consigné, pas le retour en arrière : un clic
    // corrigé n'est pas un encaissement.
    const concernee = inscription.installments.find(
      (echeance) => echeance.id === echeanceId,
    );
    if (concernee !== undefined && concernee.paidAt === undefined) {
      const apprenant = apprenantsParId.get(inscription.learnerId);
      recordActivity({
        kind: "installmentPaid",
        title: `${argent(concernee.amount)} encaissés`,
        detail: `${apprenant === undefined ? "Apprenant" : learnerName(apprenant)} · ${sessionsParId.get(inscription.sessionId)?.title ?? "Session"}`,
        href: "/academy",
        amount: concernee.amount,
      });
    }

    const suivantes = inscription.installments.map((echeance) =>
      echeance.id === echeanceId
        ? echeance.paidAt === undefined
          ? { ...echeance, paidAt: aujourdHui }
          : { id: echeance.id, dueDate: echeance.dueDate, amount: echeance.amount }
        : echeance,
    );
    void inscriptions.update(inscription.id, { installments: suivantes });
  };

  const changerStatutInscription = (
    inscription: Enrollment,
    status: EnrollmentStatus,
  ) => {
    void inscriptions.update(inscription.id, { status });
  };

  const changerPresence = (inscription: Enrollment, valeur: string) => {
    const taux = Math.min(100, Math.max(0, Math.round(Number(valeur) || 0)));
    void inscriptions.update(inscription.id, { attendancePercent: taux });
  };

  // --------------------------------------------------------------- Rendu

  const chargement =
    sessions.isLoading || apprenants.isLoading || inscriptions.isLoading;
  const erreur = sessions.error ?? apprenants.error ?? inscriptions.error;

  return (
    <div className="space-y-6">
      <DataStateNotice
        isLoading={chargement}
        error={erreur}
        onDismiss={() => {
          sessions.dismissError();
          apprenants.dismissError();
          inscriptions.dismissError();
        }}
        label="la formation"
      />

      <header className="enter wave-surface -mx-4 px-4 py-6 lg:-mx-6 lg:px-6">
        <p className="section-label">Formation</p>
        <div className="flex flex-col gap-4 mt-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1>CodeWave Academy</h1>
            <p className="text-muted-foreground mt-1">
              Sessions, apprenants et échéanciers de formation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={ouvrirCreationSession}>
              <CalendarDays className="w-4 h-4" />
              Ouvrir une session
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={ouvrirCreationLearner}
            >
              <UserPlus className="w-4 h-4" />
              Nouvel apprenant
            </Button>
          </div>
        </div>
      </header>

      <div className="enter-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sessions à venir"
          value={String(metriques.upcomingCount)}
          hint={`${metriques.sessionsCount} session(s) au total`}
          icon={CalendarDays}
        />
        <StatCard
          label="Apprenants"
          value={String(metriques.learnersCount)}
          hint={`${metriques.activeEnrollments} inscription(s) active(s)`}
          icon={Users}
        />
        <StatCard
          label="Encaissé"
          value={argent(metriques.collected.amount)}
          hint={`sur ${argent(metriques.contracted.amount)} contractés`}
          icon={Wallet}
          tone="positive"
        />
        <StatCard
          label="Échéances en retard"
          value={argent(metriques.overdueAmount.amount)}
          hint={
            metriques.overdueInstallments === 0
              ? "aucune échéance dépassée"
              : `${metriques.overdueInstallments} échéance(s) dépassée(s)`
          }
          icon={AlertTriangle}
          tone={metriques.overdueInstallments === 0 ? "neutral" : "negative"}
        />
      </div>

      {(metriques.fillRate !== null || metriques.attendanceRate !== null) && (
        <Card>
          <CardContent className="pt-6 grid gap-6 sm:grid-cols-2">
            {metriques.fillRate !== null && (
              <Meter
                percent={metriques.fillRate}
                label="Taux de remplissage moyen"
              />
            )}
            {metriques.attendanceRate !== null && (
              <Meter
                percent={metriques.attendanceRate}
                label="Taux de présence moyen"
              />
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={onglet} onValueChange={(valeur) => setOnglet(valeur as Onglet)}>
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="learners">Apprenants</TabsTrigger>
          <TabsTrigger value="enrollments">Inscriptions</TabsTrigger>
        </TabsList>
      </Tabs>

      {onglet === "sessions" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sessionsTriees.length === 0 ? (
            <Card className="lg:col-span-2">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Aucune session ouverte. Le catalogue du site compte{" "}
                {CATALOGUE.length} formations : ouvre une session pour commencer
                à inscrire des apprenants.
              </CardContent>
            </Card>
          ) : (
            sessionsTriees.map((session) => {
              const remplissage = sessionOccupancy(session, inscriptions.items);
              return (
                <Card key={session.id}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg truncate">{session.title}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {dateCourte(session.startDate)} →{" "}
                          {dateCourte(session.endDate)} &middot; {session.hours} h
                          &middot; {SESSION_MODE_LABELS[session.mode]}
                        </p>
                      </div>
                      <Badge className={tonStatutSession(session.status)}>
                        {SESSION_STATUS_LABELS[session.status]}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Prix public
                        </p>
                        <p className="amount mt-1">{argent(session.price)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Formateur
                        </p>
                        <p className="mt-1 truncate">{session.trainer}</p>
                      </div>
                    </div>

                    {remplissage.percent !== null && (
                      <Meter
                        percent={remplissage.percent}
                        label={`${remplissage.taken} / ${session.capacity} places`}
                      />
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        className="gap-2"
                        disabled={
                          session.status === "cancelled" ||
                          session.status === "done" ||
                          remplissage.full
                        }
                        onClick={() => ouvrirInscription(session.id)}
                      >
                        <Plus className="w-4 h-4" />
                        Inscrire
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => ouvrirEditionSession(session)}
                        aria-label={`Modifier la session ${session.title}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSessionASupprimer(session)}
                        aria-label={`Supprimer la session ${session.title}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {onglet === "learners" && (
        <Card>
          <CardHeader>
            <CardTitle>Apprenants</CardTitle>
          </CardHeader>
          <CardContent>
            {apprenants.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun apprenant enregistré.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="table-zebra">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Inscriptions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apprenants.items.map((apprenant) => {
                      const siennes = inscriptions.items.filter(
                        (inscription) =>
                          inscription.learnerId === apprenant.id &&
                          inscription.status !== "cancelled",
                      );
                      return (
                        <TableRow key={apprenant.id}>
                          <TableCell>
                            {learnerName(apprenant)}
                            {apprenant.notes !== undefined && (
                              <span className="block text-xs text-muted-foreground">
                                {apprenant.notes}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {apprenant.phone}
                            {apprenant.email.length > 0 && (
                              <span className="block text-xs text-muted-foreground">
                                {apprenant.email}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{apprenant.city ?? "—"}</TableCell>
                          <TableCell className="amount">{siennes.length}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => ouvrirEditionLearner(apprenant)}
                              aria-label={`Modifier ${learnerName(apprenant)}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {onglet === "enrollments" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => ouvrirInscription()}>
              <Plus className="w-4 h-4" />
              Nouvelle inscription
            </Button>
          </div>

          {inscriptionsTriees.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Aucune inscription enregistrée.
              </CardContent>
            </Card>
          ) : (
            inscriptionsTriees.map((inscription) => {
              const apprenant = apprenantsParId.get(inscription.learnerId);
              const session = sessionsParId.get(inscription.sessionId);
              const solde = enrollmentBalance(inscription, devise, aujourdHui);
              const ouverte = inscriptionOuverte === inscription.id;

              return (
                <Card key={inscription.id}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-base">
                          {apprenant === undefined
                            ? "Apprenant supprimé"
                            : learnerName(apprenant)}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {session?.title ?? "Session supprimée"} &middot; inscrit
                          le {dateCourte(inscription.enrolledAt)}
                          {inscription.discountReason !== undefined && (
                            <> &middot; {inscription.discountReason}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={tonStatutInscription(inscription.status)}>
                          {ENROLLMENT_STATUS_LABELS[inscription.status]}
                        </Badge>
                        {solde.overdue.length > 0 && (
                          <Badge className="bg-destructive/10 text-destructive">
                            {solde.overdue.length} échéance(s) en retard
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm lg:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Prix consenti
                        </p>
                        <p className="amount mt-1">{argent(solde.total.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Encaissé
                        </p>
                        <p className="amount mt-1">{argent(solde.paid.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Reste dû
                        </p>
                        <p
                          className={`amount mt-1 ${solde.settled ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                        >
                          {argent(solde.balance.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Prochaine échéance
                        </p>
                        <p className="amount mt-1">
                          {solde.next === null
                            ? "Soldée"
                            : `${dateCourte(solde.next.dueDate)} — ${argent(solde.next.amount)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setInscriptionOuverte(ouverte ? null : inscription.id)
                        }
                      >
                        {ouverte ? "Masquer" : "Voir"} l&rsquo;échéancier (
                        {inscription.installments.length})
                      </Button>

                      <Select
                        value={inscription.status}
                        onValueChange={(valeur) =>
                          changerStatutInscription(
                            inscription,
                            valeur as EnrollmentStatus,
                          )
                        }
                      >
                        <SelectTrigger
                          className="w-[160px]"
                          aria-label="Statut de l'inscription"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.keys(ENROLLMENT_STATUS_LABELS) as EnrollmentStatus[]
                          ).map((statut) => (
                            <SelectItem key={statut} value={statut}>
                              {ENROLLMENT_STATUS_LABELS[statut]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`presence-${inscription.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Présence %
                        </Label>
                        <Input
                          id={`presence-${inscription.id}`}
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          value={inscription.attendancePercent ?? ""}
                          onChange={(e) => changerPresence(inscription, e.target.value)}
                        />
                      </div>
                    </div>

                    {ouverte && (
                      <div className="overflow-x-auto border-t border-border pt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Échéance</TableHead>
                              <TableHead>Montant</TableHead>
                              <TableHead>État</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inscription.installments.map(
                              (echeance: Installment) => {
                                const enRetard =
                                  echeance.paidAt === undefined &&
                                  echeance.dueDate < aujourdHui;
                                return (
                                  <TableRow key={echeance.id}>
                                    <TableCell className="whitespace-nowrap">
                                      {dateCourte(echeance.dueDate)}
                                    </TableCell>
                                    <TableCell className="amount whitespace-nowrap">
                                      {argent(echeance.amount)}
                                    </TableCell>
                                    <TableCell>
                                      {echeance.paidAt !== undefined ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                                          Réglée le {dateCourte(echeance.paidAt)}
                                        </span>
                                      ) : enRetard ? (
                                        <span className="text-destructive text-sm">
                                          En retard
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">
                                          À venir
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        size="sm"
                                        variant={
                                          echeance.paidAt === undefined
                                            ? "default"
                                            : "ghost"
                                        }
                                        className="gap-2"
                                        onClick={() =>
                                          basculerEcheance(inscription, echeance.id)
                                        }
                                      >
                                        <Check className="w-4 h-4" />
                                        {echeance.paidAt === undefined
                                          ? "Marquer réglée"
                                          : "Annuler"}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              },
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ----------------------------------------------- Dialogue session */}
      <Dialog
        open={dialogSession}
        onOpenChange={(ouvert) => {
          setDialogSession(ouvert);
          if (!ouvert) setSessionEnEdition(null);
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={enregistrerSession}>
            <DialogHeader>
              <DialogTitle>
                {sessionEnEdition === null
                  ? "Ouvrir une session"
                  : "Modifier la session"}
              </DialogTitle>
              <DialogDescription>
                Le titre et le prix sont repris du catalogue puis figés : une
                hausse de tarif ne doit pas réécrire une session déjà vendue.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="session-catalogue">Formation au catalogue</Label>
                <Select
                  value={formSession.catalogueId}
                  onValueChange={appliquerCatalogue}
                >
                  <SelectTrigger id="session-catalogue">
                    <SelectValue placeholder="Choisir une formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATALOGUE.map((entree) => (
                      <SelectItem key={entree.id} value={entree.id}>
                        {entree.code === null ? "" : `${entree.code} — `}
                        {entree.title}
                        {entree.amount === null
                          ? " (au devis)"
                          : ` · ${argent(entree.amount)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Groupes : {Object.values(CATALOGUE_GROUP_LABELS).join(", ")}.
                  Un tarif « au devis » se saisit à la main ci-dessous.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-titre">Intitulé</Label>
                <Input
                  id="session-titre"
                  value={formSession.title}
                  onChange={(e) =>
                    setFormSession((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session-debut">Début</Label>
                  <Input
                    id="session-debut"
                    type="date"
                    value={formSession.startDate}
                    onChange={(e) =>
                      setFormSession((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                        // Une fin antérieure au début est refusée par le
                        // domaine ; on la cale d'office pour éviter l'erreur.
                        endDate:
                          prev.endDate < e.target.value ? e.target.value : prev.endDate,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-fin">Fin</Label>
                  <Input
                    id="session-fin"
                    type="date"
                    min={formSession.startDate}
                    value={formSession.endDate}
                    onChange={(e) =>
                      setFormSession((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="session-places">Places</Label>
                  <Input
                    id="session-places"
                    type="number"
                    min={1}
                    value={formSession.capacity}
                    onChange={(e) =>
                      setFormSession((prev) => ({
                        ...prev,
                        capacity: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-heures">Heures</Label>
                  <Input
                    id="session-heures"
                    type="number"
                    min={0}
                    value={formSession.hours}
                    onChange={(e) =>
                      setFormSession((prev) => ({ ...prev, hours: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-prix">Prix ({devise})</Label>
                  <Input
                    id="session-prix"
                    type="number"
                    min={0}
                    value={formSession.price}
                    onChange={(e) =>
                      setFormSession((prev) => ({ ...prev, price: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session-mode">Modalité</Label>
                  <Select
                    value={formSession.mode}
                    onValueChange={(valeur) =>
                      setFormSession((prev) => ({
                        ...prev,
                        mode: valeur as SessionMode,
                      }))
                    }
                  >
                    <SelectTrigger id="session-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SESSION_MODE_LABELS) as SessionMode[]).map(
                        (mode) => (
                          <SelectItem key={mode} value={mode}>
                            {SESSION_MODE_LABELS[mode]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-statut">Statut</Label>
                  <Select
                    value={formSession.status}
                    onValueChange={(valeur) =>
                      setFormSession((prev) => ({
                        ...prev,
                        status: valeur as SessionStatus,
                      }))
                    }
                  >
                    <SelectTrigger id="session-statut">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SESSION_STATUS_LABELS) as SessionStatus[]).map(
                        (statut) => (
                          <SelectItem key={statut} value={statut}>
                            {SESSION_STATUS_LABELS[statut]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session-formateur">Formateur</Label>
                  <Input
                    id="session-formateur"
                    value={formSession.trainer}
                    onChange={(e) =>
                      setFormSession((prev) => ({ ...prev, trainer: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-lieu">Lieu</Label>
                  <Input
                    id="session-lieu"
                    value={formSession.location}
                    onChange={(e) =>
                      setFormSession((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="Facultatif en distanciel"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-notes">Notes</Label>
                <Textarea
                  id="session-notes"
                  rows={2}
                  value={formSession.notes}
                  onChange={(e) =>
                    setFormSession((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogSession(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="gap-2">
                <GraduationCap className="w-4 h-4" />
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------- Dialogue apprenant */}
      <Dialog
        open={dialogLearner}
        onOpenChange={(ouvert) => {
          setDialogLearner(ouvert);
          if (!ouvert) setLearnerEnEdition(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={enregistrerLearner}>
            <DialogHeader>
              <DialogTitle>
                {learnerEnEdition === null
                  ? "Nouvel apprenant"
                  : "Modifier l'apprenant"}
              </DialogTitle>
              <DialogDescription>
                Un moyen de contact au moins est requis : sans lui, aucune
                convocation ni relance d&rsquo;échéance n&rsquo;est possible.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="apprenant-prenom">Prénom</Label>
                  <Input
                    id="apprenant-prenom"
                    value={formLearner.firstName}
                    onChange={(e) =>
                      setFormLearner((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apprenant-nom">Nom</Label>
                  <Input
                    id="apprenant-nom"
                    value={formLearner.lastName}
                    onChange={(e) =>
                      setFormLearner((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="apprenant-tel">Téléphone</Label>
                  <Input
                    id="apprenant-tel"
                    value={formLearner.phone}
                    onChange={(e) =>
                      setFormLearner((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+241 66 00 00 00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apprenant-email">E-mail</Label>
                  <Input
                    id="apprenant-email"
                    type="email"
                    value={formLearner.email}
                    onChange={(e) =>
                      setFormLearner((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apprenant-ville">Ville</Label>
                <Input
                  id="apprenant-ville"
                  value={formLearner.city}
                  onChange={(e) =>
                    setFormLearner((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apprenant-notes">Notes</Label>
                <Textarea
                  id="apprenant-notes"
                  rows={2}
                  value={formLearner.notes}
                  onChange={(e) =>
                    setFormLearner((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Statut étudiant, entreprise qui l'envoie…"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogLearner(false)}
              >
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------- Dialogue inscription */}
      <Dialog open={dialogEnrollment} onOpenChange={setDialogEnrollment}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={enregistrerInscription}>
            <DialogHeader>
              <DialogTitle>Nouvelle inscription</DialogTitle>
              <DialogDescription>
                L&rsquo;échéancier est calculé, jamais saisi : la somme des
                échéances égale toujours le prix consenti, au franc près.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="inscription-session">Session</Label>
                <Select
                  value={formEnrollment.sessionId}
                  onValueChange={(valeur) => {
                    const session = sessionsParId.get(valeur);
                    setFormEnrollment((prev) => ({
                      ...prev,
                      sessionId: valeur,
                      agreedPrice: String(session?.price ?? prev.agreedPrice),
                    }));
                  }}
                >
                  <SelectTrigger id="inscription-session">
                    <SelectValue placeholder="Choisir une session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.items
                      .filter(
                        (session) =>
                          session.status !== "cancelled" && session.status !== "done",
                      )
                      .map((session) => {
                        const remplissage = sessionOccupancy(
                          session,
                          inscriptions.items,
                        );
                        return (
                          <SelectItem key={session.id} value={session.id}>
                            {session.title} — {remplissage.taken}/{session.capacity}{" "}
                            places
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inscription-apprenant">Apprenant</Label>
                <Select
                  value={formEnrollment.learnerId}
                  onValueChange={(valeur) =>
                    setFormEnrollment((prev) => ({ ...prev, learnerId: valeur }))
                  }
                >
                  <SelectTrigger id="inscription-apprenant">
                    <SelectValue placeholder="Choisir un apprenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {apprenants.items.map((apprenant) => (
                      <SelectItem key={apprenant.id} value={apprenant.id}>
                        {learnerName(apprenant)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inscription-prix">Prix consenti ({devise})</Label>
                  <Input
                    id="inscription-prix"
                    type="number"
                    min={0}
                    value={formEnrollment.agreedPrice}
                    onChange={(e) =>
                      setFormEnrollment((prev) => ({
                        ...prev,
                        agreedPrice: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscription-echeances">Nombre d&rsquo;échéances</Label>
                  <Input
                    id="inscription-echeances"
                    type="number"
                    min={1}
                    max={12}
                    value={formEnrollment.installmentCount}
                    onChange={(e) =>
                      setFormEnrollment((prev) => ({
                        ...prev,
                        installmentCount: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inscription-premiere">Première échéance</Label>
                  <Input
                    id="inscription-premiere"
                    type="date"
                    value={formEnrollment.firstDueDate}
                    onChange={(e) =>
                      setFormEnrollment((prev) => ({
                        ...prev,
                        firstDueDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscription-remise">Motif de remise</Label>
                  <Input
                    id="inscription-remise"
                    value={formEnrollment.discountReason}
                    onChange={(e) =>
                      setFormEnrollment((prev) => ({
                        ...prev,
                        discountReason: e.target.value,
                      }))
                    }
                    placeholder="Étudiant, −20 %"
                  />
                </div>
              </div>

              {echeancierPrevu.length > 0 && (
                <div className="border border-border p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Échéancier prévu
                  </p>
                  <ul className="space-y-1 text-sm">
                    {echeancierPrevu.map((echeance, index) => (
                      <li key={echeance.id} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {index + 1}. {dateCourte(echeance.dueDate)}
                        </span>
                        <span className="amount">{argent(echeance.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogEnrollment(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Inscrire
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={sessionASupprimer !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) setSessionASupprimer(null);
        }}
        subject={
          sessionASupprimer === null ? "" : `la session « ${sessionASupprimer.title} »`
        }
        decision={(() => {
          if (sessionASupprimer === null) return { allowed: true } as const;
          const liees = inscriptions.items.filter(
            (inscription) =>
              inscription.sessionId === sessionASupprimer.id &&
              inscription.status !== "cancelled",
          );
          if (liees.length === 0) return { allowed: true } as const;
          return {
            allowed: false,
            rule: "session.hasEnrollments",
            reason: `${liees.length} apprenant(s) y sont inscrits, avec des échéanciers en cours. Annule les inscriptions, ou passe la session en « Annulée » pour la retirer des listes sans perdre les encaissements.`,
            blockedBy: liees.map((inscription) => inscription.id),
          } as const;
        })()}
        consequence="La session part à la corbeille et reste récupérable."
        onConfirm={() => {
          if (sessionASupprimer !== null) void sessions.remove(sessionASupprimer.id);
          setSessionASupprimer(null);
        }}
      />
    </div>
  );
}
