export function expectedScore(rA: number, rB: number) {
return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}
export function kFactor(r: number, g = 0) {
if (r >= 2400) return 16;
return g < 30 ? 32 : 24;
}
export function eloDelta(r: number, opp: number, outcome: 0 | 1, games = 0) {
const K = kFactor(r, games);
const exp = expectedScore(r, opp);
return K * (outcome - exp);
}