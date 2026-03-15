import { db, type Recording } from "./schema";

export async function saveRecording(
  recording: Omit<Recording, "id">
): Promise<number> {
  const id = await db.recordings.add(recording);
  return id as number;
}

export async function getAllRecordings(): Promise<Recording[]> {
  return await db.recordings.orderBy("createdAt").reverse().toArray();
}

export async function getRecordingById(
  id: number
): Promise<Recording | undefined> {
  return await db.recordings.get(id);
}

export async function deleteRecording(id: number): Promise<void> {
  await db.recordings.delete(id);
}

export async function getRecordingsByTitle(
  title: string
): Promise<Recording[]> {
  return await db.recordings
    .where("title")
    .equals(title)
    .reverse()
    .sortBy("createdAt");
}

export async function getDistinctTitles(): Promise<string[]> {
  const recordings = await db.recordings.orderBy("title").uniqueKeys();
  return recordings as string[];
}
