"use client";

import { use } from "react";
import CollabPitchMonitor from "@/components/CollabPitchMonitor";

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);

  return <CollabPitchMonitor roomId={roomId} />;
}
