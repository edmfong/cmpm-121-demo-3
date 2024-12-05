// Import necessary modules
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board, Cell } from "./board.ts";
import { Cache, Coin, createCache } from "./memento.ts";

// Gameplay parameters
const OAKES_CLASSROOM = leaflet.latLng(36.9895, -122.0628);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Board instance
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

// Map creation
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Background tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("You are here!");
playerMarker.addTo(map);

// Inventory UI
const inventory = document.querySelector<HTMLDivElement>(
  "#inventory",
)!;
inventory.innerHTML = "<h3>Inventory</h3>";

// Player's collected coins
const playerCoins: Coin[] = [];

// Initialize map to store mementos
const cacheMementos: Map<string, string> = new Map();

function generateCoins(cell: Cell, count: number): Coin[] {
  const coins: Coin[] = [];
  for (let index = 0; index < count; index++) {
    coins.push({ cell, serialNumber: index });
  }
  return coins;
}

// Initial player position
let playerPosition: Cell = board.getCellForPoint(OAKES_CLASSROOM);

// Function to update the player marker
function updatePlayerMarker() {
  const newLatLng = leaflet.latLng(
    playerPosition.i * TILE_DEGREES,
    playerPosition.j * TILE_DEGREES,
  );
  playerMarker.setLatLng(newLatLng);
  map.setView(newLatLng, GAMEPLAY_ZOOM_LEVEL);
}

// Add caches to the map by cell numbers
function spawnCache(cell: Cell) {
  const bounds = board.getCellBounds(cell);
  const cacheKey = `${cell.i}-${cell.j}`;
  let cache: Cache;

  if (cacheMementos.has(cacheKey)) {
    cache = createCache(cell, []); // Create empty cache and load memento
    cache.fromMemento(cacheMementos.get(cacheKey)!);
  } else {
    const coins = generateCoins(
      cell,
      Math.ceil(luck([cell.i, cell.j].toString()) * 100),
    );
    cache = createCache(cell, coins); // Create new cache
    cacheMementos.set(cacheKey, cache.toMemento());
  }

  // Cache visual representation
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Cache event handler
  rect.bindPopup(() => createCachePopup(cell.i, cell.j, cache, cacheKey));
}

function createCachePopup(
  i: number,
  j: number,
  cache: Cache,
  cacheKey: string,
): HTMLDivElement {
  const coins = cache.coins;
  const popupDiv = document.createElement("div");
  popupDiv.classList.add("popupDiv");

  popupDiv.innerHTML = `
    <div>There is a cache here at "${j}, ${i}".<br>It has ${coins.length} coins.</div>
    <button id="poke">poke</button>
    <button id="deposit">deposit</button>`;

  popupDiv.querySelector<HTMLButtonElement>("#poke")!.addEventListener(
    "click",
    () => {
      if (coins.length > 0) {
        const coin = coins.shift(); // Get the first coin from the cache
        if (coin) {
          console.log(
            `Coin attained: ${coin.cell.i}:${coin.cell.j}#${coin.serialNumber}`,
          );
          playerCoins.push(coin); // Add the coin to the player's inventory
          cache.coins = coins; // Update the cache coins
          updateCacheMemento(cacheKey, cache);
          updateInventory();
          popupDiv.querySelector("div")!.innerHTML =
            `There is a cache here at "${j}, ${i}".<br>It has ${coins.length} coins.`;
        }
      }
    },
  );

  popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
    "click",
    () => {
      if (playerCoins.length > 0) {
        const firstCoin = playerCoins.shift(); // Get the first coin from player's inventory
        if (firstCoin) {
          console.log(`Coin deposited: ${j}:${i}#${firstCoin.serialNumber}`);
          coins.push(firstCoin); // Add the coin back to the cache
          cache.coins = coins; // Update the cache coins
          updateCacheMemento(cacheKey, cache);
          updateInventory();
          popupDiv.querySelector("div")!.innerHTML =
            `There is a cache here at "${j}, ${i}".<br>It has ${coins.length} coins.`;
        }
      } else {
        console.log("You have no coins to deposit.");
      }
    },
  );

  return popupDiv;
}

// Helper function to update the cache memento after changes
function updateCacheMemento(cacheKey: string, cache: Cache) {
  cacheMementos.set(cacheKey, cache.toMemento());
}

function updateInventoryDisplay(inventory: HTMLElement, playerCoins: Coin[]) {
  inventory.innerHTML = `Inventory: ${
    playerCoins
      .map(
        (coin) =>
          `<div><span class="coin-link" i="${coin.cell.i}" j="${coin.cell.j}">${coin.cell.i}:${coin.cell.j}#${coin.serialNumber}</span></div>`,
      )
      .join("")
  }`;
}

function attachInventoryEventListeners(
  inventory: HTMLElement,
  _map: leaflet.Map,
  onItemClick: (i: number, j: number) => void,
) {
  const coinLinks = inventory.querySelectorAll(".coin-link");
  coinLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const i = Number(link.getAttribute("i"));
      const j = Number(link.getAttribute("j"));
      onItemClick(i, j);
    });
  });
}

function updateInventory() {
  updateInventoryDisplay(inventory, playerCoins);
  attachInventoryEventListeners(inventory, map, (i, j) => {
    const latLng = leaflet.latLng(i * TILE_DEGREES, j * TILE_DEGREES);
    map.setView(latLng, GAMEPLAY_ZOOM_LEVEL);
    playerMarker.setLatLng(latLng);
    playerPosition = { i, j };
    populateCaches(
      board,
      map,
      playerPosition,
      TILE_DEGREES,
      CACHE_SPAWN_PROBABILITY,
      spawnCache,
    );
  });
}

// Function to update visible caches
// Function to update visible caches
function populateCaches(
  board: Board,
  map: leaflet.Map,
  playerPosition: Cell,
  tileDegrees: number,
  cacheSpawnProbability: number,
  spawnCache: (cell: Cell) => void,
) {
  const playerLatLng = leaflet.latLng(
    playerPosition.i * tileDegrees,
    playerPosition.j * tileDegrees,
  );
  const nearbyCells = board.getCellsNearPoint(playerLatLng);

  // Remove existing cache layers
  map.eachLayer((layer: leaflet.Layer) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });

  // Display or update caches based on player position
  nearbyCells.forEach((cell) => {
    if (luck([cell.i, cell.j].toString()) < cacheSpawnProbability) {
      spawnCache(cell);
    }
  });
}

// Function to move player
function movePlayer(iChange: number, jChange: number) {
  playerPosition = {
    i: playerPosition.i + iChange,
    j: playerPosition.j + jChange,
  };
  updatePlayerMarker();
  populateCaches(
    board,
    map,
    playerPosition,
    TILE_DEGREES,
    CACHE_SPAWN_PROBABILITY,
    spawnCache,
  );
  const latLng = leaflet.latLng(
    playerPosition.i * TILE_DEGREES,
    playerPosition.j * TILE_DEGREES,
  );
  updateMovementHistory(latLng.lat, latLng.lng); // Update polyline with new player position
}

// Add event listeners to player movement buttons
document.getElementById("north")!.addEventListener(
  "click",
  () => movePlayer(1, 0),
);
document.getElementById("south")!.addEventListener(
  "click",
  () => movePlayer(-1, 0),
);
document.getElementById("west")!.addEventListener(
  "click",
  () => movePlayer(0, -1),
);
document.getElementById("east")!.addEventListener(
  "click",
  () => movePlayer(0, 1),
);

updatePlayerMarker();
populateCaches(
  board,
  map,
  playerPosition,
  TILE_DEGREES,
  CACHE_SPAWN_PROBABILITY,
  spawnCache,
);

const geolocationButton = document.getElementById("sensor")!;
let geolocationWatchId: number | null = null;
const movementHistory: Array<[number, number]> = [];
const movementPolyline = leaflet.polyline([], { color: "blue" }).addTo(map);

geolocationButton.addEventListener("click", () => {
  if (!geolocationWatchId) {
    geolocationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        playerPosition = board.getCellForPoint(
          leaflet.latLng(latitude, longitude),
        );
        updatePlayerMarker();
        populateCaches(
          board,
          map,
          playerPosition,
          TILE_DEGREES,
          CACHE_SPAWN_PROBABILITY,
          spawnCache,
        );
        updateMovementHistory(latitude, longitude); // Update polyline with geolocation data
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true },
    );
  } else {
    navigator.geolocation.clearWatch(geolocationWatchId);
    geolocationWatchId = null;
  }
});

function saveGameState() {
  localStorage.setItem("playerCoins", JSON.stringify(playerCoins));
  localStorage.setItem(
    "cacheMementos",
    JSON.stringify(Array.from(cacheMementos.entries())),
  );
  localStorage.setItem("movementHistory", JSON.stringify(movementHistory));
}

function loadGameState() {
  const savedCoins = localStorage.getItem("playerCoins");
  if (savedCoins) {
    playerCoins.push(...JSON.parse(savedCoins));
  }

  const savedCaches = localStorage.getItem("cacheMementos");
  if (savedCaches) {
    JSON.parse(savedCaches).forEach(([key, memento]: [string, string]) => {
      cacheMementos.set(key, memento);
    });
  }

  const savedHistory = localStorage.getItem("movementHistory");
  if (savedHistory) {
    movementHistory.push(...JSON.parse(savedHistory));
    renderMovementHistory();
  }
}

// Call loadGameState when initializing the game
loadGameState();
globalThis.addEventListener("beforeunload", saveGameState);

function updateMovementHistory(lat: number, lng: number) {
  movementHistory.push([lat, lng]);
  movementPolyline.setLatLngs(movementHistory);
}

function renderMovementHistory() {
  movementPolyline.setLatLngs(movementHistory);
}

const resetButton = document.getElementById("reset")!;

resetButton.addEventListener("click", () => {
  const confirmation = globalThis.confirm(
    "Are you sure you want to erase your game state? This action cannot be undone.",
  );
  if (confirmation) {
    // Stop geolocation tracking if active
    if (geolocationWatchId) {
      navigator.geolocation.clearWatch(geolocationWatchId);
      geolocationWatchId = null;
    }

    // Clear local storage
    localStorage.removeItem("playerCoins");
    localStorage.removeItem("cacheMementos");
    localStorage.removeItem("movementHistory");

    // Reset game state
    playerCoins.length = 0;
    cacheMementos.clear();
    movementHistory.length = 0;
    movementPolyline.setLatLngs([]); // Clear polyline
    updateInventory();
    populateCaches(
      board,
      map,
      playerPosition,
      TILE_DEGREES,
      CACHE_SPAWN_PROBABILITY,
      spawnCache,
    );

    console.log("Game state has been reset.");
  } else {
    console.log("Game reset canceled.");
  }
});

updateInventory();
