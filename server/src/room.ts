import { nanoid } from "nanoid";
import type { Room, RoomState, RoomUser, ScalarStateKey, TargetPoint } from "./types.js";

const USER_COLORS = ["#00e5ff", "#ff6ec7"];

const ROOM_TTL_MS = 5 * 60 * 1000; // 5分間空ならGC

function createDefaultState(): RoomState {
  return {
    bpm: 120,
    bars: 2,
    semitoneHeight: 16,
    metronomeOn: false,
    editMode: false,
    targetStrokes: [],
    midiFile: null,
  };
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, string>();
  private gcTimer: ReturnType<typeof setInterval>;

  constructor() {
    // 定期的に空のルームをGC
    this.gcTimer = setInterval(() => this.gc(), 60_000);
  }

  createRoom(): string {
    const id = nanoid(10);
    const room: Room = {
      id,
      users: [],
      state: createDefaultState(),
      createdAt: Date.now(),
      recordingUserId: null,
    };
    this.rooms.set(id, room);
    return id;
  }

  joinRoom(roomId: string, socketId: string): { ok: true; state: RoomState; userId: string; users: RoomUser[] } | { ok: false; error: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { ok: false, error: "ルームが見つかりません" };
    }
    if (room.users.length >= 2) {
      return { ok: false, error: "ルームが満員です（最大2人）" };
    }

    const userId = nanoid(8);
    const colorIndex = room.users.length;
    const user: RoomUser = {
      userId,
      socketId,
      color: USER_COLORS[colorIndex] || USER_COLORS[0],
    };

    room.users.push(user);
    this.socketToRoom.set(socketId, roomId);

    return { ok: true, state: room.state, userId, users: room.users };
  }

  leaveRoom(socketId: string): { roomId: string; userId: string; userCount: number; wasRecording: boolean } | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return null;
    }

    const user = room.users.find((u) => u.socketId === socketId);
    if (!user) {
      this.socketToRoom.delete(socketId);
      return null;
    }

    // 録音中のユーザーが退出した場合はリセット
    const wasRecording = room.recordingUserId === user.userId;
    if (wasRecording) {
      room.recordingUserId = null;
    }

    room.users = room.users.filter((u) => u.socketId !== socketId);
    this.socketToRoom.delete(socketId);

    return { roomId, userId: user.userId, userCount: room.users.length, wasRecording };
  }

  updateScalar(socketId: string, key: ScalarStateKey, value: number | boolean): { roomId: string; userId: string } | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.find((u) => u.socketId === socketId);
    if (!user) return null;

    // 型安全に状態を更新
    (room.state as unknown as Record<string, unknown>)[key] = value;

    return { roomId, userId: user.userId };
  }

  updateStrokes(socketId: string, targetStrokes: TargetPoint[][]): { roomId: string; userId: string } | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.find((u) => u.socketId === socketId);
    if (!user) return null;

    room.state.targetStrokes = targetStrokes;

    return { roomId, userId: user.userId };
  }

  updateMidi(socketId: string, data: ArrayBuffer, fileName: string): { roomId: string; userId: string } | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.find((u) => u.socketId === socketId);
    if (!user) return null;

    room.state.midiFile = { data, fileName };

    return { roomId, userId: user.userId };
  }

  clearMidi(socketId: string): { roomId: string; userId: string } | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.find((u) => u.socketId === socketId);
    if (!user) return null;

    room.state.midiFile = null;

    return { roomId, userId: user.userId };
  }

  startRecording(socketId: string): { roomId: string; userId: string } | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.find((u) => u.socketId === socketId);
    if (!user) return null;

    room.recordingUserId = user.userId;
    return { roomId, userId: user.userId };
  }

  stopRecording(socketId: string): { roomId: string; userId: string } | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.find((u) => u.socketId === socketId);
    if (!user) return null;

    if (room.recordingUserId === user.userId) {
      room.recordingUserId = null;
    }
    return { roomId, userId: user.userId };
  }

  getUserInfo(socketId: string): { roomId: string; userId: string; color: string } | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.find((u) => u.socketId === socketId);
    if (!user) return null;

    return { roomId, userId: user.userId, color: user.color };
  }

  private gc() {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      if (room.users.length === 0 && now - room.createdAt > ROOM_TTL_MS) {
        this.rooms.delete(id);
      }
    }
  }

  destroy() {
    clearInterval(this.gcTimer);
  }
}
