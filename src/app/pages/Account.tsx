import { BackupPanel } from "../components/BackupPanel";
import { NotificationPanel } from "../components/NotificationPanel";
import { ResetPanel } from "../components/ResetPanel";
import { UserProfilePanel } from "../components/UserProfilePanel";
import { useAuth } from "../contexts/AuthContext";

/**
 * Mon compte.
 *
 * Quatre blocs, dans l'ordre de ce qu'on vient y faire : se relire, régler les
 * notifications, sauvegarder, et — tout en bas, séparé — repartir de zéro.
 */
export function Account() {
  const { user } = useAuth();

  if (user === null) return null;

  return (
    <div className="space-y-6">
      <header className="enter wave-surface -mx-4 px-4 py-6 lg:-mx-6 lg:px-6">
        <p className="section-label">Compte</p>
        <h1 className="mt-2">Mon compte</h1>
        <p className="mt-1 text-muted-foreground">
          {user.name} &middot; {user.company}
        </p>
      </header>

      <UserProfilePanel />

      <NotificationPanel />

      <BackupPanel />

      <ResetPanel />
    </div>
  );
}
