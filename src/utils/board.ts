import { BOARD_DATA } from "../constants/board";
import { BoardSlot } from "../types";

export const createDeck = () => {
  const deck = [];
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [
    "ace",
    "king",
    "queen",
    "jack",
    "10",
    "9",
    "8",
    "7",
    "6",
    "5",
    "4",
    "3",
    "2",
  ];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return [...deck, ...deck];
};

export const generateCardList = () => {
  const suits = ["spades", "hearts", "diamonds", "clubs"];
  const ranks = [
    "ace",
    "king",
    "queen",
    "10",
    "9",
    "8",
    "7",
    "6",
    "5",
    "4",
    "3",
    "2",
  ];
  const cards: string[] = [];

  ranks.forEach((rank) => {
    suits.forEach((suit) => {
      cards.push(`${rank}-${suit}`);
    });
  });

  return cards;
};


export const createBoardSlots = (): BoardSlot[] => {
  const slots: BoardSlot[] = [];

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const slotId = `${row}-${col}`;
      const boardCell = BOARD_DATA[row][col];

      const isCorner = boardCell?.isCorner || false;

      let cardImage = "back"; // Default for corners
      if (boardCell && boardCell.rank && boardCell.suit) {
        cardImage = `${boardCell.rank}-${boardCell.suit}`;
      }

      const slot: BoardSlot = {
        id: slotId,
        row,
        col,
        cardType: isCorner ? "corner" : "regular",
        cardImage,
        isOccupied: false,
      };

      slots.push(slot);
    }
  }

  return slots;
};
