// gameManager.js
const rooms = {};

function createOrGetRoom(code, socket) {
  if (!rooms[code]) {
    rooms[code] = {
      players: [],
      hostId: socket.id,
      gameWord: null,
      timed: false,
      startTime: null,
    };
  }
  return rooms[code];
}

function addPlayerToRoom(code, socket, username) {
  const room = createOrGetRoom(code, socket);
  // Add if not already present
  if (!room.players.find((p) => p.id === socket.id)) {
    room.players.push({ id: socket.id, name: username });
  }
  return room;
}

function getPlayerNames(room) {
  return room.players.map((p) => p.name);
}

function setGameWord(code, word) {
  if (rooms[code]) rooms[code].gameWord = word;
}

module.exports = {
  rooms,
  createOrGetRoom,
  addPlayerToRoom,
  getPlayerNames,
  setGameWord,
};
