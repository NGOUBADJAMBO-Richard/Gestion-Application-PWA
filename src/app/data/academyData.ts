import type {
  Enrollment,
  Learner,
  TrainingSession,
} from "../../domain/academy";
import type { Reminder } from "../../domain/reminder";

/**
 * Données de démonstration de l'Academy et des relances.
 *
 * Tarifs et volumes horaires repris du catalogue importé du site : une session
 * de démonstration vendue à un prix inventé donnerait une idée fausse de ce que
 * l'activité rapporte. Les remises appliquées sont celles annoncées sur le
 * site — −20 % pour les étudiants et les demandeurs d'emploi.
 *
 * Elles ne sont écrites qu'à la première ouverture et disparaissent dès que de
 * vraies données existent.
 */

export const mockSessions: TrainingSession[] = [
  {
    id: "s-1",
    catalogueId: "bootcamp-mern",
    title: "Bootcamp FullStack MERN",
    startDate: "2026-04-06",
    endDate: "2026-08-28",
    capacity: 12,
    mode: "onsite",
    trainer: "Richard Ngoubadjambo",
    location: "Libreville, Nombakélé",
    price: 300000,
    hours: 240,
    status: "running",
    notes: "1re promotion — tarif de lancement à 240 000 F pour les 12 places.",
  },
  {
    id: "s-2",
    catalogueId: "m3",
    title: "React.js",
    startDate: "2026-05-11",
    endDate: "2026-05-29",
    capacity: 10,
    mode: "remote",
    trainer: "Richard Ngoubadjambo",
    price: 70000,
    hours: 48,
    status: "confirmed",
  },
  {
    id: "s-3",
    catalogueId: "ia-entrepreneurs",
    title: "IA pour entrepreneurs",
    startDate: "2026-06-13",
    endDate: "2026-06-13",
    capacity: 15,
    mode: "onsite",
    trainer: "Richard Ngoubadjambo",
    location: "Libreville, Centre-ville",
    price: 25000,
    hours: 6,
    status: "planned",
  },
  {
    id: "s-4",
    catalogueId: "intra-journee",
    title: "Journée complète sur site",
    startDate: "2026-03-17",
    endDate: "2026-03-17",
    capacity: 12,
    mode: "inhouse",
    trainer: "Richard Ngoubadjambo",
    location: "Akanda Group, siège",
    price: 160000,
    hours: 7,
    status: "done",
    notes: "Bureautique et sécurité, équipe administrative.",
  },
];

export const mockLearners: Learner[] = [
  {
    id: "ap-1",
    firstName: "Yannick",
    lastName: "Moussavou",
    email: "y.moussavou@example.ga",
    phone: "+241 74 55 12 08",
    city: "Libreville",
  },
  {
    id: "ap-2",
    firstName: "Nadège",
    lastName: "Bouanga",
    email: "n.bouanga@example.ga",
    phone: "+241 66 41 77 30",
    city: "Libreville",
    notes: "Étudiante en licence informatique.",
  },
  {
    id: "ap-3",
    firstName: "Steeve",
    lastName: "Ibinga",
    email: "s.ibinga@example.ga",
    phone: "+241 62 09 84 15",
    city: "Owendo",
  },
  {
    id: "ap-4",
    firstName: "Chancelvie",
    lastName: "Mintsa",
    email: "c.mintsa@akandagroup.ga",
    phone: "+241 77 22 63 41",
    city: "Libreville",
    clientId: "1",
    notes: "Envoyée par Akanda Group.",
  },
  {
    id: "ap-5",
    firstName: "Brice",
    lastName: "Ovono",
    email: "b.ovono@example.ga",
    phone: "+241 65 18 90 77",
    city: "Libreville",
  },
];

export const mockEnrollments: Enrollment[] = [
  {
    id: "in-1",
    sessionId: "s-1",
    learnerId: "ap-1",
    status: "confirmed",
    agreedPrice: 240000,
    discountReason: "Tarif 1re promotion",
    enrolledAt: "2026-03-28",
    attendancePercent: 92,
    installments: [
      { id: "ech-1", dueDate: "2026-04-06", amount: 48000, paidAt: "2026-04-06" },
      { id: "ech-2", dueDate: "2026-05-06", amount: 48000, paidAt: "2026-05-07" },
      { id: "ech-3", dueDate: "2026-06-05", amount: 48000 },
      { id: "ech-4", dueDate: "2026-07-05", amount: 48000 },
      { id: "ech-5", dueDate: "2026-08-04", amount: 48000 },
    ],
  },
  {
    id: "in-2",
    sessionId: "s-1",
    learnerId: "ap-2",
    status: "confirmed",
    agreedPrice: 192000,
    discountReason: "Étudiante, −20 % sur le tarif de lancement",
    enrolledAt: "2026-03-30",
    attendancePercent: 88,
    installments: [
      { id: "ech-1", dueDate: "2026-04-06", amount: 38400, paidAt: "2026-04-06" },
      { id: "ech-2", dueDate: "2026-05-06", amount: 38400, paidAt: "2026-05-06" },
      { id: "ech-3", dueDate: "2026-06-05", amount: 38400 },
      { id: "ech-4", dueDate: "2026-07-05", amount: 38400 },
      { id: "ech-5", dueDate: "2026-08-04", amount: 38400 },
    ],
  },
  {
    id: "in-3",
    sessionId: "s-1",
    learnerId: "ap-3",
    status: "dropped",
    agreedPrice: 240000,
    discountReason: "Tarif 1re promotion",
    enrolledAt: "2026-04-01",
    attendancePercent: 25,
    installments: [
      { id: "ech-1", dueDate: "2026-04-06", amount: 48000, paidAt: "2026-04-06" },
      { id: "ech-2", dueDate: "2026-05-06", amount: 48000 },
      { id: "ech-3", dueDate: "2026-06-05", amount: 48000 },
      { id: "ech-4", dueDate: "2026-07-05", amount: 48000 },
      { id: "ech-5", dueDate: "2026-08-04", amount: 48000 },
    ],
  },
  {
    id: "in-4",
    sessionId: "s-2",
    learnerId: "ap-5",
    status: "pending",
    agreedPrice: 70000,
    enrolledAt: "2026-04-22",
    installments: [{ id: "ech-1", dueDate: "2026-05-11", amount: 70000 }],
  },
  {
    id: "in-5",
    sessionId: "s-4",
    learnerId: "ap-4",
    status: "attended",
    agreedPrice: 160000,
    enrolledAt: "2026-03-05",
    attendancePercent: 100,
    installments: [
      { id: "ech-1", dueDate: "2026-03-17", amount: 160000, paidAt: "2026-03-20" },
    ],
  },
];

/**
 * Historique de relance.
 *
 * Une seule, sur la facture réellement en retard du jeu de démonstration : un
 * historique fourni donnerait l'impression que l'agence relance en permanence.
 */
export const mockReminders: Reminder[] = [
  {
    id: "rel-1",
    invoiceId: "3",
    level: "courtesy",
    channel: "whatsapp",
    sentAt: "2026-04-02",
    note: "Règlement annoncé pour la fin de semaine.",
  },
];
