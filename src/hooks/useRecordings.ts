"use client";

import { useState, useEffect, useCallback } from "react";
import type { Recording } from "@/lib/db/schema";
import {
  getAllRecordings,
  saveRecording,
  deleteRecording,
} from "@/lib/db/recordings";

export interface UseRecordingsReturn {
  recordings: Recording[];
  loading: boolean;
  save: (recording: Omit<Recording, "id">) => Promise<number>;
  remove: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRecordings(): UseRecordingsReturn {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllRecordings();
    setRecordings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (recording: Omit<Recording, "id">) => {
      const id = await saveRecording(recording);
      await refresh();
      return id;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteRecording(id);
      await refresh();
    },
    [refresh]
  );

  return { recordings, loading, save, remove, refresh };
}
