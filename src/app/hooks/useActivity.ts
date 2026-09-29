import { useEffect, useState } from "react";

import type { ActivityEntry } from "../../domain/activity";
import { unreadSince } from "../../domain/activity";
import {
  markActivityRead,
  readActivity,
  readLastReadAt,
  subscribeActivity,
} from "../data/activityLog";

/**
 * Journal d'activité, synchronisé entre les écrans et les onglets.
 *
 * Le journal n'est pas une collection au sens du dépôt : rien ne s'y modifie
 * ni ne s'y supprime. Ce hook expose donc la lecture et le seul geste
 * disponible — marquer lu.
 */
export function useActivity(): {
  entries: readonly ActivityEntry[];
  unread: readonly ActivityEntry[];
  unreadCount: number;
  markRead: () => void;
} {
  const [entries, setEntries] = useState<readonly ActivityEntry[]>(readActivity);
  const [lastReadAt, setLastReadAt] = useState<string | null>(readLastReadAt);

  useEffect(
    () =>
      subscribeActivity(() => {
        setEntries(readActivity());
        setLastReadAt(readLastReadAt());
      }),
    [],
  );

  const unread = unreadSince(entries, lastReadAt);

  return {
    entries,
    unread,
    unreadCount: unread.length,
    markRead: markActivityRead,
  };
}
