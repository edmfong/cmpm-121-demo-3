// Memento interface for caches
export interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

// Cache class implementing Memento pattern
export class Cache implements Momento<string> {
  i: number;
  j: number;
  coins: Array<{ serial: number; i: number; j: number }>;

  constructor(
    i: number,
    j: number,
    coins: Array<{ serial: number; i: number; j: number }> = [],
  ) {
    this.i = i;
    this.j = j;
    this.coins = coins;
  }

  // Create a memento representing the cache state
  toMomento(): string {
    return JSON.stringify({
      i: this.i,
      j: this.j,
      coins: this.coins,
    });
  }

  // Restore the cache state from a memento
  fromMomento(momento: string) {
    const state = JSON.parse(momento);
    this.i = state.i;
    this.j = state.j;
    this.coins = state.coins;
  }
}
