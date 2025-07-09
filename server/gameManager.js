// server/gameManager.js
const rooms = {}; // { roomCode: { players: [{ id, name }], hostId } }

function createOrGetRoom(code, socket) {
  if (!rooms[code]) {
    rooms[code] = { players: [], hostId: socket.id };
  }
  return rooms[code];
}

function addPlayerToRoom(code, socket, username) {
  const room = createOrGetRoom(code, socket);
  // Prevent duplicates
  if (!room.players.find(p => p.id === socket.id)) {
    room.players.push({ id: socket.id, name: username });
  }
  return room;
}

function getPlayerNames(room) {
  return room.players.map(p => p.name);
}

module.exports = { rooms, addPlayerToRoom, getPlayerNames };
