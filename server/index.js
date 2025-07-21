// server/index.js

const express = require("express");
const rateLimit = require("express-rate-limit");
const { createServer } = require("http");
const { Server } = require("socket.io");
const {
  addPlayerToRoom,
  getPlayerNames,
  rooms,
  setGameWord,
} = require("./gameManager");
const wordsData = require("./words.json");

const app = express();
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter); // Apply to all requests

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
const VALID_WORDS = wordsData["5"].map((w) => w.toUpperCase());

// In-memory status per player: { [roomCode]: { [socketId]: { ... } } }
const playerStatus = {};

function getWordleFeedback(solution, guess) {
  solution = solution.toUpperCase();
  guess = guess.toUpperCase();
  const feedback = Array(solution.length).fill("gray");
  const solutionArr = solution.split("");
  const guessArr = guess.split("");

  // First pass: greens
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === solutionArr[i]) {
      feedback[i] = "green";
      solutionArr[i] = null;
      guessArr[i] = null;
    }
  }

  // Second pass: yellows
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] && solutionArr.includes(guessArr[i])) {
      const idx = solutionArr.indexOf(guessArr[i]);
      if (idx !== -1 && feedback[i] === "gray") {
        feedback[i] = "yellow";
        solutionArr[idx] = null;
      }
    }
  }
  return feedback;
}

io.on("connection", (socket) => {
  console.log("[Server] Client connected:", socket.id);

  socket.on("join-room", ({ roomCode, username }, callback) => {
    if (!roomCode || typeof roomCode !== "string") {
      callback({ error: "Invalid room code." });
      return;
    }

    const room = addPlayerToRoom(roomCode, socket, username);
    socket.join(roomCode);

    playerStatus[roomCode] = playerStatus[roomCode] || {};
    playerStatus[roomCode][socket.id] = {
      username,
      guesses: [],
      finished: false,
      finishedTime: null,
      greens: 0,
      yellows: 0,
    };

    io.in(roomCode).emit("room-update", { players: getPlayerNames(room) });
    io.in(roomCode).emit("status-update", { status: playerStatus[roomCode] });

    callback({
      roomCode,
      players: getPlayerNames(room),
      isHost: room.hostId === socket.id,
    });
  });

  socket.on("whoami", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const isHost = room.hostId === socket.id;
    socket.emit("host-status", { isHost });
  });

  socket.on("start-game", ({ roomCode, timed }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;
    const wordList = VALID_WORDS;
    const gameWord =
      wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();
    setGameWord(roomCode, gameWord);

    // Set up game meta in the room
    room.timed = !!timed;
    room.startTime = Date.now();

    // Reset player status
    Object.values(room.players).forEach((p) => {
      if (playerStatus[roomCode] && playerStatus[roomCode][p.id]) {
        playerStatus[roomCode][p.id].guesses = [];
        playerStatus[roomCode][p.id].finished = false;
        playerStatus[roomCode][p.id].finishedTime = null;
        playerStatus[roomCode][p.id].greens = 0;
        playerStatus[roomCode][p.id].yellows = 0;
      }
    });

    io.in(roomCode).emit("game-started", {
      wordLength: 5,
      startTime: room.startTime,
      timed: room.timed,
    });
    io.in(roomCode).emit("status-update", { status: playerStatus[roomCode] });
  });

  socket.on("submit-guess", ({ roomCode, guess }) => {
    const room = rooms[roomCode];
    if (!room || !room.gameWord) return;

    const upperGuess = guess.toUpperCase();

    if (!playerStatus[roomCode] || !playerStatus[roomCode][socket.id]) return;
    const status = playerStatus[roomCode][socket.id];

    // Stop guessing if finished or over 6 attempts
    if (status.finished || status.guesses.length >= 6) return;

    // Only allow valid 5-letter dictionary words
    if (!VALID_WORDS.includes(upperGuess)) {
      io.to(socket.id).emit("game-result", {
        correct: false,
        guess: upperGuess,
        feedback: null,
        notAWord: true,
      });
      return;
    }

    const feedback = getWordleFeedback(room.gameWord, upperGuess);
    const correct = room.gameWord === upperGuess;

    const greenCt = feedback.filter((c) => c === "green").length;
    const yellowCt = feedback.filter((c) => c === "yellow").length;

    status.guesses.push({ guess: upperGuess, feedback });
    status.greens = greenCt;
    status.yellows = yellowCt;

    if (correct && !status.finished) {
      status.finished = true;
      status.finishedTime = Date.now() - room.startTime;
    }

    // Finish player after 6th guess
    if (status.guesses.length >= 6 && !status.finished) {
      status.finished = true;
      status.finishedTime = Date.now() - room.startTime;
    }

    io.to(socket.id).emit("game-result", {
      correct,
      guess: upperGuess,
      feedback,
      notAWord: false,
      solution: correct ? room.gameWord : undefined,
    });

    io.in(roomCode).emit("status-update", { status: playerStatus[roomCode] });

    // Check if all finished
    const playerArray = Object.values(playerStatus[roomCode]);
    const allFinished =
      playerArray.length > 0 && playerArray.every((p) => p.finished);
    if (allFinished) {
      io.in(roomCode).emit("game-over", {
        status: playerStatus[roomCode],
        word: room.gameWord,
      });
    }
  });

  // Rematch/reuse: Only reset room and player status, don't delete room or players
  socket.on("return-to-menu", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    io.in(roomCode).emit("returned-to-menu", {});

    // Reset player status for everyone in the room
    if (room.players) {
      for (const player of room.players) {
        if (playerStatus[roomCode]) {
          playerStatus[roomCode][player.id] = {
            username: player.username,
            guesses: [],
            finished: false,
            finishedTime: null,
            greens: 0,
            yellows: 0,
          };
        }
      }
    }
    // Reset room game-specific state
    room.gameWord = undefined;
    room.timed = false;
    room.startTime = null;
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        if (playerStatus[code]) delete playerStatus[code][socket.id];
        io.in(code).emit("room-update", { players: getPlayerNames(room) });
        io.in(code).emit("status-update", { status: playerStatus[code] });
        // Only delete if room is empty
        if (room.players.length === 0) {
          delete rooms[code];
          delete playerStatus[code];
        }
        break;
      }
    }
  });
  socket.on("leave-room", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (room) {
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (playerStatus[roomCode]) {
        delete playerStatus[roomCode][socket.id];
      }
      socket.leave(roomCode);
      io.in(roomCode).emit("room-update", { players: getPlayerNames(room) });

      if (room.players.length === 0) {
        delete rooms[roomCode];
        delete playerStatus[roomCode];
      } else if (room.hostId === socket.id) {
        // Transfer host
        room.hostId = room.players[0].id;
        io.to(room.hostId).emit("host-status", { isHost: true });
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
});
