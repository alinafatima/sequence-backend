export interface Player {
  id: string;
  name: string;
  role: 'host' | 'player';
  gameId: string;
}

export interface Game {
  id: string;
  link: string;
  players: Player[];
  host: Player;
  status: 'waiting' | 'in-progress' | 'completed';
  maxPlayers: number;
}
