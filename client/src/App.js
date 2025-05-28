import logo from './logo.svg';
// import './App.css';
import React, { useEffect } from "react";
import socket from "./api/socket";

function App() {
  useEffect(() => {
    // Connect on mount
    socket.connect();

    socket.on("connect", () => {
      console.log("🔌 Connected with socket id:", socket.id);
    });

    // Clean up on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="p-6 bg-blue-600 text-white rounded-lg shadow-lg">
        🔌 Connected with socket id: {socket.id || "…" }
      </div>
    </div>
  );
}

export default App;
