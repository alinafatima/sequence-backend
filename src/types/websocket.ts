// WebSocket Message Protocol

export enum MessageType {
  // Client to Server
  JOIN_GAME = 'JOIN_GAME',
  LEAVE_GAME = 'LEAVE_GAME',
  START_GAME = 'START_GAME',
  PLAYER_READY = 'PLAYER_READY',
  GAME_MOVE = 'GAME_MOVE',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  PING = 'PING',
  JOIN_TEAM = 'JOIN_TEAM',
  LEAVE_TEAM = 'LEAVE_TEAM',

  // Server to Client
  JOIN_GAME_SUCCESS = 'JOIN_GAME_SUCCESS',
  JOIN_GAME_ERROR = 'JOIN_GAME_ERROR',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  GAME_STARTED = 'GAME_STARTED',
  GAME_UPDATE = 'GAME_UPDATE',
  CHAT_MESSAGE_RECEIVED = 'CHAT_MESSAGE_RECEIVED',
  PONG = 'PONG',
  ERROR = 'ERROR',
  TEAM_UPDATED = 'TEAM_UPDATED',
  JOIN_TEAM_SUCCESS = 'JOIN_TEAM_SUCCESS',
  LEAVE_TEAM_SUCCESS = 'LEAVE_TEAM_SUCCESS',

}

export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp?: number;
  messageId?: string;
}

// Specific message payloads
export interface JoinGamePayload {
  gameId: string;
  playerName: string;
}

export interface JoinGameSuccessPayload {
  gameId: string;
  playerId: string;
  players: Array<{
    id: string;
    name: string;
    isReady: boolean;
  }>;
}

export interface PlayerJoinedPayload {
  player: {
    id: string;
    name: string;
    isReady: boolean;
  };
}

export interface GameUpdatePayload {
  gameId: string;
  status: 'waiting' | 'in-progress' | 'completed';
  currentTurn?: string;
  board?: any;
  players: Array<{
    id: string;
    name: string;
    isReady: boolean;
    score?: number;
  }>;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: any;
}