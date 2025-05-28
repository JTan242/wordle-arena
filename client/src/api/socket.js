// src/api/socket.js
import { io } from "socket.io-client";

// Replace with your backend URL (dev: http://localhost:4000)
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:4000";

// Create a singleton socket instance
const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export default socket;
