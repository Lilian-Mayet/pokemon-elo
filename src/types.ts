export type Card = {
id: string;
name: string;
image: string;
set_name: string;
series: string;
artist: string | null;
elo: number;
games_played?: number;
wins?: number;
losses?: number;
elo_history?: { t: number; r: number }[];
};


export type PairResponse = { a: Card; b: Card };
export type DuelPayload = { winnerId: string; loserId: string };
export type DuelResponse = { a: Card; b: Card; delta: { winner: number; loser: number } };