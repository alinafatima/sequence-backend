# MongoDB Setup Instructions

## Option 1: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (free tier available)
4. Get your connection string
5. Set the environment variable:
   ```bash
   export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/sequence-game?retryWrites=true&w=majority"
   ```

## Option 2: Local MongoDB Installation

### Using Homebrew (if you have space):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

### Using MongoDB Compass (GUI):
1. Download from [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to your local MongoDB instance
3. Create a database called `sequence-game`

## Environment Variables

Create a `.env` file in the backend directory:
```
MONGODB_URI=mongodb://localhost:27017/sequence-game
PORT=3000
```

## Testing the Setup

1. Start the server:
   ```bash
   npm run dev
   ```

2. Test creating a game:
   ```bash
   curl -X POST http://localhost:3000/api/games/create \
     -H "Content-Type: application/json" \
     -d '{"hostName": "Test Host"}'
   ```

3. Check MongoDB Compass or Atlas to see the created data.
