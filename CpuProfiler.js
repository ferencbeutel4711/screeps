function CpuProfiler(room, isDebug) {
    this.room = room;
    this.isDebug = isDebug;
    this.usageSnapshots = [];
}

CpuProfiler.prototype.addUsage = function (logPrefix) {
    this.usageSnapshots.push({
        usage: Game.cpu.getUsed(),
        logPrefix
    });
};

CpuProfiler.prototype.logUsage = function () {
    const totalUsage = Game.cpu.getUsed();
    if (this.isDebug || totalUsage > 25) {
        console.log(`===============PROFILING ROOM ${this.room.name}===============`);
        this.usageSnapshots.reduce((us1, us2) => {
            console.log(`${us2.logPrefix}: ${us2.usage - us1.usage}`);
            return us2;
        }, {usage: 0});
        console.log("");
        console.log(`total usage: ${totalUsage}`);
    }
};

module.exports = {
    CpuProfiler
};
