import { createServer } from "http";
import { Server } from "socket.io";
import { RoomManager } from "./room.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 5e6, // 5MB (MIDIファイル転送用)
});

const rooms = new RoomManager();

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  // --- ルーム管理 ---

  socket.on("room:create", (callback) => {
    const roomId = rooms.createRoom();
    console.log(`[room:create] ${roomId} by ${socket.id}`);
    callback(roomId);
  });

  socket.on("room:join", (data, callback) => {
    const result = rooms.joinRoom(data.roomId, socket.id);
    if (!result.ok) {
      callback({ ok: false, error: result.error });
      return;
    }

    socket.join(data.roomId);
    console.log(`[room:join] ${data.roomId} user=${result.userId} (${result.users.length}人)`);

    callback({
      ok: true,
      state: result.state,
      userId: result.userId,
      users: result.users,
    });

    // 他のユーザーに通知
    socket.to(data.roomId).emit("room:user-joined", {
      userId: result.userId,
      userCount: result.users.length,
      color: result.users[result.users.length - 1].color,
    });
  });

  socket.on("room:leave", () => {
    handleLeave();
  });

  // --- スカラー状態同期 ---

  socket.on("state:update", (data) => {
    const info = rooms.updateScalar(socket.id, data.key, data.value);
    if (info) {
      socket.to(info.roomId).emit("state:updated", {
        key: data.key,
        value: data.value,
        userId: info.userId,
      });
    }
  });

  // --- ストローク同期 ---

  socket.on("stroke:update", (data) => {
    const info = rooms.updateStrokes(socket.id, data.targetStrokes);
    if (info) {
      socket.to(info.roomId).emit("stroke:updated", {
        targetStrokes: data.targetStrokes,
        userId: info.userId,
      });
    }
  });

  // --- MIDI同期 ---

  socket.on("midi:upload", (data) => {
    const info = rooms.updateMidi(socket.id, data.data, data.fileName);
    if (info) {
      socket.to(info.roomId).emit("midi:uploaded", {
        data: data.data,
        fileName: data.fileName,
        userId: info.userId,
      });
    }
  });

  socket.on("midi:clear", () => {
    const info = rooms.clearMidi(socket.id);
    if (info) {
      socket.to(info.roomId).emit("midi:cleared", {
        userId: info.userId,
      });
    }
  });

  // --- カーソル同期 ---

  socket.on("cursor:move", (data) => {
    const userInfo = rooms.getUserInfo(socket.id);
    if (userInfo) {
      socket.to(userInfo.roomId).emit("cursor:moved", {
        userId: userInfo.userId,
        point: data.point,
        color: userInfo.color,
      });
    }
  });

  // --- 切断 ---

  socket.on("disconnect", () => {
    console.log(`[disconnect] ${socket.id}`);
    handleLeave();
  });

  function handleLeave() {
    const result = rooms.leaveRoom(socket.id);
    if (result) {
      socket.to(result.roomId).emit("room:user-left", {
        userId: result.userId,
        userCount: result.userCount,
      });
      socket.leave(result.roomId);
      console.log(`[room:leave] ${result.roomId} user=${result.userId} (残り${result.userCount}人)`);
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`VocalTune Collab Server listening on port ${PORT}`);
  console.log(`Accepting connections from: ${CLIENT_ORIGIN}`);
});
