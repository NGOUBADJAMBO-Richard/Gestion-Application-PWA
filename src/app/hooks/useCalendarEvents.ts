import { useMemo } from "react";

import { enrollmentBalance, learnerName, sessionOccupancy } from "../../domain/academy";
import {
  type CalendarEvent,
  type CalendarInput,
  collectEvents,
} from "../../domain/calendar";
import { todayIso } from "../../domain/date";
import { formatMoney, money } from "../../domain/money";
import { computeSettlement } from "../../domain/payment";
import {
  clientRepository,
  enrollmentRepository,
  invoiceRepository,
  learnerRepository,
  projectRepository,
  sessionRepository,
} from "../data/repositories";
import { useCollection } from "./useCollection";
import { useCompanyProfile } from "./useCompanyProfile";

/**
 * Assemble les événements du calendrier depuis toutes les collections.
 *
 * Le domaine ne connaît ni `Invoice` ni le stockage : il reçoit des formes
 * réduites. La réduction vit ici plutôt que dans l'écran, pour que le
 * calendrier et un éventuel widget de tableau de bord comptent les mêmes
 * échéances.
 */
export function useCalendarEvents(): {
  events: readonly CalendarEvent[];
  today: string;
} {
  const { profile } = useCompanyProfile();
  const devise = profile.currency;

  const { items: factures } = useCollection(invoiceRepository);
  const { items: clients } = useCollection(clientRepository);
  const { items: projets } = useCollection(projectRepository);
  const { items: sessions } = useCollection(sessionRepository);
  const { items: apprenants } = useCollection(learnerRepository);
  const { items: inscriptions } = useCollection(enrollmentRepository);

  const aujourdHui = todayIso();

  const events = useMemo(() => {
    const argent = (montant: number) => formatMoney(money(montant, devise));
    const clientsParId = new Map(clients.map((client) => [client.id, client]));
    const apprenantsParId = new Map(
      apprenants.map((apprenant) => [apprenant.id, apprenant]),
    );
    const sessionsParId = new Map(sessions.map((session) => [session.id, session]));

    const entree: CalendarInput = {
      today: aujourdHui,
      quoteValidityDays: profile.paymentTermDays,

      invoices: factures.map((facture) => {
        const reglement = computeSettlement(facture.amount, facture.payments ?? []);
        return {
          id: facture.id,
          number: facture.number.length > 0 ? facture.number : "Brouillon",
          kind: facture.kind,
          status: facture.status,
          clientName:
            clientsParId.get(facture.clientId)?.company ?? "Client supprimé",
          dueDate: facture.dueDate,
          balance: reglement.balance,
          formattedBalance: argent(reglement.balance),
        };
      }),

      milestones: projets.flatMap((projet) =>
        projet.milestones.map((jalon) => ({
          projectId: projet.id,
          projectName: projet.name,
          milestoneId: jalon.id,
          label: jalon.label,
          dueDate: jalon.dueDate,
          doneAt: jalon.doneAt,
        })),
      ),

      sessions: sessions.map((session) => {
        const remplissage = sessionOccupancy(session, inscriptions);
        return {
          id: session.id,
          title: session.title,
          startDate: session.startDate,
          endDate: session.endDate,
          cancelled: session.status === "cancelled",
          taken: remplissage.taken,
          capacity: session.capacity,
        };
      }),

      installments: inscriptions
        .filter(
          (inscription) =>
            inscription.status !== "cancelled" && inscription.status !== "dropped",
        )
        .flatMap((inscription) => {
          // Le solde n'est pas relu ici : on a besoin de chaque échéance, pas
          // seulement des impayées.
          const apprenant = apprenantsParId.get(inscription.learnerId);
          const session = sessionsParId.get(inscription.sessionId);
          const nom =
            apprenant === undefined ? "Apprenant supprimé" : learnerName(apprenant);
          // `enrollmentBalance` sert au contrôle de cohérence : si l'inscription
          // est soldée, aucune échéance ne doit rester non réglée.
          const solde = enrollmentBalance(inscription, devise, aujourdHui);
          return inscription.installments.map((echeance) => ({
            enrollmentId: inscription.id,
            installmentId: echeance.id,
            learnerName: nom,
            sessionTitle: session?.title ?? "Session supprimée",
            dueDate: echeance.dueDate,
            amount: echeance.amount,
            formattedAmount: argent(echeance.amount),
            paid: echeance.paidAt !== undefined || solde.settled,
          }));
        }),
    };

    return collectEvents(entree);
  }, [
    factures,
    clients,
    projets,
    sessions,
    apprenants,
    inscriptions,
    devise,
    aujourdHui,
    profile.paymentTermDays,
  ]);

  return { events, today: aujourdHui };
}
