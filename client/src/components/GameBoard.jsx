import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import socket from "../api/socket";

const maxAttempts = 6;
const wordLength = 5;

const colors = {
  green: "bg-green-500 text-white border-green-700",
  yellow: "bg-yellow-400 text-white border-yellow-600",
  gray: "bg-gray-300 text-gray-900 border-gray-400",
};

// format milliseconds into MM:SS
function formatMillis(ms) {
  if (ms == null) return "--:--";
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function GameBoard() {
  const { roomCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  // Retrieve username and game settings
  const { username: stateUsername, startTime } = state || {};
  const getStoredUsername = () =>
    localStorage.getItem("wordle-arena-username") || "";
  const username = stateUsername || getStoredUsername();

  // Game mechanics and UI feedback
  const [guesses, setGuesses] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [outOfGuesses, setOutOfGuesses] = useState(false);
  const [message, setMessage] = useState("");
  const [notAWord, setNotAWord] = useState(false);
  const [timer, setTimer] = useState(0);
  const [status, setStatus] = useState({});
  const [finalStatus, setFinalStatus] = useState(null);
  const [reviewPlayer, setReviewPlayer] = useState(null);
  const [solutionWord, setSolutionWord] = useState("");
  const [returned, setReturned] = useState(false);
  const handleReturnToLobby = () => {
    navigate(`/lobby/${roomCode}`, { state: { username } });
  };


  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setTimer(Date.now() - startTime);
    }, 200);
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    function handleGameResult({
      correct,
      guess,
      feedback,
      notAWord,
      solution,
    }) {
      if (notAWord) {
        setMessage("Not a valid word.");
        setNotAWord(true);
        return;
      }
      setNotAWord(false);
      setGuesses((prev) => [...prev, guess]);
      setFeedbacks((prev) => [...prev, feedback]);
      if (correct) {
        setMessage(`Correct!`);
        setGameOver(true);
        setOutOfGuesses(false);
      } else if (guesses.length + 1 >= maxAttempts) {
        setMessage("Game Over. Out of attempts!");
        setGameOver(true);
        setOutOfGuesses(true);
      } else {
        setMessage("");
        setOutOfGuesses(false);
      }
      setCurrentGuess("");
    }

    function handleStatusUpdate({ status }) {
      setStatus(status || {});
    }

    function handleGameOver({ status, word }) {
      setGameOver(true);
      setFinalStatus(status);
      setSolutionWord(word);
      setReviewPlayer(null);
    }

    function handleReturnedToMenu() {
      setReturned(true);
      navigate(`/lobby/${roomCode}`, { state: { username } });
    }

    socket.on("game-result", handleGameResult);
    socket.on("status-update", handleStatusUpdate);
    socket.on("game-over", handleGameOver);
    socket.on("returned-to-menu", handleReturnedToMenu);

    return () => {
      socket.off("game-result", handleGameResult);
      socket.off("status-update", handleStatusUpdate);
      socket.off("game-over", handleGameOver);
      socket.off("returned-to-menu", handleReturnedToMenu);
    };
  }, [roomCode, username, startTime, navigate, guesses.length]);

  const handleInput = (e) => {
    if (
      e.target.value.length <= wordLength &&
      /^[a-zA-Z]*$/.test(e.target.value)
    ) {
      setCurrentGuess(e.target.value.toUpperCase());
    }
  };

  const handleSubmitGuess = () => {
    if (currentGuess.length !== wordLength) {
      setMessage(`Guess must be ${wordLength} letters.`);
      return;
    }
    socket.emit("submit-guess", { roomCode, guess: currentGuess });
  };

  const handleBackToMenu = () => {
    socket.emit("return-to-menu", { roomCode });
    setReturned(true);
  };

  const playerList = Object.values(finalStatus || status || {}).sort((a, b) => {
    if (a.username === username) return -1;
    if (b.username === username) return 1;
    return a.username.localeCompare(b.username);
  });

  function renderScoreboard() {
    return (
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6 min-w-[350px]">
        <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
        <div className="mb-2">
          Word was: <span className="font-mono text-xl">{solutionWord}</span>
        </div>
        <div className="mb-2 font-bold">Final Times:</div>
        <ul className="mb-4">
          {playerList.map((p) => (
            <li
              key={p.username}
              className={`cursor-pointer hover:underline ${reviewPlayer === p.username ? "font-bold text-blue-700" : ""}`}
              onClick={() => setReviewPlayer(p.username)}
            >
              {p.username}:{" "}
              {p.finishedTime != null ? formatMillis(p.finishedTime) : "--:--"}
              {p.guesses &&
              p.guesses.length > 0 &&
              p.guesses[p.guesses.length - 1].feedback.every(
                (f) => f === "green",
              )
                ? "Finished"
                : ""}
            </li>
          ))}
        </ul>
        {reviewPlayer && renderPlayerGuesses(reviewPlayer)}
        <button
          className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 shadow"
          onClick={handleBackToMenu}
          disabled={returned}
        >
          Back to Menu
        </button>
      </div>
    );
  }

  function renderPlayerGuesses(playerName) {
    const player = playerList.find((p) => p.username === playerName);
    if (!player) return null;
    return (
      <div className="p-4 border rounded bg-gray-50 mb-2">
        <div className="font-semibold mb-2">{playerName}'s Guesses:</div>
        {(player.guesses || []).map((g, idx) => (
          <div key={idx} className="flex gap-1 mb-1">
            {g.guess.split("").map((ch, i) => (
              <div
                key={i}
                className={`w-8 h-8 flex items-center justify-center font-mono text-lg rounded border ${colors[g.feedback[i]] || colors.gray}`}
              >
                {ch}
              </div>
            ))}
          </div>
        ))}
        <button
          className="mt-2 underline text-blue-600"
          onClick={() => setReviewPlayer(null)}
        >
          Back to scoreboard
        </button>
      </div>
    );
  }

  if (gameOver && finalStatus) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        {renderScoreboard()}
      </div>
    );
  }

  return (
    <>
      {/* Scoreboard */}
      <div className="absolute top-2 right-4 w-96">
        <div className="bg-white border p-2 rounded shadow">
          <h3 className="font-bold mb-1 text-center">Players</h3>
          <ul>
            {playerList.map((p) => (
              <li
                key={p.username}
                className={`flex justify-between items-center mb-1 p-1 ${p.username === username ? "bg-blue-100 font-bold" : ""}`}
              >
                <span>{p.username}</span>
                <span>
                  Guess {p.guesses.length}/{maxAttempts} &nbsp;|&nbsp;
                  <span className="text-green-600">{p.greens}🟩</span> &nbsp;
                  <span className="text-yellow-600">{p.yellows}🟨</span>
                  {p.finished && p.finishedTime && (
                    <span className="ml-2 text-xs text-gray-500">
                      Done: {formatMillis(p.finishedTime)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main content */}
      <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-4">
        <h1 className="text-3xl font-bold mb-4">Wordle Arena</h1>
        <div className="text-lg mb-2">
          <strong>Room:</strong> <span className="font-mono">{roomCode}</span>
        </div>
        <div className="text-lg mb-6">
          <strong>Player:</strong> {username}
        </div>
        <div className="grid gap-2 mb-4">
          {[...Array(maxAttempts)].map((_, rowIdx) => {
            let letters = [];
            let cellColors = [];
            if (rowIdx < guesses.length) {
              letters = guesses[rowIdx].split("");
              cellColors = feedbacks[rowIdx] || Array(wordLength).fill("gray");
            } else if (rowIdx === guesses.length && !gameOver) {
              letters = currentGuess.split("");
              cellColors = Array(wordLength).fill("gray");
            } else {
              letters = [];
              cellColors = Array(wordLength).fill("gray");
            }
            return (
              <div key={rowIdx} className="flex gap-1 justify-center">
                {Array.from({ length: wordLength }).map((_, colIdx) => (
                  <div
                    key={colIdx}
                    className={`w-12 h-12 border-2 flex items-center justify-center font-mono font-extrabold text-2xl rounded ${cellColors[colIdx] ? colors[cellColors[colIdx]] : colors.gray}`}
                    style={{ transition: "background 0.3s, color 0.3s" }}
                  >
                    {letters[colIdx] || ""}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {!gameOver ? (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={currentGuess}
              onChange={handleInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitGuess();
              }}
              className="border rounded p-2 w-48 text-center uppercase font-mono tracking-widest"
              placeholder="ENTER GUESS"
              maxLength={wordLength}
              disabled={
                gameOver || guesses.length >= maxAttempts || outOfGuesses
              }
              autoFocus
            />
            <button
              onClick={handleSubmitGuess}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 border-2 border-blue-900"
              disabled={
                gameOver || guesses.length >= maxAttempts || outOfGuesses
              }
            >
              Submit
            </button>
          </div>
        ) : (
          <div className="text-xl font-semibold mt-3">{message}</div>
        )}

        {outOfGuesses && (
          <div className="mt-3 text-red-700 font-bold">
            Out of guesses! Wait for others to finish.
          </div>
        )}
        {message && !gameOver && (
          <div className="mt-3 text-red-500">{message}</div>
        )}
        {notAWord && <div className="mt-3 text-red-600">Not a valid word.</div>}

        {/* Always visible Return to Lobby button */}
        <button
          className="mt-4 px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-600"
          onClick={handleReturnToLobby}
        >
          Return to Lobby
        </button>
      </div>
    </>
  );
}