import { useEffect, useMemo, useState } from "react";

import {
  enrollmentBalance,
  learnerName,
  sessionOccupancy,
} from "../../domain/academy";
import {
  type Alert,
  type AlertInput,
  computeAlerts,
  summarizeAlerts,
  type AlertSummary,
} from "../../domain/alerts";
import { todayIso } from "../../domain/date";
import { formatMoney, money } from "../../domain/money";
import { computeSettlement } from "../../domain/payment";
import { computeProjectProfitability } from "../../domain/profitability";
import { readLastBackup, subscribeBackup } from "../data/backupJournal";
import { toRevenueDocuments } from "../data/documentTotals";
import {
  clientRepository,
  enrollmentRepository,
  expenseRepository,
  invoiceRepository,
  learnerRepository,
  projectRepository,
  sessionRepository,
  timeEntryRepository,
} from "../data/repositories";
import { useCollection } from "./useCollection";
import { useCompanyProfile } from "./useCompanyProfile";

/**
 * Assemble les alertes à partir de toutes les collections.
 *
 * Le domaine ne connaît ni `Invoice` ni le stockage : il reçoit des formes
 * réduites. Cette réduction est le travail de la couche application, et elle
 * vit ici plutôt que dans chaque écran — sinon la barre de navigation et le
 * tableau de bord compteraient chacun leurs alertes, avec la certitude d'en
 * afficher des nombres différents.
 */
export function useAlerts(): {
  alerts: readonly Alert[];
  summary: AlertSummary;
} {
  const { profile } = useCompanyProfile();
  const devise = profile.currency;

  const { items: factures } = useCollection(invoiceRepository);
  const { items: clients } = useCollection(clientRepository);
  const { items: projets } = useCollection(projectRepository);
  const { items: saisies } = useCollection(timeEntryRepository);
  const { items: depenses } = useCollection(expenseRepository);
  const { items: sessions } = useCollection(sessionRepository);
  const { items: apprenants } = useCollection(learnerRepository);
  const { items: inscriptions } = useCollection(enrollmentRepository);

  const [derniereSauvegarde, setDerniereSauvegarde] = useState(readLastBackup);
  useEffect(
    () => subscribeBackup(() => setDerniereSauvegarde(readLastBackup())),
    [],
  );

  const aujourdHui = todayIso();

  const alerts = useMemo(() => {
    const argent = (montant: number) => formatMoney(money(montant, devise));
    const clientsParId = new Map(clients.map((client) => [client.id, client]));
    const apprenantsParId = new Map(
      apprenants.map((apprenant) => [apprenant.id, apprenant]),
    );
    const sessionsParId = new Map(sessions.map((session) => [session.id, session]));

    const documents = toRevenueDocuments(factures, devise);

    const entree: AlertInput = {
      today: aujourdHui,
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
          formattedBalance: argent(reglement.balance),
          balance: reglement.balance,
        };
      }),
      installments: inscriptions
        .filter(
          (inscription) =>
            inscription.status !== "cancelled" && inscription.status !== "dropped",
        )
        .flatMap((inscription) => {
          const solde = enrollmentBalance(inscription, devise, aujourdHui);
          const apprenant = apprenantsParId.get(inscription.learnerId);
          const session = sessionsParId.get(inscription.sessionId);
          return solde.overdue.map((echeance) => ({
            enrollmentId: inscription.id,
            installmentId: echeance.id,
            learnerName:
              apprenant === undefined ? "Apprenant supprimé" : learnerName(apprenant),
            sessionTitle: session?.title ?? "Session supprimée",
            dueDate: echeance.dueDate,
            formattedAmount: argent(echeance.amount),
            amount: echeance.amount,
          }));
        }),
      sessions: sessions
        .filter(
          (session) => session.status !== "cancelled" && session.status !== "done",
        )
        .map((session) => {
          const remplissage = sessionOccupancy(session, inscriptions);
          return {
            id: session.id,
            title: session.title,
            startDate: session.startDate,
            taken: remplissage.taken,
            capacity: session.capacity,
          };
        }),
      projects: projets.map((projet) => {
        const rentabilite = computeProjectProfitability({
          projectId: projet.id,
          currency: devise,
          budget: money(Math.round(projet.budget), devise),
          documents,
          timeEntries: saisies,
          expenses: depenses,
        });
        return {
          id: projet.id,
          name: projet.name,
          costVsBudgetPercent: rentabilite.costVsBudgetPercent ?? 0,
          marginNegative: rentabilite.margin.amount < 0,
        };
      }),
      lastBackupAt: derniereSauvegarde,
    };

    return computeAlerts(entree);
  }, [
    devise,
    aujourdHui,
    factures,
    clients,
    projets,
    saisies,
    depenses,
    sessions,
    apprenants,
    inscriptions,
    derniereSauvegarde,
  ]);

  return { alerts, summary: summarizeAlerts(alerts) };
}
