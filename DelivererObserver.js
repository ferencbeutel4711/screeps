function DelivererObserver(room) {
    this.room = room;
    this.creeps = Object.values(room.find(FIND_MY_CREEPS));
    this.spawns = Object.values(room.find(FIND_MY_SPAWNS));
    this.extensions = Object.values(room.find(FIND_MY_STRUCTURES)).filter((structure) => structure.structureType === STRUCTURE_EXTENSION);
    this.towers = Object.values(room.find(FIND_MY_STRUCTURES)).filter((structure) => structure.structureType === STRUCTURE_TOWER);
    this.controller = room.controller;
    this.assignments = Memory.rooms[this.room.name].delivererObserver.assignments || {};
    this.emergencies = (Memory.rooms[this.room.name].delivererObserver.emergencies || []).map((structureId) => Game.getObjectById(structureId));
}

DelivererObserver.prototype.postConstruct = function (contexts) {
    this.projectedEnergyLevels = this.calculateProjectedEnergyLevels();
};

DelivererObserver.prototype.assignedEnergyFor = function (structure) {
    const assignmentsForStructure = this.assignments[structure.id];
    if (!assignmentsForStructure) {
        return 0;
    }
    return assignmentsForStructure
        .map((assignment) => {
            const loadedAssignment = Game.creeps[assignment];
            return loadedAssignment ? loadedAssignment.store[RESOURCE_ENERGY] : 0
        })
        .reduce((p, c) => p + c, 0)
};

DelivererObserver.prototype.calculateProjectedEnergyLevels = function () {
    return {
        spawns: this.spawns.reduce((acc, spawn) => (acc[spawn.id] = spawn.store[RESOURCE_ENERGY] + this.assignedEnergyFor(spawn), acc), {}),
        extensions: this.extensions.reduce((acc, extension) => (acc[extension.id] = extension.store[RESOURCE_ENERGY] + this.assignedEnergyFor(extension), acc), {}),
        towers: this.towers.reduce((acc, tower) => (acc[tower.id] = tower.store[RESOURCE_ENERGY] + this.assignedEnergyFor(tower), acc), {})
    };
};

DelivererObserver.prototype.declareEmergency = function (structure) {
    if (!this.emergencies.includes(structure)) {
        this.emergencies.push(structure);
    }
};

DelivererObserver.prototype.revokeEmergency = function (structure) {
    this.emergencies = this.emergencies.filter((emergency) => emergency.id !== structure.id);
};

DelivererObserver.prototype.distancesTo = function (creep, structures) {
    return structures.reduce((acc, targetId) => (acc[targetId.id] = creep.pos.findPathTo(targetId).length, acc), {});
};

DelivererObserver.prototype.stopDelivery = function (extendedCreep) {
    Object.keys(this.assignments).forEach((targetId) =>
        this.assignments[targetId] = this.assignments[targetId].filter((assignedId) => assignedId !== extendedCreep.creep.name));
};

DelivererObserver.prototype.handleCreepDeath = function (creepId) {
    Object.keys(this.assignments).forEach((targetId) =>
        this.assignments[targetId] = this.assignments[targetId].filter((assignedId) => assignedId !== creepId));
};

DelivererObserver.prototype.getDeliveryTarget = function (extendedCreep) {
    if (extendedCreep.home && extendedCreep.home !== this.room.name) {
        // go back home first
        return extendedCreep.creep.pos.findClosestByRange(extendedCreep.creep.room.findExitTo(extendedCreep.home));
    }
    // fill spawn -> tower -> extensions -> controller
    let target;
    const distancesForCreep = this.distancesTo(extendedCreep.creep, this.spawns.concat(this.extensions).concat(this.towers).concat(this.emergencies));
    if (Object.keys(distancesForCreep).length === 0) {
        return null;
    }

    if (this.emergencies.length > 0) {
        target = this.emergencies.reduce((p, c) => distancesForCreep[p.id] < distancesForCreep[c.id] ? p : c).id;
    }

    const potentialExtensions = this.extensions.filter((extension) => this.projectedEnergyLevels.extensions[extension.id] < 50);
    if (potentialExtensions.length !== 0) {
        target = potentialExtensions.reduce((p, c) => distancesForCreep[p.id] < distancesForCreep[c.id] ? p : c).id;
    }

    if (!target) {
        const potentialSpawns = this.spawns.filter((spawn) => this.projectedEnergyLevels.spawns[spawn.id] < 300);
        if (potentialSpawns.length !== 0) {
            target = potentialSpawns.reduce((p, c) => distancesForCreep[p.id] < distancesForCreep[c.id] ? p : c).id;
        }
    }

    if (!target) {
        const potentialTowers = this.towers.filter((tower) => this.projectedEnergyLevels.towers[tower.id] < 1000);
        if (potentialTowers.length !== 0) {
            target = potentialTowers.reduce((p, c) => distancesForCreep[p.id] < distancesForCreep[c.id] ? p : c).id;
        }
    }

    if (!target) {
        target = this.controller.id;
    }

    if (!this.assignments[target]) {
        this.assignments[target] = [];
    }

    this.assignments[target].push(extendedCreep.creep.name);

    return Game.getObjectById(target);
};

DelivererObserver.prototype.syncToMemory = function () {
    Memory.rooms[this.room.name].delivererObserver.assignments = this.assignments;
    Memory.rooms[this.room.name].delivererObserver.emergencies = this.emergencies.map((emergency) => emergency.id);
};

module.exports = {
    DelivererObserver
};
