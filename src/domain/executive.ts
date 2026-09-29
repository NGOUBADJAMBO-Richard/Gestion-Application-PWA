/**
 * Indicateurs de direction.
 *
 * Le tableau de bord disait ce qui était encaissé et ce qui restait dû. Il ne
 * disait pas les trois choses qu'un dirigeant regarde vraiment : **en combien
 * de temps on est payé**, **quelle part des devis se transforme**, et **de qui
 * dépend le chiffre d'affaires**.
 *
 * ## Délai d'encaissement plutôt que DSO
 *
 * Le DSO classique — créances ÷ chiffre d'affaires × nombre de jours — dépend
 * d'une convention de période, et deux calculs honnêtes donnent deux chiffres
 * différents. On mesure ici le délai **réellement observé** : pour chaque
 * facture soldée, le nombre de jours entre l'émission et le dernier
 * encaissement, pondéré par le montant. Une grosse facture payée en soixante
 * jours pèse plus qu'une petite payée en cinq, ce qui est exactement l'effet
 * de trésorerie subi.
 *
 * ## Dépendance client
 *
 * La part du premier client n'est pas une curiosité : au-delà de la moitié du
 * chiffre d'affaires, perdre ce client ferme l'entreprise. L'indicateur existe
 * pour que ce soit dit avant, pas après.
 *
 * Ce module est pur.
 */

import { daysBetween } from "./alerts";
import type { IsoDate } from "./date";
import { type CurrencyCode, type Money, money, sum } from "./money";

/** Document réduit à ce qui sert aux indicateurs de direction. */
export interface ExecutiveDocument {
  readonly id: string;
  readonly number: string;
  readonly kind: "quote" | "invoice" | "creditNote";
  readonly status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  readonly clientId: string;
  readonly issuedAt: IsoDate;
  /** Total hors taxes, signé. */
  readonly net: Money;
  /** Total toutes taxes comprises, signé. */
  readonly total: Money;
  /** Encaissements enregistrés, du plus ancien au plus récent. */
  readonly payments: readonly { readonly date: IsoDate; readonly amount: number }[];
  /** Numéro du devis à l'origine de la facture, le cas échéant. */
  readonly convertedFrom?: string | undefined;
}

// ----------------------------------------------------- Délai d'encaissement

export interface CollectionDelay {
  /** Délai moyen pondéré par les montants, en jours. `null` si rien de soldé. */
  readonly weightedDays: number | null;
  /** Délai médian, moins sensible à une facture atypique. `null` si rien. */
  readonly medianDays: number | null;
  /** Nombre de factures entrant dans le calcul. */
  readonly sampleSize: number;
  /** Plus long délai observé, avec le document concerné. */
  readonly worst: { readonly number: string; readonly days: number } | null;
}

/**
 * Délai d'encaissement observé.
 *
 * Ne retient que les factures **effectivement soldées** : une facture impayée
 * depuis quatre-vingt-dix jours n'a pas de délai d'encaissement, elle a un
 * retard. Les mélanger donnerait un chiffre qui s'améliore quand on cesse
 * d'être payé, puisque les créances les plus anciennes sortiraient du calcul.
 */
export function computeCollectionDelay(
  documents: readonly ExecutiveDocument[],
): CollectionDelay {
  const soldees = documents.filter(
    (document) =>
      document.kind === "invoice" &&
      document.status === "paid" &&
      document.payments.length > 0,
  );

  const mesures = soldees
    .map((document) => {
      // Le dernier encaissement solde la facture : c'est lui qui clôt le délai.
      const dernier = document.payments.reduce(
        (tardif, encaissement) =>
          encaissement.date > tardif.date ? encaissement : tardif,
        document.payments[0] as { date: IsoDate; amount: number },
      );
      return {
        number: document.number,
        days: Math.max(0, daysBetween(document.issuedAt, dernier.date)),
        weight: Math.abs(document.total.amount),
      };
    })
    .filter((mesure) => mesure.weight > 0);

  if (mesures.length === 0) {
    return { weightedDays: null, medianDays: null, sampleSize: 0, worst: null };
  }

  const poidsTotal = mesures.reduce((total, mesure) => total + mesure.weight, 0);
  const weightedDays =
    mesures.reduce((total, mesure) => total + mesure.days * mesure.weight, 0) /
    poidsTotal;

  const tries = [...mesures].sort((a, b) => a.days - b.days);
  const milieu = Math.floor(tries.length / 2);
  const medianDays =
    tries.length % 2 === 1
      ? (tries[milieu]?.days ?? 0)
      : ((tries[milieu - 1]?.days ?? 0) + (tries[milieu]?.days ?? 0)) / 2;

  const pire = tries[tries.length - 1];

  return {
    weightedDays,
    medianDays,
    sampleSize: mesures.length,
    worst: pire === undefined ? null : { number: pire.number, days: pire.days },
  };
}

// ---------------------------------------------------- Conversion des devis

export interface QuoteConversion {
  readonly issued: number;
  readonly converted: number;
  /** Taux en pourcentage. `null` si aucun devis émis. */
  readonly ratePercent: number | null;
  /** Montant HT des devis émis. */
  readonly quotedValue: Money;
  /** Montant HT des devis transformés en facture. */
  readonly convertedValue: Money;
  /** Devis émis, non transformés et non expirés à la date de référence. */
  readonly pending: number;
}

/**
 * Transformation des devis en factures.
 *
 * Le rapprochement se fait sur le **numéro du devis** porté par la facture, et
 * non sur le client ou le montant : deux devis au même client pour le même
 * montant ne sont pas le même devis, et les confondre gonflerait le taux.
 *
 * Les brouillons sont exclus des deux côtés — un devis jamais envoyé n'a pas
 * échoué, il n'a pas été tenté.
 */
export function computeQuoteConversion(
  documents: readonly ExecutiveDocument[],
  currency: CurrencyCode,
  today: IsoDate,
  validityDays = 30,
): QuoteConversion {
  const devis = documents.filter(
    (document) =>
      document.kind === "quote" &&
      document.status !== "draft" &&
      document.status !== "cancelled",
  );

  const numerosTransformes = new Set(
    documents
      .filter(
        (document) =>
          document.kind === "invoice" &&
          document.status !== "draft" &&
          document.convertedFrom !== undefined,
      )
      .map((document) => document.convertedFrom as string),
  );

  const transformes = devis.filter((document) =>
    numerosTransformes.has(document.number),
  );

  const enAttente = devis.filter(
    (document) =>
      !numerosTransformes.has(document.number) &&
      daysBetween(document.issuedAt, today) <= validityDays,
  );

  return {
    issued: devis.length,
    converted: transformes.length,
    ratePercent:
      devis.length === 0 ? null : (transformes.length / devis.length) * 100,
    quotedValue: sum(
      devis.map((document) => document.net),
      currency,
    ),
    convertedValue: sum(
      transformes.map((document) => document.net),
      currency,
    ),
    pending: enAttente.length,
  };
}

// ------------------------------------------------------- Dépendance client

export interface ClientShare {
  readonly clientId: string;
  readonly revenue: Money;
  /** Part du chiffre d'affaires total, en pourcentage. */
  readonly sharePercent: number;
  readonly documentCount: number;
}

export interface ClientConcentration {
  readonly total: Money;
  readonly ranking: readonly ClientShare[];
  /** Part du premier client. `null` si aucun chiffre d'affaires. */
  readonly topSharePercent: number | null;
  /**
   * Vrai si un seul client pèse plus de la moitié du chiffre d'affaires.
   * Au-delà, le perdre ferme l'entreprise.
   */
  readonly dependent: boolean;
}

/**
 * Répartition du chiffre d'affaires hors taxes par client.
 *
 * Les avoirs sont comptés au négatif, comme partout ailleurs : un client dont
 * la facture a été annulée ne doit pas figurer au classement pour un montant
 * qu'il n'a jamais dû.
 */
export function computeClientConcentration(
  documents: readonly ExecutiveDocument[],
  currency: CurrencyCode,
): ClientConcentration {
  const retenus = documents.filter(
    (document) => document.kind !== "quote" && document.status !== "draft",
  );

  const parClient = new Map<string, { montant: number; nombre: number }>();
  for (const document of retenus) {
    const courant = parClient.get(document.clientId) ?? { montant: 0, nombre: 0 };
    parClient.set(document.clientId, {
      montant: courant.montant + document.net.amount,
      nombre: courant.nombre + 1,
    });
  }

  const total = retenus.reduce((cumul, document) => cumul + document.net.amount, 0);

  const ranking = [...parClient.entries()]
    .map(([clientId, agregat]) => ({
      clientId,
      revenue: money(agregat.montant, currency),
      // Une part n'a de sens que sur un total positif : après annulations, un
      // total nul ou négatif rendrait des pourcentages absurdes.
      sharePercent: total > 0 ? (agregat.montant / total) * 100 : 0,
      documentCount: agregat.nombre,
    }))
    .sort((a, b) => b.revenue.amount - a.revenue.amount);

  const premier = ranking[0];

  return {
    total: money(total, currency),
    ranking,
    topSharePercent: total > 0 && premier !== undefined ? premier.sharePercent : null,
    dependent: total > 0 && premier !== undefined && premier.sharePercent > 50,
  };
}

// --------------------------------------------------------------- Trésorerie

export interface CashPosition {
  /** Facturé TTC non encore encaissé, toutes échéances confondues. */
  readonly receivable: Money;
  /** Part déjà échue. */
  readonly overdue: Money;
  /** Part à échoir. */
  readonly upcoming: Money;
}

export function computeCashPosition(
  documents: readonly ExecutiveDocument[],
  currency: CurrencyCode,
  today: IsoDate,
  dueDates: ReadonlyMap<string, IsoDate>,
): CashPosition {
  let echu = 0;
  let aEchoir = 0;

  for (const document of documents) {
    if (document.kind === "quote") continue;
    if (document.status === "draft" || document.status === "cancelled") continue;

    // Une facture marquée réglée l'est, même sans encaissement détaillé.
    //
    // Le statut est une déclaration de l'utilisateur, les encaissements sont
    // un journal : quand les deux divergent, la déclaration fait foi. Sans
    // cette règle, une facture soldée avant que le suivi des règlements
    // n'existe restait éternellement « à encaisser », et l'écran annonçait
    // une trésorerie attendue que personne n'attendait plus.
    if (document.status === "paid") continue;

    const encaisse = document.payments.reduce(
      (cumul, encaissement) => cumul + encaissement.amount,
      0,
    );
    const reste = document.total.amount - encaisse;
    if (reste <= 0) continue;

    const echeance = dueDates.get(document.id);
    if (echeance !== undefined && echeance < today) echu += reste;
    else aEchoir += reste;
  }

  return {
    receivable: money(echu + aEchoir, currency),
    overdue: money(echu, currency),
    upcoming: money(aEchoir, currency),
  };
}
