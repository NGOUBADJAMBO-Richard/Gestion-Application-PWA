import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BRAND, storageKey } from "../../branding";
import {
  INITIAL_LOCKOUT,
  type LockoutState,
  checkLockout,
  registerFailure,
  registerSuccess,
} from "../../domain/lockout";
import {
  type StoredCredential,
  WeakPasswordError,
  createCredential,
  resetPassword,
  verifyPassword,
  verifyRecoveryCode,
} from "../../infra/crypto/credential";

/**
 * Accès à l'application.
 *
 * L'implémentation précédente ignorait purement et simplement le mot de passe :
 * la fonction le recevait en paramètre et ne s'en servait jamais. N'importe
 * quelle saisie ouvrait la session en administrateur.
 *
 * Ce qui est protégé et ce qui ne l'est pas, pour que ce soit clair :
 * le mot de passe empêche l'accès occasionnel — un poste laissé ouvert. Il ne
 * chiffre pas les données, qui restent lisibles pour qui a la main sur la
 * machine. Chiffrer voudrait dire qu'un mot de passe oublié détruit
 * définitivement la comptabilité ; ce risque est plus grand que celui écarté.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "team";
  phone: string;
  company: string;
  department: string;
  joinedAt: string;
  lastLoginAt: string;
  avatar?: string;
}

/**
 * `unconfigured` : aucun mot de passe n'a encore été défini sur cet appareil.
 * `locked`       : un mot de passe existe, la session est fermée.
 * `unlocked`     : session ouverte.
 */
export type AuthStatus = "unconfigured" | "locked" | "unlocked";

export interface SetupResult {
  readonly recoveryCode: string;
}

interface AuthContextValue {
  readonly status: AuthStatus;
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  /** Secondes restantes avant la prochaine tentative, 0 si aucune attente. */
  readonly retryInSeconds: number;
  /**
   * Code de récupération émis et pas encore confirmé comme noté.
   * Tant qu’il est non nul, la navigation ne doit pas quitter l’écran : le
   * code n’est affiché qu’une fois et n’est pas conservé en clair.
   */
  readonly pendingRecoveryCode: string | null;
  acknowledgeRecoveryCode: () => void;
  setUp: (email: string, password: string) => Promise<SetupResult>;
  unlock: (password: string) => Promise<void>;
  recover: (recoveryCode: string, newPassword: string) => Promise<SetupResult>;
  lock: () => void;
  logout: () => void;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const CREDENTIAL_KEY = storageKey("credential");
const LOCKOUT_KEY = storageKey("lockout");
const SESSION_KEY = storageKey("session");
const PROFILE_KEY = storageKey("user");

/** Au-delà, la session se referme toute seule. */
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readJson<T>(key: string): T | null {
  try {
    const brut = localStorage.getItem(key);
    return brut === null ? null : (JSON.parse(brut) as T);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage refusé : la session restera simplement non persistée.
  }
}

function makeUser(email: string, now: string): User {
  const nom = email.split("@")[0] ?? email;
  return {
    id: "local",
    name: nom.charAt(0).toUpperCase() + nom.slice(1),
    email,
    role: "admin",
    phone: BRAND.contact.phone,
    company: BRAND.company,
    department: "Direction",
    joinedAt: now.slice(0, 10),
    lastLoginAt: now,
  };
}


interface SessionRestauree {
  readonly user: User | null;
  readonly status: AuthStatus;
}

/**
 * État d’ouverture, calcule avant le premier rendu.
 *
 * Cette lecture se faisait dans un useEffect : au premier rendu l application
 * se croyait déconnectée, la route protégée renvoyait vers /login, et le
 * rebond suivant atterrissait sur l’accueil. Conséquence visible : recharger
 * la page sur /invoicing ramenait au tableau de bord, et tout lien profond
 * était perdu.
 */
function restaurerSession(): SessionRestauree {
  const credential = readJson<StoredCredential>(CREDENTIAL_KEY);
  if (credential === null) return { user: null, status: "unconfigured" };

  const session = readJson<{ email: string; lastActivityAt: number }>(SESSION_KEY);
  if (session === null) return { user: null, status: "locked" };

  if (Date.now() - session.lastActivityAt > INACTIVITY_LIMIT_MS) {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Sans consequence : la session est de toute façon considérée fermée.
    }
    return { user: null, status: "locked" };
  }

  const profil = readJson<User>(PROFILE_KEY);
  return {
    user: profil ?? makeUser(session.email, new Date().toISOString()),
    status: "unlocked",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [credential, setCredential] = useState<StoredCredential | null>(() =>
    readJson<StoredCredential>(CREDENTIAL_KEY),
  );
  const [lockout, setLockout] = useState<LockoutState>(
    () => readJson<LockoutState>(LOCKOUT_KEY) ?? INITIAL_LOCKOUT,
  );
  const [restaure] = useState(restaurerSession);
  const [user, setUser] = useState<User | null>(restaure.user);
  const [status, setStatus] = useState<AuthStatus>(restaure.status);
  const [retryInSeconds, setRetryInSeconds] = useState(0);
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState<string | null>(null);
  const inactivityTimer = useRef<number | undefined>(undefined);

  const lock = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setStatus((precedent) => (precedent === "unconfigured" ? precedent : "locked"));
  }, []);

  /**
   * Fermeture automatique après inactivité.
   *
   * Un poste laissé ouvert dans un bureau partagé est le cas d'usage que le
   * mot de passe est censé couvrir ; sans cette minuterie, il ne le couvre que
   * jusqu'à la première connexion de la journée.
   */
  useEffect(() => {
    if (status !== "unlocked") return;

    const repousser = () => {
      writeJson(SESSION_KEY, {
        email: user?.email ?? "",
        lastActivityAt: Date.now(),
      });
      window.clearTimeout(inactivityTimer.current);
      inactivityTimer.current = window.setTimeout(lock, INACTIVITY_LIMIT_MS);
    };

    repousser();
    const evenements = ["pointerdown", "keydown", "visibilitychange"] as const;
    for (const nom of evenements) window.addEventListener(nom, repousser);

    return () => {
      window.clearTimeout(inactivityTimer.current);
      for (const nom of evenements) window.removeEventListener(nom, repousser);
    };
  }, [status, user, lock]);

  const persistLockout = useCallback((etat: LockoutState) => {
    setLockout(etat);
    writeJson(LOCKOUT_KEY, etat);
  }, []);

  const setUp = useCallback(
    async (email: string, password: string): Promise<SetupResult> => {
      if (credential !== null) {
        throw new AuthError(
          "Un mot de passe est déjà défini sur cet appareil. " +
            "Utilise ton code de récupération pour le remplacer.",
        );
      }

      let cree;
      try {
        cree = await createCredential(password);
      } catch (cause) {
        throw cause instanceof WeakPasswordError
          ? new AuthError(cause.message)
          : cause;
      }

      const maintenant = new Date().toISOString();
      const profil = makeUser(email, maintenant);

      writeJson(CREDENTIAL_KEY, cree.credential);
      writeJson(PROFILE_KEY, profil);
      writeJson(SESSION_KEY, { email, lastActivityAt: Date.now() });

      setCredential(cree.credential);
      setUser(profil);
      setStatus("unlocked");
      persistLockout(registerSuccess());
      setPendingRecoveryCode(cree.recoveryCode);

      return { recoveryCode: cree.recoveryCode };
    },
    [credential, persistLockout],
  );

  const unlock = useCallback(
    async (password: string): Promise<void> => {
      if (credential === null) {
        throw new AuthError(
          "Aucun mot de passe n'est défini sur cet appareil. Commence par en créer un.",
        );
      }

      const verrou = checkLockout(lockout);
      if (verrou.locked) {
        setRetryInSeconds(verrou.retryInSeconds);
        throw new AuthError(verrou.message ?? "Trop de tentatives échouées.");
      }

      const correct = await verifyPassword(password, credential);
      if (!correct) {
        const suivant = registerFailure(lockout);
        persistLockout(suivant);
        const apres = checkLockout(suivant);
        setRetryInSeconds(apres.retryInSeconds);

        // Message unique : distinguer « compte inconnu » de « mot de passe
        // faux » renseignerait un attaquant sans aider l'utilisateur légitime.
        throw new AuthError(
          apres.locked && apres.message !== undefined
            ? apres.message
            : "Mot de passe incorrect.",
        );
      }

      const maintenant = new Date().toISOString();
      const profil = readJson<User>(PROFILE_KEY);
      const aJour: User = profil
        ? { ...profil, lastLoginAt: maintenant }
        : makeUser("", maintenant);

      writeJson(PROFILE_KEY, aJour);
      writeJson(SESSION_KEY, { email: aJour.email, lastActivityAt: Date.now() });

      setUser(aJour);
      setStatus("unlocked");
      setRetryInSeconds(0);
      persistLockout(registerSuccess());
    },
    [credential, lockout, persistLockout],
  );

  const recover = useCallback(
    async (recoveryCode: string, newPassword: string): Promise<SetupResult> => {
      if (credential === null) {
        throw new AuthError("Aucun accès n'est configuré sur cet appareil.");
      }

      const valide = await verifyRecoveryCode(recoveryCode, credential);
      if (!valide) {
        const suivant = registerFailure(lockout);
        persistLockout(suivant);
        throw new AuthError(
          "Ce code de récupération ne correspond pas. Vérifie la recopie, " +
            "les tirets et les espaces n'ont pas d'importance.",
        );
      }

      let renouvele;
      try {
        renouvele = await resetPassword(newPassword);
      } catch (cause) {
        throw cause instanceof WeakPasswordError
          ? new AuthError(cause.message)
          : cause;
      }

      const profil = readJson<User>(PROFILE_KEY);
      writeJson(CREDENTIAL_KEY, renouvele.credential);
      if (profil !== null) {
        writeJson(SESSION_KEY, { email: profil.email, lastActivityAt: Date.now() });
        setUser({ ...profil, lastLoginAt: new Date().toISOString() });
      }

      setCredential(renouvele.credential);
      setStatus("unlocked");
      setRetryInSeconds(0);
      persistLockout(registerSuccess());
      setPendingRecoveryCode(renouvele.recoveryCode);

      return { recoveryCode: renouvele.recoveryCode };
    },
    [credential, lockout, persistLockout],
  );

  const acknowledgeRecoveryCode = useCallback(() => {
    setPendingRecoveryCode(null);
  }, []);

  const logout = useCallback(() => {
    setPendingRecoveryCode(null);
    lock();
  }, [lock]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "unlocked",
      retryInSeconds,
      pendingRecoveryCode,
      acknowledgeRecoveryCode,
      setUp,
      unlock,
      recover,
      lock,
      logout,
    }),
    [
      status,
      user,
      retryInSeconds,
      pendingRecoveryCode,
      acknowledgeRecoveryCode,
      setUp,
      unlock,
      recover,
      lock,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider.");
  }
  return context;
}
