# Game Schema Design - Future-Proof Architecture

## Overview
The game schema is designed to be highly flexible and extensible, allowing you to add new features and requirements without breaking existing data or requiring complex migrations.

## Current Schema Structure

### Game Model
```typescript
{
  id: string;                    // Auto-generated unique ID
  link: string;                  // Game lobby URL
  players: IPlayer[];            // Array of player references
  host: IPlayer;                 // Host player reference
  status: 'waiting' | 'in-progress' | 'completed';
  maxPlayers: number;            // 2-8 players
  gameSettings: {                // 🔥 FLEXIBLE: Add any game settings
    difficulty?: 'easy' | 'medium' | 'hard';
    timeLimit?: number;
    customRules?: string;
    [key: string]: any;          // Allows unlimited custom settings
  };
  gameData: {                    // 🔥 FLEXIBLE: Add any game state data
    board?: any;                 // Game board state
    currentTurn?: string;        // Current player's turn
    score?: { [playerId: string]: number };
    [key: string]: any;          // Allows unlimited custom data
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Player Model
```typescript
{
  id: string;                    // Auto-generated unique ID
  name: string;                  // Player display name
  role: 'host' | 'player';       // Player role
  gameId: string;                // Reference to parent game
  createdAt: Date;
  updatedAt: Date;
}
```

## Future Extensibility Examples

### 1. Adding New Game Settings
```typescript
// You can add new settings without schema changes:
gameSettings: {
  difficulty: 'hard',
  timeLimit: 600,
  customRules: 'No wild cards',
  // NEW: Add any new settings
  maxRounds: 10,
  allowSpectators: true,
  privateGame: false,
  customTheme: 'dark'
}
```

### 2. Adding Game State Data
```typescript
// You can add new game data without schema changes:
gameData: {
  board: { /* current board state */ },
  currentTurn: 'player123',
  score: { 'player123': 5, 'player456': 3 },
  // NEW: Add any new game state
  currentRound: 3,
  lastMove: { player: 'player123', action: 'place_card' },
  gameHistory: [/* array of moves */],
  powerUps: { 'player123': ['double_points'] }
}
```

### 3. Adding New Player Fields
```typescript
// To add new player fields, you can:
// Option 1: Use a flexible playerData field
playerData: {
  avatar: 'avatar1.png',
  level: 5,
  achievements: ['first_win'],
  preferences: { theme: 'dark' }
}

// Option 2: Add specific fields to the schema (requires migration)
```

## Migration Strategy

### For New Fields (Recommended)
1. **Add to `gameSettings` or `gameData`** - No migration needed
2. **Use default values** for existing games
3. **Gradually populate** new fields as games are updated

### For Schema Changes
1. **Add new fields as optional** initially
2. **Use database migrations** for required fields
3. **Backward compatibility** maintained

## API Usage Examples

### Creating a Game with Custom Settings
```bash
POST /api/games/create
{
  "hostName": "Alice",
  "maxPlayers": 6,
  "gameSettings": {
    "difficulty": "hard",
    "timeLimit": 600,
    "customRules": "No wild cards allowed",
    "maxRounds": 10
  }
}
```

### Updating Game State
```bash
PUT /api/games/{gameId}
{
  "status": "in-progress",
  "gameData": {
    "board": { /* new board state */ },
    "currentTurn": "player123",
    "currentRound": 2
  }
}
```

## Benefits of This Design

1. **No Breaking Changes**: Existing games continue to work
2. **Easy Feature Addition**: Add new features without code changes
3. **Flexible Data Storage**: Store any game-related data
4. **Future-Proof**: Accommodates unknown future requirements
5. **Performance**: Indexed fields for fast queries
6. **Type Safety**: TypeScript interfaces for development

## Database Indexes
- `link` - Fast game lookup
- `status` - Filter games by status
- `host` - Find games by host
- `createdAt` - Sort by creation time

This design ensures your game can evolve with new requirements while maintaining data integrity and performance.
