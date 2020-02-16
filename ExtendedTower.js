function ExtendedTower(room, tower, ctx) {
    this.room = room;
    this.tower = tower;
    this.towerObserver = ctx.observers.towerObserver;
    this.delivererObserver = ctx.observers.delivererObserver;
}

ExtendedTower.prototype.run = function () {
    if (this.tower.store[RESOURCE_ENERGY] < 100) {
        this.delivererObserver.declareEmergency(this.tower);
    } else {
        this.delivererObserver.revokeEmergency(this.tower);
    }
    // TODO: if energy is low, declare emergency
    const target = this.towerObserver.getTarget(this.tower);
    if (target) {
        this.tower.attack(target);
    }
};

module.exports = {
    ExtendedTower
};
