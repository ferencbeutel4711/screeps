function ScoutingObserver() {
    this.flags = Game.flags;
    this.assignments = Memory.scoutingObserver.assignments || {};
}

ScoutingObserver.prototype.postConstruct = function (contexts) {
};

ScoutingObserver.prototype.handleCreepDeath = function (creepId) {
    this.assignments = Object.keys(this.assignments)
        .filter((assignmentKey) => this.assignments[assignmentKey] !== creepId)
        .reduce((acc, flagId) => (acc[flagId] = this.assignments[flagId], acc), {});
};

ScoutingObserver.prototype.distancesToFlags = function (creep) {
    return Object.values(this.flags).reduce((acc, flag) => (acc[flag.name] = creep.pos.findPathTo(flag).length, acc), {});
};

ScoutingObserver.prototype.getTarget = function (extendedCreep) {
    const distancesForCreep = this.distancesToFlags(extendedCreep.creep);
    if (Object.keys(distancesForCreep).length === 0) {
        return null;
    }
    
    const potentialTargets = Object.keys(distancesForCreep)
        .filter((flagId) => !this.assignments[flagId]);
        
    if(potentialTargets.length === 0) {
        return null;
    }

    const target = potentialTargets.length === 1 ? potentialTargets[0] : 
    potentialTargets.reduce((k, v) => distancesForCreep[v] < distancesForCreep[k] ? v : k);
    
    if (!target) {
        return null;
    }

    this.assignments[target] = extendedCreep.creep.name;

    return this.flags[target];
};

ScoutingObserver.prototype.syncToMemory = function () {
    Memory.scoutingObserver.assignments = this.assignments;
};

module.exports = {
    ScoutingObserver
};
