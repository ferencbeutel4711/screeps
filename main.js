const BuilderObserver = require("./BuilderObserver").BuilderObserver;
const RepairerObserver = require("./RepairerObserver").RepairerObserver;
const DelivererObserver = require("./DelivererObserver").DelivererObserver;
const HarvestObserver = require("./HarvestObserver").HarvestObserver;
const WorkObserver = require("./WorkObserver").WorkObserver;
const TowerObserver = require("./TowerObserver").TowerObserver;
const ScoutingObserver = require("./ScoutingObserver").ScoutingObserver;

const CpuProfiler = require('./CpuProfiler').CpuProfiler;

const ExtendedCreep = require("./ExtendedCreep").ExtendedCreep;
const ExtendedTower = require("./ExtendedTower").ExtendedTower;

function handleCreepDeath(creepId, ctx) {
    delete Memory.creeps[creepId];
    console.log(`RIP ${creepId}`);
    Object.values(ctx.observers).forEach((observer) => {
        observer.handleCreepDeath(creepId);
    });
}

function housekeeping(rooms) {
    const removedEntities = {
        creeps: [],
        rooms: []
    };

    if (Memory.creeps) {
        Object.keys(Memory.creeps)
            .filter((creepName) => !Game.creeps[creepName])
            .forEach((creepName) => {
                delete Memory.creeps[creepName];
                removedEntities.creeps.push(creepName);
            });
    }

    const roomNames = rooms.map((room) => room.name);
    if (Memory.rooms) {
        Object.keys(Memory.rooms)
            .filter((key) => !roomNames.includes(key))
            .forEach((roomName) => {
                delete Memory.rooms[roomName.id];
                removedEntities.rooms.push(roomName);
            });
    }

    return removedEntities;
}

function bodyPartsForEnergy(energy) {
    const bodyParts = [WORK, CARRY, MOVE];
    let localE = energy - 200;

    while (localE > 0) {
        if (localE === 100) {
            bodyParts.push(CARRY);
            bodyParts.push(MOVE);
            localE -= 100;
        }
        if (localE >= 100) {
            bodyParts.push(WORK);
            localE -= 100;
        }
        if (localE >= 50) {
            bodyParts.push(CARRY);
            localE -= 50;
        }
        if (localE >= 50) {
            bodyParts.push(MOVE);
            localE -= 50;
        }
    }

    return bodyParts;
}

function appropriateEnergyUsage(creeps, maxEnergy) {
    if (creeps.length === 0) {
        return 300;
    }

    return Math.min(1000, maxEnergy);

    return maxEnergy;
}

function initGlobalMemory() {
    Memory.scoutingObserver = Memory.scoutingObserver || {};
}

function initMemoryForRoom(room) {
    if (!Memory.rooms) {
        Memory.rooms = {};
    }

    const roomMemEntry = Memory.rooms[room.name];
    if (!roomMemEntry) {
        Memory.rooms[room.name] = {};
    }

    roomMemEntry.builderObserver = roomMemEntry.builderObserver || {};
    roomMemEntry.delivererObserver = roomMemEntry.delivererObserver || {};
    roomMemEntry.harvestObserver = roomMemEntry.harvestObserver || {};
    roomMemEntry.repairerObserver = roomMemEntry.repairerObserver || {};
    roomMemEntry.workObserver = roomMemEntry.workObserver || {};
    roomMemEntry.timer = roomMemEntry.timer || {};
}

function spawnCreep(extendedCreeps, spawn, room, ctx) {
    const builderCreeps = 3;
    const repairCreeps = 3;
    const deliveryCreeps = 8;
    const scoutCount = Object.keys(Game.flags).length;

    if (extendedCreeps.filter((extendedCreep) => extendedCreep.role === ExtendedCreep.ROLE_DELIVERER).length < deliveryCreeps) {
        spawn.createCreep(bodyPartsForEnergy(appropriateEnergyUsage(extendedCreeps, room.energyCapacityAvailable)), {
            role: ExtendedCreep.ROLE_DELIVERER,
            home: room.name
        });
    } else if (extendedCreeps.filter((extendedCreep) => extendedCreep.role === ExtendedCreep.ROLE_REPAIRER).length < repairCreeps) {
        spawn.createCreep(bodyPartsForEnergy(appropriateEnergyUsage(extendedCreeps, room.energyCapacityAvailable)), {
            role: ExtendedCreep.ROLE_REPAIRER,
            home: room.name
        });
    } else if (extendedCreeps.filter((extendedCreep) => extendedCreep.role === ExtendedCreep.ROLE_BUILDER).length < builderCreeps) {
        spawn.createCreep(bodyPartsForEnergy(appropriateEnergyUsage(extendedCreeps, room.energyCapacityAvailable)), {
            role: ExtendedCreep.ROLE_BUILDER,
            home: room.name
        });
    } else if (Object.keys(ctx.observers.scoutingObserver.assignments).length < scoutCount) {
         spawn.createCreep([MOVE], {
             role: '',
             home: room.name,
             mode: ExtendedCreep.MODE_SCOUT
         });
    }
}

module.exports.loop = () => {
    // global config
    const isDebug = false;
    const myRooms = Object.values(Game.rooms);
    const globalProfiler = new CpuProfiler({name: 'Global'}, isDebug);
    initGlobalMemory();

    const contexts = {};

    const removedEntities = housekeeping(myRooms);
    globalProfiler.addUsage('housekeeping');

    const scoutingObserver = new ScoutingObserver();
    globalProfiler.addUsage('scoutingObserver init');

    // init contexts
    myRooms.forEach((room) => {
        const cpuProfiler = new CpuProfiler(room, isDebug);

        initMemoryForRoom(room);
        const builderObserver = new BuilderObserver(room);
        cpuProfiler.addUsage('builderObserver init');
        const delivererObserver = new DelivererObserver(room);
        cpuProfiler.addUsage('delivererObserver init');
        const harvestObserver = new HarvestObserver(room, myRooms);
        cpuProfiler.addUsage('harvestObserver init');
        const repairerObserver = new RepairerObserver(room);
        cpuProfiler.addUsage('repairerObserver init');
        const workObserver = new WorkObserver(room);
        cpuProfiler.addUsage('workObserver init');
        const towerObserver = new TowerObserver(room);
        cpuProfiler.addUsage('towerObserver init');

        contexts[room.name] = {
            observers: {
                builderObserver,
                delivererObserver,
                harvestObserver,
                repairerObserver,
                workObserver,
                towerObserver,
                scoutingObserver
            },
            cpuProfiler
        };
    });

    globalProfiler.addUsage('observer init');

    myRooms.forEach((room) => {
        Object.values(contexts[room.name].observers).forEach((observer) => observer.postConstruct(contexts));
    });

    globalProfiler.addUsage('observer postConstruct');

    myRooms.forEach((room) => {
        const ctx = contexts[room.name];

        removedEntities.creeps.forEach((removedCreep) => handleCreepDeath(removedCreep, contexts[room.name]));
        ctx.cpuProfiler.addUsage('creep deaths');
        const creeps = Object.values(room.find(FIND_MY_CREEPS));

        const extendedCreeps = creeps.map((creep) => new ExtendedCreep(creep, ctx));
        const towers = Object.values(room.find(FIND_MY_STRUCTURES)).filter((structure) => structure.structureType === STRUCTURE_TOWER);
        const extendedTowers = towers.map((tower) => new ExtendedTower(room, tower, ctx));
        const spawn = Object.values(room.find(FIND_MY_SPAWNS))[0];
        ctx.cpuProfiler.addUsage('extension creation');

        if (spawn) {
            spawnCreep(extendedCreeps, spawn, room, ctx);
            ctx.cpuProfiler.addUsage('spawning logic');
        }

        extendedTowers.forEach((extendedTower) => extendedTower.run());
        ctx.cpuProfiler.addUsage('tower logic');

        extendedCreeps.forEach((extendedCreep) => extendedCreep.run());
        ctx.cpuProfiler.addUsage('creep logic');

        Object.values(ctx.observers).forEach((observer) => observer.syncToMemory());
        ctx.cpuProfiler.addUsage('memory sync');

        ctx.cpuProfiler.logUsage();
    });

    globalProfiler.addUsage('game logic');
    globalProfiler.logUsage();
};
