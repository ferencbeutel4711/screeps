function TowerObserver(room) {
    this.room = room;
    this.towers = Object.values(room.find(FIND_MY_STRUCTURES)).filter((structure) => structure.structureType === STRUCTURE_TOWER);
    this.hostiles = Game.rooms[room.name].find(FIND_HOSTILE_CREEPS);
    this.distances = this.towers.reduce((acc, tower) => (acc[tower.id] = this.distancesToHostiles(tower), acc), {});
}

TowerObserver.prototype.postConstruct = function (contexts) {
};

TowerObserver.prototype.distancesToHostiles = function (tower) {
    return this.hostiles.reduce((acc, hostile) => (acc[hostile.id] = tower.pos.getRangeTo(hostile.pos.x, hostile.pos.y), acc), {});
};


TowerObserver.prototype.getTarget = function (tower) {
    if (this.hostiles.length > 0) {
        const username = this.hostiles[0].owner.username;
        Game.notify(`User ${username} spotted in room ${this.room.name}`);

        const distancesForTower = this.distances[tower.id];
        const closestTarget = this.hostiles.reduce((k, v) => distancesForTower[v] < distancesForTower[k] ? v : k);

        if (distancesForTower[closestTarget.id] <= 10) {
            return closestTarget;
        }
    }
};

TowerObserver.prototype.handleCreepDeath = function (creepId) {
};

TowerObserver.prototype.syncToMemory = function () {
    Memory.rooms[this.room.name].towerObserver = {};
};

module.exports = {
    TowerObserver
};
