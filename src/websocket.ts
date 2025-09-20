import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { MessageType } from "./types/websocket";
import { IPlayer, Player } from "./models/Player";
import { Game } from "./models/Game";
import { v4 as uuidv4 } from "uuid";
import { createBoardSlots, createDeck } from "./utils/board";
import { Card } from "./types";

// Utility function to arrange players in RGB order
function arrangePlayersInRGBOrder(players: any[]): any[] {
  // Group players by team
  const teamGroups: { [key: string]: any[] } = {
    red: [],
    green: [],
    blue: [],
  };

  // Separate players with teams and without teams
  const playersWithoutTeam: any[] = [];

  players.forEach((player) => {
    if (player.team && teamGroups[player.team]) {
      teamGroups[player.team].push(player);
    } else {
      playersWithoutTeam.push(player);
    }
  });

  // Get available teams in RGB order
  const availableTeams = ["red", "green", "blue"].filter(
    (team) => teamGroups[team].length > 0
  );

  // If no teams are assigned, return original order
  if (availableTeams.length === 0) {
    return players;
  }

  // Arrange players in RGB order
  const arrangedPlayers: any[] = [];
  let maxPlayersInAnyTeam = Math.max(
    ...availableTeams.map((team) => teamGroups[team].length)
  );

  // Round-robin through teams in RGB order
  for (let i = 0; i < maxPlayersInAnyTeam; i++) {
    availableTeams.forEach((team) => {
      if (teamGroups[team][i]) {
        arrangedPlayers.push(teamGroups[team][i]);
      }
    });
  }

  // Add players without teams at the end
  arrangedPlayers.push(...playersWithoutTeam);

  return arrangedPlayers;
}

// Helper function to update database with RGB-ordered players
async function updateGamePlayersInRGBOrder(gameId: string): Promise<void> {
  try {
    const game = await Game.findById(gameId).populate("players");
    if (!game) {
      console.log("Game not found for RGB ordering update");
      return;
    }

    const allPlayers = game.players.map((player) => ({
      _id: player._id,
      id: player._id,
      name: player.name,
      role: player.role,
      team: player.team,
    }));

    // Arrange players in RGB order
    const arrangedPlayers = arrangePlayersInRGBOrder(allPlayers);

    // Update the game's players array with the RGB-ordered player IDs
    const orderedPlayerIds = arrangedPlayers.map((player) => player._id);
    game.players = orderedPlayerIds;

    await game.save();
    console.log("Updated game players in RGB order:", orderedPlayerIds);
  } catch (error) {
    console.error("Error updating game players in RGB order:", error);
  }
}

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
        } else if (messageData.type === MessageType.GAME_MOVE) {
          gameMove(data.gameId, data.playerId, data.slotId, ws, wss);
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

    // Update database with RGB-ordered players
    await updateGamePlayersInRGBOrder(gameId);

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

    // Get the updated game with populated players (now in RGB order)
    const updatedGame = await Game.findById(gameId).populate("players");
    console.log("Game players:", updatedGame?.players);

    const allPlayers = updatedGame?.players.map((player) => ({
      id: player._id,
      name: player.name,
      role: player.role,
      team: player.team,
    }));

    console.log("All players (RGB ordered):", allPlayers);
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

    // Update database with RGB-ordered players
    await updateGamePlayersInRGBOrder(gameId);

    ws.send(
      JSON.stringify({
        type: MessageType.JOIN_TEAM_SUCCESS,
        payload: { gameId, playerId, team },
        timestamp: Date.now(),
      })
    );

    // Get the updated game with populated players (now in RGB order)
    const updatedGame = await Game.findById(gameId).populate("players");
    const allPlayers = updatedGame?.players.map((player) => ({
      id: player._id,
      name: player.name,
      role: player.role,
      team: player.team,
    }));

    console.log("All players (RGB ordered):", allPlayers);
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

    // Update database with RGB-ordered players
    await updateGamePlayersInRGBOrder(gameId);

    ws.send(
      JSON.stringify({
        type: MessageType.LEAVE_TEAM_SUCCESS,
        payload: { gameId, playerId },
        timestamp: Date.now(),
      })
    );

    // Get the updated game with populated players (now in RGB order)
    const updatedGame = await Game.findById(gameId).populate("players");
    const allPlayers = updatedGame?.players.map((player) => ({
      id: player._id,
      name: player.name,
      role: player.role,
      team: player.team,
    }));

    console.log("All players (RGB ordered):", allPlayers);
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
  // Update database with RGB-ordered players first
  await updateGamePlayersInRGBOrder(gameId);

  const updatedGame = await Game.findById(gameId).populate("players");
  console.log("Game players:", updatedGame?.players);

  const allPlayers = updatedGame?.players.map((player) => ({
    id: player._id,
    name: player.name,
    role: player.role,
    team: player.team,
  }));

  console.log("All players (RGB ordered):", allPlayers);
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
  const deck = createDeck();
  const playerCards: Card[][] = [];

  for (const player of game.players) {
    const playerHand: { rank: string; suit: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const randomIndex = Math.floor(Math.random() * deck.length);
      const card = deck[randomIndex];
      playerHand.push(card);
      deck.splice(randomIndex, 1);
    }
    playerCards.push(playerHand);
  }
  game.status = "in-progress";
  game.gameData = {
    deck: deck,
    board: createBoardSlots(),
    score: {},
  };

  // Update database with RGB-ordered players before starting game
  await updateGamePlayersInRGBOrder(gameId);

  const populatedGame = await Game.findById(gameId).populate("players");
  const allPlayers = populatedGame?.players.map(
    (player: IPlayer, index: number) => ({
      id: player._id,
      name: player.name,
      role: player.role,
      team: player.team,
      cards: playerCards[index],
    })
  );

  // Save cards to each player document (players are now in RGB order)
  if (populatedGame && populatedGame.players) {
    for (let i = 0; i < populatedGame.players.length; i++) {
      populatedGame.players[i].cards = playerCards[i];
      await populatedGame.players[i].save();
    }
  }

  game.gameData.currentTurn = (allPlayers?.[0]?.id as string) || "";

  await game.save();
  console.log("Game started:", game, allPlayers);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: MessageType.GAME_STARTED,
          payload: { game, players: allPlayers },
        })
      );
    }
  });
}

async function gameMove(
  gameId: string,
  playerId: string,
  slotId: string,
  ws: WebSocket,
  wss: WebSocketServer
) {
  const game = await Game.findById(gameId);
  if (!game) {
    console.log("Game not found");
    return;
  }

  const player = await Player.findById(playerId);
  if (!player) {
    console.log("Player not found");
    return;
  }
  const slot = game.gameData?.board?.find((slot) => slot.id === slotId);
  if (!slot) {
    console.log("Slot not found");
    return;
  }

  slot.isOccupied = true;
  slot.chipColor = player.team?.toLowerCase() as "red" | "blue" | "green";
  const [slotRank, slotSuit] = slot.cardImage.split("-");
  player.cards = player?.cards?.filter(
    (card) => !(card.rank === slotRank && card.suit === slotSuit)
  );

  const newCard = game.gameData?.deck?.pop();
  if (newCard) {
    player?.cards?.push(newCard);
  }

  game.markModified("gameData");
  player.markModified("cards");
  await game.save();
  await player.save();

  //give turn to next player
  const currentIndex = game.players.findIndex(
    (playerIdInArray) => playerIdInArray.toString() === playerId
  );
  const nextIndex = (currentIndex + 1) % game.players.length;
  game.gameData!.currentTurn = game.players[nextIndex].toString();

  game.markModified("gameData");
  await game.save();

  // Populate players to get their details
  const populatedGame = await Game.findById(gameId).populate("players");
  const allPlayers = populatedGame?.players.map((player) => ({
    id: player._id,
    name: player.name,
    role: player.role,
    team: player.team,
    cards: player.cards,
  }));

  console.log("Game moved:", game, allPlayers);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: MessageType.GAME_MOVE,
          payload: { game, players: allPlayers },
        })
      );
    }
  });
}
