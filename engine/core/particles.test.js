import { describe, it, expect } from 'vitest';
import { createBurst, updateParticles } from './particles.js';

const OPTIONS = { count: 10, life: 0.5, speedMin: 40, speedMax: 120 };

function fixedRandom(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe('createBurst', () => {
  it('spawns `count` particles at the given origin', () => {
    const particles = createBurst(100, 200, OPTIONS);
    expect(particles).toHaveLength(OPTIONS.count);
    for (const particle of particles) {
      expect(particle.x).toBe(100);
      expect(particle.y).toBe(200);
      expect(particle.life).toBe(OPTIONS.life);
      expect(particle.maxLife).toBe(OPTIONS.life);
    }
  });

  it('derives velocity from the injected random source deterministically', () => {
    // angle=0 -> straight along +x; speed at random()=0 is speedMin
    const particles = createBurst(0, 0, OPTIONS, fixedRandom([0, 0]));
    expect(particles[0].vx).toBeCloseTo(OPTIONS.speedMin);
    expect(particles[0].vy).toBeCloseTo(0);
  });

  it('respects a different count/life/speed configuration', () => {
    const particles = createBurst(0, 0, { count: 3, life: 0.3, speedMin: 60, speedMax: 160 }, fixedRandom([0]));
    expect(particles).toHaveLength(3);
    expect(particles[0].life).toBe(0.3);
    expect(particles[0].vx).toBeCloseTo(60);
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
