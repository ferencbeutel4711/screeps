function BuilderObserver(room) {
    this.room = room;
    this.creeps = Object.values(room.find(FIND_MY_CREEPS));
    this.constructionSites = Object.values(room.find(FIND_MY_CONSTRUCTION_SITES));
    this.assignments = Memory.rooms[this.room.name].builderObserver.assignments || {};
}

BuilderObserver.prototype.postConstruct = function (contexts) {
};

BuilderObserver.prototype.distancesToConstructionSites = function (creep) {
    return this.constructionSites.reduce((acc, constructionSite) => (acc[constructionSite.id] = creep.pos.findPathTo(constructionSite).length, acc), {});
};

BuilderObserver.prototype.stopBuilding = function (extendedCreep) {
    Object.keys(this.assignments).forEach((targetId) =>
        this.assignments[targetId] = this.assignments[targetId].filter((assignedId) => assignedId !== extendedCreep.creep.name));
};

BuilderObserver.prototype.handleCreepDeath = function (creepId) {
    Object.keys(this.assignments).forEach((targetId) =>
        this.assignments[targetId] = this.assignments[targetId].filter((assignedId) => assignedId !== creepId));
};

BuilderObserver.prototype.getBuildingTarget = function (extendedCreep) {
    const distancesForCreep = this.distancesToConstructionSites(extendedCreep.creep);
    if (Object.keys(distancesForCreep).length === 0) {
        return null;
    }

    const target = Object.keys(distancesForCreep).reduce((k, v) => distancesForCreep[v] < distancesForCreep[k] ? v : k);

    if (!this.assignments[target]) {
        this.assignments[target] = [];
    }
    this.assignments[target].push(extendedCreep.creep.name);

    return Game.getObjectById(target);
};

BuilderObserver.prototype.syncToMemory = function () {
    Memory.rooms[this.room.name].builderObserver.assignments = this.assignments;
};

module.exports = {
    BuilderObserver
};
