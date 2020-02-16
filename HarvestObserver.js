function HarvestObserver(room) {
    this.room = room;
    this.creeps = Object.values(room.find(FIND_MY_CREEPS));
    this.sources = Object.values(room.find(FIND_SOURCES));
    this.sourceLimits = Memory.rooms[this.room.name].harvestObserver.sourceLimits || this.calculateSourceLimits();
}

HarvestObserver.prototype.postConstruct = function (contexts) {
    this.adjacentHarvestObservers = Object.values(contexts).map((context) => context.observers.harvestObserver)
        .filter((harvestObserver) => harvestObserver.room.name !== this.room.name)
        .filter((harvestObserver) => this.room.findExitTo(harvestObserver.room) > 0);
};

HarvestObserver.prototype.freeSources = function () {
    return this.sources
        .filter(source => source.energy > 0 || source.ticksToRegeneration <= 100)
        .filter((source) => this.sourceLimits[source.id].assigned < this.sourceLimits[source.id].limit);
};

HarvestObserver.prototype.limitForSource = function (source) {
    let limit = 0;

    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            if (this.room.getTerrain().get(source.pos.x + i, source.pos.y + j) !== TERRAIN_MASK_WALL) {
                limit++;
            }
        }
    }

    return limit;
};

HarvestObserver.prototype.calculateSourceLimits = function () {
    return this.sources.reduce((acc, source) => (acc[source.id] = {
        limit: this.limitForSource(source),
        assigned: []
    }, acc), {});
};

HarvestObserver.prototype.assignCreep = function (target, extendedCreep) {
    this.sourceLimits[target].assigned.push(extendedCreep.creep.name);
};

HarvestObserver.prototype.distancesToSources = function (creep) {
    return this.sources.reduce((acc, source) => (acc[source.id] = creep.pos.findPathTo(source).length, acc), {});
};

HarvestObserver.prototype.stopHarvest = function (extendedCreep) {
    const sourceLimit = this.sourceLimits[extendedCreep.currentTarget.id];
    if (sourceLimit) {
        sourceLimit.assigned = sourceLimit.assigned.filter((assignedId) => assignedId !== extendedCreep.creep.name);
    }
};

HarvestObserver.prototype.handleCreepDeath = function (creepId) {
    Object.keys(this.sourceLimits).forEach((sourceId) =>
        this.sourceLimits[sourceId].assigned = this.sourceLimits[sourceId].assigned.filter((assignedId) => assignedId !== creepId));
};


HarvestObserver.prototype.getHarvestTarget = function (extendedCreep) {
    // home observer -> no free source -> ask all other harvestObservers for sources -> find closest free source in room without controller control -> ask other observer to reserve slot -> set target to bespoke source
    const distancesForCreep = this.distancesToSources(extendedCreep.creep);
    if (Object.keys(distancesForCreep).length === 0) {
        return null;
    }

    const possibleSourceIds = Object.keys(distancesForCreep)
        .filter(sourceId => this.sourceLimits[sourceId].assigned.length < this.sourceLimits[sourceId].limit)
        // TODO: Calculate projected energy by amount of harvesters
        .filter(sourceId => Game.getObjectById(sourceId).energy > 0 || Game.getObjectById(sourceId).ticksToRegeneration <= 50);
    if (possibleSourceIds.length === 0) {
        const possibleHarvestObservers = this.adjacentHarvestObservers
            .filter((harvestObserver) => harvestObserver.room.controller.my !== true)
            .filter((harvestObserver) => harvestObserver.freeSources().length > 0);

        const possibleRemoteSources = [].concat.apply([], possibleHarvestObservers.map((harvestObserver) => harvestObserver.freeSources()));
        if (possibleRemoteSources.length > 0) {
            const remoteDistancesForCreep = possibleRemoteSources
                .reduce((acc, source) => (acc[source.id] = extendedCreep.creep.pos.findPathTo(source).length, acc), {});

            const target = possibleRemoteSources.reduce((s1, s2) => remoteDistancesForCreep[s1.id] < remoteDistancesForCreep[s2.id] ? s1 : s2);
            const targetHarvestObserver = possibleHarvestObservers.filter((harvestObserver) => harvestObserver.freeSources().map((s) => s.id).includes(target.id))[0];


            targetHarvestObserver.assignCreep(target.id, extendedCreep);

            return target;
        } else {
            return null;
        }
    }

    const target = possibleSourceIds.reduce((k, v) => distancesForCreep[v] < distancesForCreep[k] ? v : k);

    this.assignCreep(target, extendedCreep);

    return Game.getObjectById(target);
};

HarvestObserver.prototype.syncToMemory = function () {
    Memory.rooms[this.room.name].harvestObserver.sourceLimits = this.sourceLimits;
};

module.exports = {
    HarvestObserver
};
