// src/components/Join.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../api/socket";

export default function Join() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!socket.connected) {
      // Try to connect
      socket.connect();
      socket.once("connect", () => {
        actuallyJoin();
      });
    } else {
      actuallyJoin();
    }

    function actuallyJoin() {
      if (!username.trim()) {
        alert("Please enter a username.");
        return;
      }
      const code =
        roomCode.trim() || Math.random().toString(36).slice(2, 8).toUpperCase();
      socket.emit(
        "join-room",
        { roomCode: code, username },
        ({ roomCode, players, isHost }) => {
          console.log("join-room ACK:", { roomCode, players, isHost });
          navigate(`/lobby/${roomCode}`, {
            state: { username, players, isHost },
          });
        },
      );
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4">Word Arena</h1>
      <input
        className="mb-2 p-2 border rounded w-64"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="mb-4 p-2 border rounded w-64"
        placeholder="Room code (optional)"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
      />
      <button
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={handleJoin}
      >
        Join Game
      </button>
    </div>
  );
}
