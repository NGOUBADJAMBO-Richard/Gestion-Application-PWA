/**
 * Entités métier de l'application.
 *
 * Ce fichier s'appelait « entities » et portait, en plus des types, un jeu de
 * données de démonstration — clients, projets et factures fictifs écrits à la
 * première ouverture. Une application de gestion qui démarre sur de faux
 * clients invite à les confondre avec de vrais, et le premier réflexe est de
 * les supprimer un par un. Elle démarre désormais vide.
 */

import type { Expense } from "../../domain/expense";
import type { Milestone } from "../../domain/milestone";
import type { Payment } from "../../domain/payment";
import type { TimeEntry } from "../../domain/timeEntry";

export type { Expense, Milestone, TimeEntry };

export interface Client {
  id: string;
  name: string;
  /**
   * Date d’archivage. Un client porteur de factures émises ne se supprime
   * pas : on l’archive, ce qui le sort des listes sans rien détruire.
   */
  // Le `| undefined` explicite est requis par exactOptionalPropertyTypes :
  // sans lui, on ne peut pas remettre le champ à vide pour désarchiver.
  archivedAt?: string | undefined;
  email: string;
  phone: string;
  company: string;
  projects: number;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  /** Reference au client par identifiant : un nom d’entreprise n’est pas une clé. */
  clientId: string;
  status: "active" | "completed" | "pending";
  deadline: string;
  budget: number;
  /**
   * Livrables du projet.
   *
   * Remplacent le pourcentage d'avancement, qui était saisi à la main et
   * ne mesurait rien : il ne se mettait pas à jour, ne disait pas ce qu'il
   * restait, et restait bloqué à « 90 % ». Un jalon est livré ou ne l'est
   * pas — la question ne se discute pas.
   */
  milestones: Milestone[];
  description?: string;
}

export interface Invoice {
  id: string;
  number: string;
  /**
   * Nature du document.
   *
   * Devis, facture et avoir partagent la même structure — un client, des
   * lignes, des totaux — et ne diffèrent que par leur portée comptable. En
   * faire trois entités distinctes dupliquerait le calcul des totaux, la
   * numérotation et le rendu PDF, avec la certitude de les voir diverger.
   */
  kind: "quote" | "invoice" | "creditNote";
  /** Facture annulée par cet avoir. */
  cancels?: string | undefined;
  /** Devis à l’origine de cette facture, pour la traçabilité commerciale. */
  convertedFrom?: string | undefined;
  /**
   * Encaissements. Une facture se règle souvent en plusieurs fois — acompte
   * à la commande, solde à la livraison — et sans ce suivi il faut choisir
   * entre la marquer payée à tort ou impayée à tort.
   */
  payments?: Payment[] | undefined;
  /** Reference au client par identifiant : un nom d’entreprise n’est pas une clé. */
  clientId: string;
  /**
   * Projet rattaché.
   *
   * Facultatif, pour deux raisons : les pièces enregistrées avant ce champ ne
   * l’ont pas, et une prestation ponctuelle — une consultation, un dépannage —
   * n’appartient légitimement à aucun projet. Sans rattachement, la pièce reste
   * comptée au chiffre d’affaires mais signalée comme non analysée : la
   * rattacher au hasard inventerait une rentabilité.
   */
  projectId?: string | undefined;
  items: InvoiceItem[];
  amount: number;
  /**
   * Cycle de vie comptable.
   * `draft`     : brouillon, sans numero, librement modifiable et supprimable.
   * `pending`   : emise, en attente de reglement.
   * `paid`      : reglee.
   * `overdue`   : emise, echeance depassee.
   * `cancelled` : annulee par un avoir.
   */
  status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  date: string;
  dueDate: string;
  paymentMethod: "bank-transfer" | "mobile-money" | "cash" | "card";
  paymentTerms: string;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface Ticket {
  id: string;
  title: string;
  /** Reference au client par identifiant : un nom d’entreprise n’est pas une clé. */
  clientId: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high";
  created: string;
}
