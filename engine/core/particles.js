export function createBurst(x, y, { count, life, speedMin, speedMax }, random = Math.random) {
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const speed = speedMin + random() * (speedMax - speedMin);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
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
