export const PARTICLE_COUNT = 16;
export const PARTICLE_LIFE = 0.5;
export const PARTICLE_SPEED_MIN = 40;
export const PARTICLE_SPEED_MAX = 120;

export function createExplosion(x, y, random = Math.random) {
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const angle = random() * Math.PI * 2;
    const speed = PARTICLE_SPEED_MIN + random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE,
      maxLife: PARTICLE_LIFE,
    });
  }
  return particles;
}

export function updateParticles(particles, dt) {
  const survivors = [];
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    if (particle.life > 0) survivors.push(particle);
  }
  return survivors;
}
