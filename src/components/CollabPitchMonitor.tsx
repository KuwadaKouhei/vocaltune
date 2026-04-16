"use client";

import { useCollaboration } from "@/hooks/useCollaboration";
import PitchMonitor from "./PitchMonitor";
import CollabStatusBar from "./CollabStatusBar";

interface CollabPitchMonitorProps {
  roomId: string;
}

export default function CollabPitchMonitor({ roomId }: CollabPitchMonitorProps) {
  const collab = useCollaboration({ roomId });

  const collabState = {
    bpm: collab.bpm,
    bars: collab.bars,
    semitoneHeight: collab.semitoneHeight,
    metronomeOn: collab.metronomeOn,
    editMode: collab.editMode,
    targetStrokes: collab.targetStrokes,
    midiFile: collab.midiFile,
    setBpm: collab.setBpm,
    setBars: collab.setBars,
    setSemitoneHeight: collab.setSemitoneHeight,
    setMetronomeOn: collab.setMetronomeOn,
    setEditMode: collab.setEditMode,
    setTargetStrokes: collab.setTargetStrokes,
    uploadMidi: collab.uploadMidi,
    clearMidi: collab.clearMidi,
    sendCursorMove: collab.sendCursorMove,
    remoteCursors: collab.remoteCursors,
    userId: collab.userId,
    remoteRecording: collab.remoteRecording,
    emitRecordingStart: collab.emitRecordingStart,
    emitRecordingStop: collab.emitRecordingStop,
    emitRecordingPitch: collab.emitRecordingPitch,
  };

  return (
    <PitchMonitor
      collabState={collabState}
      statusBar={
        <CollabStatusBar
          roomId={roomId}
          isConnected={collab.isConnected}
          userCount={collab.userCount}
          error={collab.error}
        />
      }
    />
  );
}
