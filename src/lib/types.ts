export interface Champion {
  id: number;
  name: string;
}

export interface Player {
  summoner: string;
  updatedAt?: string;
  avatar: string | null;
  tag: string | null;
  championsById: Map<number, boolean>;
  rankClass: string | null;
}

export interface ChampionEntry {
  id: number;
  name: string;
  done: boolean;
}

interface PlayerDocument {
  summoner: string;
  updatedAt?: string;
  avatar?: string | null;
  tag?: string | null;
  champions: ChampionEntry[];
}

export interface Kda {
  kills: number;
  deaths: number;
  assists: number;
}

export interface Win {
  matchId?: string;
  summoner: string;
  championId: number;
  gameEnd: number;
  kda?: Kda;
  items?: number[];
}

export interface LiveWinMessage {
  type: "win";
  win: Win;
  champion: Champion;
}
