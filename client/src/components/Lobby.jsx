import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import socket from "../api/socket";

export default function Lobby() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get username from state or localStorage 
  const getStoredUsername = () =>
    localStorage.getItem("wordle-arena-username") || "";
  const [username, setUsername] = useState(
    location.state?.username || getStoredUsername(),
  );
  const [players, setPlayers] = useState(
    location.state?.players || (username ? [username] : []),
  );
  const [isHost, setIsHost] = useState(location.state?.isHost || false);

  // Prompt once for username if none set
  useEffect(() => {
    if (!username) {
      const name = window.prompt("Enter your name:");
      if (name) {
        const trimmed = name.trim();
        setUsername(trimmed);
        localStorage.setItem("wordle-arena-username", trimmed);
      }
    }
  }, [username]);

  // Save username to localStorage any time it changes
  useEffect(() => {
    if (username) {
      localStorage.setItem("wordle-arena-username", username);
    }
  }, [username]);

  // Handle joining the room and all socket listeners
  useEffect(() => {
    if (username && roomCode) {
      socket.emit(
        "join-room",
        { roomCode, username },
        ({ players, isHost, error }) => {
          if (error) {
            alert(error);
            navigate("/", { replace: true });
          } else {
            setPlayers(players);
            setIsHost(isHost);
          }
        },
      );
    }

    socket.on("room-update", ({ players }) => {
      setPlayers(players);
    });

    socket.on("host-status", ({ isHost: serverIsHost }) =>
      setIsHost(serverIsHost),
    );
    socket.on("game-started", ({ wordLength, startTime }) => {
      navigate(`/game/${roomCode}`, {
        state: { username, startTime },
      });
    });

    socket.emit("whoami", { roomCode });

    return () => {
      socket.off("room-update");
      socket.off("host-status");
      socket.off("game-started");
    };
  }, [roomCode, username, navigate]);

  const handleStartGame = () => {
    socket.emit("start-game", { roomCode });
  };

  const handleLeaveLobby = () => {
    socket.emit("leave-room", { roomCode });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-4">
      <h2 className="text-2xl font-bold mb-4">Lobby: {roomCode}</h2>
      <div className="mb-2">Players:</div>
      <ul className="mb-8">
        {players.map((player, idx) => (
          <li key={idx}>{player}</li>
        ))}
      </ul>
      {isHost && (
        <button
          className="mt-2 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-800"
          onClick={handleStartGame}
        >
          Start Game
        </button>
      )}
      <button
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
        onClick={handleLeaveLobby}
      >
        Leave Lobby
      </button>
      {/* Return to Main Menu button */}
      <button
        className="mt-4 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-600"
        onClick={() => navigate('/')}
      >
        Return to Main Menu
      </button>
    </div>
  );
}
