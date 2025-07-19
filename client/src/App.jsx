import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import socket from "./api/socket";
import Join from "./components/Join";
import Lobby from "./components/Lobby";
import GameBoard from "./components/GameBoard";
import "./index.css";

export default function App() {
  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Join />} />
        <Route path="/lobby/:roomCode" element={<Lobby />} />
        <Route path="/game/:roomCode" element={<GameBoard />} />
      </Routes>
    </BrowserRouter>
  );
}
