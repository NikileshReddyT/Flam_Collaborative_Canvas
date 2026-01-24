export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Map(),
        operations: [],
        createdAt: Date.now()
      });
    }
    return this.rooms.get(roomId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || this.createRoom(roomId);
  }

  addUserToRoom(roomId, socketId, userData) {
    const room = this.getRoom(roomId);
    room.users.set(socketId, {
      ...userData,
      socketId,
      joinedAt: Date.now()
    });
    return room;
  }

  removeUserFromRoom(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(socketId);
      
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getUserFromRoom(roomId, socketId) {
    const room = this.rooms.get(roomId);
    return room ? room.users.get(socketId) : null;
  }

  getUsersInRoom(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  addOperationToRoom(roomId, operation) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.operations.push(operation);
    }
  }

  getRoomOperations(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.operations : [];
  }

  findOperationInRoom(roomId, operationId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    return room.operations.find(op => op.id === operationId);
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }

  getRoomCount() {
    return this.rooms.size;
  }

  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  getDefaultRoom() {
    return this.getRoom('default');
  }
}

export default new RoomManager();
