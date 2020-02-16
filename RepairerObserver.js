function RepairerObserver(room) {
    this.room = room;
    this.creeps = Object.values(room.find(FIND_MY_CREEPS));
    this.damagedStructures = Object.values(room.find(FIND_STRUCTURES)).filter((structure) => structure.hits < structure.hitsMax);
    this.assignments = Memory.rooms[this.room.name].repairerObserver.assignments || {};
}

RepairerObserver.prototype.postConstruct = function (contexts) {
};

RepairerObserver.prototype.distancesToStructures = function (creep) {
    return this.damagedStructures.reduce((acc, structure) => (acc[structure.id] = creep.pos.findPathTo(structure).length, acc), {});
};

RepairerObserver.prototype.stopRepair = function (extendedCreep) {
    Object.keys(this.assignments).forEach((targetId) =>
        this.assignments[targetId] = this.assignments[targetId].filter((assignedId) => assignedId !== extendedCreep.creep.name));
};

RepairerObserver.prototype.handleCreepDeath = function (creepId) {
    Object.keys(this.assignments).forEach((targetId) =>
        this.assignments[targetId] = this.assignments[targetId].filter((assignedId) => assignedId !== creepId));
};

RepairerObserver.prototype.getRepairTarget = function (extendedCreep) {
    const distancesForCreep = this.distancesToStructures(extendedCreep.creep);
    if (Object.keys(distancesForCreep).length === 0) {
        return null;
    }

    // TODO: maybe override if something needs URGENT repair
    const target = Object.keys(distancesForCreep).reduce((k, v) => distancesForCreep[v] < distancesForCreep[k] ? v : k);

    if (!this.assignments[target]) {
        this.assignments[target] = [];
    }
    this.assignments[target].push(extendedCreep.creep.name);

    return Game.getObjectById(target);
};

RepairerObserver.prototype.syncToMemory = function () {
    Memory.rooms[this.room.name].repairerObserver.assignments = this.assignments;
};

module.exports = {
    RepairerObserver
};
