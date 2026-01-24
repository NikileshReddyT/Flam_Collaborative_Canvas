export default class DrawingState {
  constructor() {
    this.operations = [];
    this.users = new Map();
    this.maxOperations = 10000;
  }

  addOperation(operation) {
    this.operations.push(operation);
    
    if (this.operations.length > this.maxOperations) {
      const removed = this.operations.splice(0, 100);
      console.log(`Pruned ${removed.length} old operations`);
    }
  }

  addOperationBatch(operations) {
    operations.forEach(op => this.addOperation(op));
  }

  findOperation(operationId) {
    return this.operations.find(op => op.id === operationId);
  }

  getOperations() {
    return this.operations;
  }

  getActiveOperations() {
    return this.operations.filter(op => !op.undone);
  }

  getUndoneOperations() {
    return this.operations.filter(op => op.undone);
  }

  undoLastOperation(userId) {
    for (let i = this.operations.length - 1; i >= 0; i--) {
      if (!this.operations[i].undone && this.operations[i].userId === userId) {
        this.operations[i].undone = true;
        return this.operations[i];
      }
    }
    return null;
  }

  redoLastOperation(userId) {
    for (let i = this.operations.length - 1; i >= 0; i--) {
      if (this.operations[i].undone && this.operations[i].userId === userId) {
        this.operations[i].undone = false;
        return this.operations[i];
      }
    }
    return null;
  }

  undoLastGlobalOperation() {
    for (let i = this.operations.length - 1; i >= 0; i--) {
      if (!this.operations[i].undone) {
        this.operations[i].undone = true;
        return this.operations[i];
      }
    }
    return null;
  }

  redoLastGlobalOperation() {
    for (let i = this.operations.length - 1; i >= 0; i--) {
      if (this.operations[i].undone) {
        this.operations[i].undone = false;
        return this.operations[i];
      }
    }
    return null;
  }

  clearOperations() {
    this.operations = [];
  }

  clearUserOperations(userId) {
    const initialCount = this.operations.length;
    this.operations = this.operations.filter(op => op.userId !== userId);
    console.log(`Cleared ${initialCount - this.operations.length} operations for user ${userId}`);
  }

  addUser(socketId, userData = {}) {
    this.users.set(socketId, {
      socketId,
      userId: userData.userId || '',
      userName: userData.userName || 'Anonymous',
      color: userData.color || '#000000',
      connectedAt: Date.now()
    });
  }

  updateUser(socketId, userData) {
    if (this.users.has(socketId)) {
      this.users.set(socketId, {
        ...this.users.get(socketId),
        ...userData
      });
    }
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  removeUser(socketId) {
    this.users.delete(socketId);
  }

  getUsers() {
    return Array.from(this.users.values());
  }

  getUserCount() {
    return this.users.size;
  }

  replaceOperations(operations) {
    this.operations = operations;
  }

  getStats() {
    return {
      totalOperations: this.operations.length,
      activeOperations: this.getActiveOperations().length,
      undoneOperations: this.getUndoneOperations().length,
      userCount: this.users.size
    };
  }

  exportState() {
    return {
      operations: this.operations,
      users: Array.from(this.users.values()),
      exportedAt: Date.now()
    };
  }

  importState(state) {
    if (state.operations) {
      this.operations = state.operations;
    }
    if (state.users) {
      this.users = new Map();
      state.users.forEach(user => {
        this.users.set(user.socketId, user);
      });
    }
  }
}
