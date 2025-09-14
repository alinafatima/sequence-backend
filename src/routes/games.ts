import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Game } from '../models/Game.js';
import { Player } from '../models/Player.js';

const gamesRouter = Router();

// POST /create - Create a new game
gamesRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const { hostName, maxPlayers = 4, gameSettings = {} } = req.body;

    if (!hostName) {
      return res.status(400).json({ message: 'Host name is required' });
    }

    const gameId = uuidv4();
    const gameLink = `http://localhost:5173/lobby/${gameId}`;

    // Create host player
    const hostPlayer = new Player({
      name: hostName,
      role: 'host',
      gameId,
    });

    // Save host player to database
    const savedHostPlayer = await hostPlayer.save();

    // Create new game with flexible schema
    const newGame = new Game({
      link: gameLink,
      players: [savedHostPlayer._id],
      host: savedHostPlayer._id,
      status: 'waiting',
      maxPlayers: Math.min(Math.max(maxPlayers, 2), 8), // Ensure between 2-8 players
      gameSettings: {
        difficulty: 'medium',
        timeLimit: 300, // 5 minutes default
        ...gameSettings // Allow custom settings to override defaults
      },
      gameData: {
        // Initialize empty game data structure
        board: null,
        currentTurn: null,
        score: {}
      }
    });

    // Save game to database
    const savedGame = await newGame.save();

    // Populate the game with player details
    const populatedGame = await Game.findById(savedGame._id)
      .populate('players')
      .populate('host')
      .exec();

    console.log(`🎮 New game created: ${gameId} with host: ${hostName}`);

    return res.status(201).json({
      success: true,
      message: 'Game created successfully',
      game: populatedGame
    });

  } catch (error) {
    console.error('Error creating game:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /:gameId - Get game details
gamesRouter.get('/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    
    // Find game by link (since we're using the gameId in the URL path)
    const game = await Game.findOne({ link: { $regex: gameId } })
      .populate('players')
      .populate('host')
      .exec();

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    return res.status(200).json({
      success: true,
      game
    });

  } catch (error) {
    console.error('Error fetching game:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /:gameId - Update game (for future extensibility)
gamesRouter.put('/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const updates = req.body;

    // Find game by link
    const game = await Game.findOne({ link: { $regex: gameId } });

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Update the game with new data
    Object.assign(game, updates);
    const updatedGame = await game.save();

    // Populate and return updated game
    const populatedGame = await Game.findById(updatedGame._id)
      .populate('players')
      .populate('host')
      .exec();

    return res.status(200).json({
      success: true,
      message: 'Game updated successfully',
      game: populatedGame
    });

  } catch (error) {
    console.error('Error updating game:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export { gamesRouter };
