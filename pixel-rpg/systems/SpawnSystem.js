// maps.json 의 spawns 항목 하나당 Spawner 하나. 정해진 수를 유지하고, 처치되면 respawn 초 후 재등장.
SR.Spawner = class Spawner {
  constructor(scene, entry) {
    const T = SR.Data.config.tileSize;
    this.scene = scene;
    this.entry = entry;
    this.def = SR.Data.monsters[entry.monster];
    this.cx = entry.x * T; this.cy = entry.y * T;
    this.radius = (entry.radius || 1) * T;
    this.timers = [];
    for (let i = 0; i < entry.count; i++) this.spawn();
    this.ready = true;
  }

  spawn() {
    const world = this.scene.world;
    const p = world.randomPointNear(this.cx, this.cy, this.radius, 14);
    const m = new SR.Monster(this.scene, this.entry.monster, this, p.x, p.y);
    m.home = { x: this.cx, y: this.cy };
    this.scene.monsters.push(m);
    if (m.elite && this.ready) SR.log(`정예 몬스터 [${m.name}]이(가) 나타났습니다!`, '#ffcf4a');
    return m;
  }

  onKilled() {
    this.timers.push(this.def.respawn);
  }

  update(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      this.timers[i] -= dt;
      if (this.timers[i] <= 0) { this.timers.splice(i, 1); this.spawn(); }
    }
  }
};
