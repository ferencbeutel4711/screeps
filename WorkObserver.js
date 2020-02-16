function WorkObserver(room) {
    this.room = room;
    this.creeps = Object.values(room.find(FIND_MY_CREEPS));
}

WorkObserver.prototype.postConstruct = function (contexts) {
};

WorkObserver.prototype.getRole = function (extendedCreep) {
    // TODO: Clever heuristic in case of emergency;
    // TODO: Builder and Repairer could swap for example if high demand
    return extendedCreep.role;
};

WorkObserver.prototype.handleCreepDeath = function (creepId) {
};

WorkObserver.prototype.syncToMemory = function () {
    Memory.rooms[this.room.name].workObserver = {};
};

module.exports = {
    WorkObserver
};
