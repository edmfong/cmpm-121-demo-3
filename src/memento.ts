// memento.ts

// Import Cell type from board.ts
import { Cell } from "./board.ts";

// Coin interface
export interface Coin {
  readonly cell: Cell;
  readonly serialNumber: number;
}

// Memento interface
export interface Memento {
  toMemento(): string;
  fromMemento(memento: string): void;
}

// Cache interface
export interface Cache extends Memento {
  coins: Coin[];
}

// Cache implementation
export function createCache(_cell: Cell, coins: Coin[]): Cache {
  return {
    coins,
    toMemento() {
      return JSON.stringify(this.coins);
    },
    fromMemento(memento: string) {
      this.coins = JSON.parse(memento);
    },
  };
}
