export interface Card {
  rank: string;
  suit: string;
}
export interface BoardSlot {
  id: string;
  row: number;
  col: number;
  cardType: "corner" | "regular";
  cardImage: string;
  isOccupied: boolean;
}
export interface Player {
  id: string;
  name: string;
  role: 'host' | 'player';
  gameId: string;
  cards: {rank: string, suit: string}[];
}

export interface Game {
  id: string;
  link: string;
  players: Player[];
  host: Player;
  status: 'waiting' | 'in-progress' | 'completed';
  maxPlayers: number;
  gameData: {
    deck: {rank: string, suit: string}[];
    board: BoardSlot[];
    currentTurn: string;
    score: { [playerId: string]: number };
  };
}
