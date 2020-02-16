function ExtendedCreep(creep, ctx) {
    this.creep = creep;

    this.home = creep.memory.home;
    if (!this.home) {
        this.creep.say('I have no home!');
    }
    this.role = creep.memory.role;
    if (!this.role) {
        this.creep.say('I have no role in life!');
    }
    this.currentTarget = this.determineCurrentTarget(creep);
    if (creep.memory.target && !this.currentTarget) {
        console.log('uh oh! target ' + creep.memory.target + ' cannot be found in the game anymore!');
    }
    this.mode = creep.memory.mode || ExtendedCreep.MODE_HARVEST;
    this.temporaryDeliverer = creep.memory.temporaryDeliverer || false;

    this.harvestObserver = ctx.observers.harvestObserver;
    this.workObserver = ctx.observers.workObserver;
    this.delivererObserver = ctx.observers.delivererObserver;
    this.builderObserver = ctx.observers.builderObserver;
    this.repairerObserver = ctx.observers.repairerObserver;
    this.scoutingObserver = ctx.observers.scoutingObserver;
}

ExtendedCreep.MODE_HARVEST = 'harvestMode';
ExtendedCreep.MODE_WORK = 'workMode';
ExtendedCreep.MODE_SCOUT = 'scoutMode';

ExtendedCreep.ROLE_DELIVERER = 'delivererRole';
ExtendedCreep.ROLE_BUILDER = 'builderRole';
ExtendedCreep.ROLE_REPAIRER = 'repairerRole';

ExtendedCreep.prototype.determineCurrentTarget = function (creep) {
    if (!creep.memory.target) {
        return null;
    }
    const byId = Game.getObjectById(creep.memory.target);
    if (byId) {
        return byId;
    }
    const byFlagName = Game.flags[creep.memory.target];
    if (byFlagName) {
        return byFlagName;
    }
    return null;
};

ExtendedCreep.prototype.scout = function () {
    if (!this.currentTarget) {
        this.currentTarget = this.scoutingObserver.getTarget(this);
    }
    if (!this.currentTarget || this.creep.pos.x === this.currentTarget.pos.x && this.creep.pos.y === this.currentTarget.y && (!this.currentTarget.room || this.creep.room.name === this.currentTarget.room.name)) {
        return;
    }
    this.creep.moveTo(this.currentTarget);
};

ExtendedCreep.prototype.harvest = function () {
    if (!this.currentTarget) {
        this.currentTarget = this.harvestObserver.getHarvestTarget(this);
    }
    if (!this.currentTarget) {
        this.creep.say('I want to harvest but got no target! :(');
        return;
    }

    const harvestResult = this.creep.harvest(this.currentTarget);
    if (harvestResult === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(this.currentTarget);
    } else if (harvestResult === ERR_NOT_ENOUGH_RESOURCES) {
        this.stop(this.mode);
        this.currentTarget = null;
    }
};

ExtendedCreep.prototype.repair = function () {
    if (!this.currentTarget) {
        this.currentTarget = this.repairerObserver.getRepairTarget(this);
    }
    if (!this.currentTarget) {
        this.creep.say('I want to repair but got no target! :(');
        this.temporaryDeliverer = true;
        return;
    }

    if (this.currentTarget.hits === this.currentTarget.hitsMax) {
        this.creep.say('This was already repaired.');
        this.currentTarget = null;
        return;
    }

    const repairResult = this.creep.repair(this.currentTarget);
    if (repairResult === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(this.currentTarget);
    }
};

ExtendedCreep.prototype.build = function () {
    if (!this.currentTarget) {
        this.currentTarget = this.builderObserver.getBuildingTarget(this);
    }
    if (!this.currentTarget) {
        this.creep.say('I want to build but got no target! :(');
        this.temporaryDeliverer = true;
        return;
    }

    const buildResult = this.creep.build(this.currentTarget);
    if (buildResult === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(this.currentTarget);
    } else if (buildResult === ERR_INVALID_TARGET) {
        this.creep.say('invalid target to build! probably already a structure');
        this.stop(this.mode);
    }
};

ExtendedCreep.prototype.deliver = function () {
    if (!this.currentTarget) {
        this.currentTarget = this.delivererObserver.getDeliveryTarget(this);
    }
    if (!this.currentTarget) {
        this.creep.say('I want to deliver but got no target! :(');
        this.temporaryDeliverer = false;
        return;
    }
    if (this.currentTarget.x) {
        // got pos, move directly
        this.creep.moveTo(this.currentTarget);
        return;
    }

    const transferResult = this.creep.transfer(this.currentTarget, RESOURCE_ENERGY);
    if (transferResult === ERR_NOT_IN_RANGE) {
        const moveResult = this.creep.moveTo(this.currentTarget);
        if (moveResult === ERR_INVALID_TARGET) {
            this.stop(this.mode);
        }
    } else if (transferResult === ERR_FULL) {
        this.creep.say('Delivery Target is full');
        this.stop(this.mode);
        this.currentTarget = null;
    }
};

ExtendedCreep.prototype.stop = function (mode) {
    switch (mode) {
        case ExtendedCreep.MODE_HARVEST:
            this.harvestObserver.stopHarvest(this);
            break;
        case ExtendedCreep.MODE_WORK:
            if (this.temporaryDeliverer) {
                this.delivererObserver.stopDelivery(this);
            } else {
                switch (this.role) {
                    case ExtendedCreep.ROLE_DELIVERER:
                        this.delivererObserver.stopDelivery(this);
                        break;
                    case ExtendedCreep.ROLE_BUILDER:
                        this.builderObserver.stopBuilding(this);
                        break;
                    case ExtendedCreep.ROLE_REPAIRER:
                        this.repairerObserver.stopRepair(this);
                        break;
                    default:
                        this.creep.say('cannot stop; unknown role: ' + this.role);
                }
            }
            break;
        default:
            this.creep.say("cannot stop; unknown mode: " + this.mode);
    }
};

ExtendedCreep.prototype.work = function () {
    if (this.temporaryDeliverer) {
        this.deliver();
        return;
    }
    const actualRole = this.workObserver.getRole(this);
    if (actualRole !== this.role) {
        switch (this.role) {
            case ExtendedCreep.ROLE_DELIVERER:
                this.delivererObserver.stopDelivery(this);
                break;
            case ExtendedCreep.ROLE_BUILDER:
                this.builderObserver.stopBuilding(this);
                break;
            case ExtendedCreep.ROLE_REPAIRER:
                this.repairerObserver.stopRepair(this);
                break;
            default:
                this.creep.say('my current role is unknown..');
        }

        this.currentTarget = null;
    }
    switch (actualRole) {
        case ExtendedCreep.ROLE_DELIVERER:
            this.deliver();
            break;
        case ExtendedCreep.ROLE_BUILDER:
            this.build();
            break;
        case ExtendedCreep.ROLE_REPAIRER:
            this.repair();
            break;
        default:
            this.creep.say('I want to work but there is nothing to do :(');
    }
};

ExtendedCreep.prototype.determineMode = function () {
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
        this.mode = ExtendedCreep.MODE_HARVEST;
        this.temporaryDeliverer = false;
    } else if (this.creep.store[RESOURCE_ENERGY] === this.creep.store.getCapacity(RESOURCE_ENERGY)) {
        this.mode = ExtendedCreep.MODE_WORK;
    }
};

ExtendedCreep.prototype.syncMemory = function () {
    this.creep.memory.target = this.currentTarget ? this.currentTarget.id ? this.currentTarget.id : this.currentTarget.name ? this.currentTarget.name : null : null;
    this.creep.memory.role = this.role;
    this.creep.memory.mode = this.mode;
    this.creep.memory.temporaryDeliverer = this.temporaryDeliverer;
};

ExtendedCreep.prototype.run = function () {
    if (this.mode === ExtendedCreep.MODE_SCOUT) {
        this.scout();
        this.syncMemory();
        return;
    }
    const oldMode = this.mode;
    this.determineMode();
    if (oldMode !== this.mode) {
        this.stop(oldMode);
        this.currentTarget = null;
    }
    try {
        switch (this.mode) {
            case ExtendedCreep.MODE_HARVEST:
                this.harvest();
                break;
            case ExtendedCreep.MODE_WORK:
                this.work();
                break;
            default:
                this.creep.say(`I am confused! Unknown work mode: ${this.mode}`);
        }
    } finally {
        this.syncMemory();
    }
};

module.exports = {
    ExtendedCreep
};
