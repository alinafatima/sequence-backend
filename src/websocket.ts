import ws, { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { MessageType } from "./types/websocket";
import { Player } from "./models/Player";
import { Game } from "./models/Game";
import { v4 as uuidv4 } from "uuid";

export function createWebSocketServer(server: Server): WebSocketServer {
  // Create WebSocket server
  const wss = new WebSocketServer({ server });

  // WebSocket connection handling
  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection established");

    ws.on("message", (message: Buffer) => {
      console.log("Received message:", message.toString());
      try {
        const messageData: any = JSON.parse(message.toString());
        const data = messageData.data;
        console.log("Received message:", data);
        if (messageData.type === MessageType.JOIN_GAME) {
          addPlayerToGame(data.gameId, data.name, ws, wss);
        } else if (messageData.type === MessageType.JOIN_TEAM) {
          joinTeam(data.gameId, data.playerId, data.team, ws, wss);
        } else if (messageData.type === MessageType.LEAVE_TEAM) {
          leaveTeam(data.gameId, data.playerId, ws, wss);
        } else if (messageData.type === MessageType.TEAM_UPDATE) {
          sendTeamUpdate(data.gameId, wss);
        } else if (messageData.type === MessageType.START_GAME) {
          startGame(data.gameId, wss);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
        ws.send(
          JSON.stringify({
            type: MessageType.ERROR,
            payload: {
              code: "INVALID_JSON",
              message: "Invalid message format",
            },
            timestamp: Date.now(),
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });

    ws.on("error", (error: Error) => {
      console.error("WebSocket error:", error);
    });
  });

  return wss;
}

async function addPlayerToGame(
  gameId: string,
  playerName: string,
  ws: WebSocket,
  wss: WebSocketServer
) {
  try {
    // Find the game
    const game = await Game.findById(gameId);
    if (!game) {
      ws.send(
        JSON.stringify({
          type: MessageType.ERROR,
          payload: {
            code: "GAME_NOT_FOUND",
            message: "Game not found",
          },
          timestamp: Date.now(),
        })
      );
      return;
    }

    // Check if game is full
    if (game.players.length >= game.maxPlayers) {
      ws.send(
        JSON.stringify({
          type: MessageType.ERROR,
          payload: {
            code: "GAME_FULL",
            message: "Game is full",
          },
          timestamp: Date.now(),
        })
      );
      return;
    }

    // Create new player
    const newPlayer = new Player({
      id: uuidv4(),
      name: playerName,
      role: "player",
      gameId,
      team: null,
    });

    // Save player to database
    const savedPlayer = await newPlayer.save();
    console.log("New player added to database:", savedPlayer);

    // Add player to game's players array
    game.players.push(savedPlayer);
    await game.save();

    console.log("Player added to game:", gameId);

    // Send success response
    ws.send(
      JSON.stringify({
        type: MessageType.JOIN_GAME_SUCCESS,
        payload: {
          gameId,
          player: {
            id: savedPlayer.id,
            name: savedPlayer.name,
            role: savedPlayer.role,
            team: savedPlayer.team,
          },
        },
        timestamp: Date.now(),
      })
    );

    // Get the updated game with populated players
    const updatedGame = await Game.findById(gameId).populate("players");
    console.log("Game players:", updatedGame?.players);

    const allPlayers = updatedGame?.players.map((player) => ({
      id: player._id,
      name: player.name,
      role: player.role,
      team: player.team,
    }));

    console.log("All players:", allPlayers);
    // Broadcast to all clients in this game
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: MessageType.PLAYER_JOINED,
            payload: {
              gameId: gameId,
              players: allPlayers,
              newPlayer: {
                id: savedPlayer._id,
                name: savedPlayer.name,
                role: savedPlayer.role,
                team: savedPlayer.team,
              },
            },
            timestamp: Date.now(),
          })
        );
      }
    });
  } catch (error) {
    console.error("Error adding player to game:", error);
    ws.send(
      JSON.stringify({
        type: MessageType.ERROR,
        payload: {
          code: "DATABASE_ERROR",
          message: "Failed to add player to game",
        },
        timestamp: Date.now(),
      })
    );
  }
}

async function joinTeam(
  gameId: string,
  playerId: string,
  team: string,
  ws: WebSocket,
  wss: WebSocketServer
) {
  try {
    const game = await Game.findById(gameId);
    if (!game) {
      console.log("Game not found");
      ws.send(
        JSON.stringify({
          type: MessageType.ERROR,
          payload: { code: "GAME_NOT_FOUND", message: "Game not found" },
          timestamp: Date.now(),
        })
      );
      return;
    }

    const player = await Player.findById(playerId);
    if (!player) {
      console.log("Player not found");
      ws.send(
        JSON.stringify({
          type: MessageType.ERROR,
          payload: { code: "PLAYER_NOT_FOUND", message: "Player not found" },
          timestamp: Date.now(),
        })
      );
      return;
    }

    player.team = team.toLowerCase() as "red" | "blue" | "green";
    await player.save();

    console.log("Joining team:", gameId, playerId, team);

    ws.send(
      JSON.stringify({
        type: MessageType.JOIN_TEAM_SUCCESS,
        payload: { gameId, playerId, team },
        timestamp: Date.now(),
      })
    );
    const updatedGame = await Game.findById(gameId).populate("players");
    const allPlayers = updatedGame?.players.map((player) => ({
      id: player._id,
      name: player.name,
      role: player.role,
      team: player.team,
    }));
    console.log("All players:", allPlayers);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: MessageType.TEAM_UPDATED,
            payload: { gameId, players: allPlayers },
          })
        );
      }
    });
  } catch (error) {
    console.error("Error joining team:", error);
    ws.send(
      JSON.stringify({
        type: MessageType.ERROR,
        payload: { code: "DATABASE_ERROR", message: "Failed to join team" },
        timestamp: Date.now(),
      })
    );
  }
}

async function leaveTeam(
  gameId: string,
  playerId: string,
  ws: WebSocket,
  wss: WebSocketServer
) {
  try {
    const game = await Game.findById(gameId);
    if (!game) {
      console.log("Game not found");
      ws.send(
        JSON.stringify({
          type: MessageType.ERROR,
          payload: { code: "GAME_NOT_FOUND", message: "Game not found" },
          timestamp: Date.now(),
        })
      );
      return;
    }

    const player = await Player.findById(playerId);
    if (!player) {
      console.log("Player not found");
      ws.send(
        JSON.stringify({
          type: MessageType.ERROR,
          payload: { code: "PLAYER_NOT_FOUND", message: "Player not found" },
          timestamp: Date.now(),
        })
      );
      return;
    }

    player.team = null;
    await player.save();

    console.log("Leaving team:", gameId, playerId);

    ws.send(
      JSON.stringify({
        type: MessageType.LEAVE_TEAM_SUCCESS,
        payload: { gameId, playerId },
        timestamp: Date.now(),
      })
    );
    const updatedGame = await Game.findById(gameId).populate("players");
    const allPlayers = updatedGame?.players.map((player) => ({
      id: player._id,
      name: player.name,
      role: player.role,
      team: player.team,
    }));
    console.log("All players:", allPlayers);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: MessageType.TEAM_UPDATED,
            payload: { gameId, players: allPlayers },
          })
        );
      }
    });
  } catch (error) {
    console.error("Error leaving team:", error);
    ws.send(
      JSON.stringify({
        type: MessageType.ERROR,
        payload: { code: "DATABASE_ERROR", message: "Failed to leave team" },
        timestamp: Date.now(),
      })
    );
  }
}

async function sendTeamUpdate(gameId: string, wss: WebSocketServer) {
  const updatedGame = await Game.findById(gameId).populate("players");
  console.log("Game players:", updatedGame?.players);

  const allPlayers = updatedGame?.players.map((player) => ({
    id: player._id,
    name: player.name,
    role: player.role,
    team: player.team,
  }));

  console.log("All players:", allPlayers);
  // Broadcast to all clients in this game
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: MessageType.TEAM_UPDATE,
          payload: {
            gameId: gameId,
            players: allPlayers,
          },
          timestamp: Date.now(),
        })
      );
    }
  });
}

async function startGame(gameId: string, wss: WebSocketServer) {
  const game = await Game.findById(gameId);
  if (!game) {
    console.log("Game not found");
    return;
  }
  game.status = "in-progress";
  await game.save();
  console.log("Game started:", gameId);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: MessageType.GAME_STARTED, payload: game }));
    }
  });
}
