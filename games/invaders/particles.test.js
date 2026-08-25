import { describe, it, expect } from 'vitest';
import {
  createExplosion,
  updateParticles,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  PARTICLE_SPEED_MIN,
} from './particles.js';

function fixedRandom(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe('createExplosion', () => {
  it('spawns PARTICLE_COUNT particles at the given origin', () => {
    const particles = createExplosion(100, 200);
    expect(particles).toHaveLength(PARTICLE_COUNT);
    for (const particle of particles) {
      expect(particle.x).toBe(100);
      expect(particle.y).toBe(200);
      expect(particle.life).toBe(PARTICLE_LIFE);
      expect(particle.maxLife).toBe(PARTICLE_LIFE);
    }
  });

  it('derives velocity from the injected random source deterministically', () => {
    // angle=0 -> straight along +x; speed at random()=0 is PARTICLE_SPEED_MIN
    const particles = createExplosion(0, 0, fixedRandom([0, 0]));
    expect(particles[0].vx).toBeCloseTo(PARTICLE_SPEED_MIN);
    expect(particles[0].vy).toBeCloseTo(0);
  });
});

describe('updateParticles', () => {
  it('advances position by velocity * dt', () => {
    const particles = [{ x: 0, y: 0, vx: 10, vy: -20, life: 0.5, maxLife: 0.5 }];
    const result = updateParticles(particles, 0.1);
    expect(result[0].x).toBeCloseTo(1);
    expect(result[0].y).toBeCloseTo(-2);
  });

  it('decrements life by dt', () => {
    const particles = [{ x: 0, y: 0, vx: 0, vy: 0, life: 0.5, maxLife: 0.5 }];
    const result = updateParticles(particles, 0.2);
    expect(result[0].life).toBeCloseTo(0.3);
  });

  it('removes particles whose life has expired', () => {
    const particles = [{ x: 0, y: 0, vx: 0, vy: 0, life: 0.1, maxLife: 0.5 }];
    const result = updateParticles(particles, 0.2);
    expect(result).toHaveLength(0);
  });

  it('keeps particles that still have life remaining', () => {
    const particles = [{ x: 0, y: 0, vx: 0, vy: 0, life: 0.3, maxLife: 0.5 }];
    const result = updateParticles(particles, 0.2);
    expect(result).toHaveLength(1);
  });
});
