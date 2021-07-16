import * as seedrandom from "seedrandom";

const rng = seedrandom("abc");

export function random(min = 0, max = 1) {
  return min + rng() * (max - min);
}
