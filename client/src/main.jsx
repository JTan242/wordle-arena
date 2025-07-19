import React from "react";
import socket from "./api/socket";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
socket.connect();
createRoot(document.getElementById("root")).render(<App />);
