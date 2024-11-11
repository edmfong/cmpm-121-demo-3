import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board, Cell } from "./board.ts"; // Import Cell and Board

// Constants and configuration
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 0.0001;
const NEIGHBORHOOD_SIZE = 8; // steps away from player
const CACHE_SPAWN_PROBABILITY = 0.1; // 10% of grid cells within neighborhood size

// Initialize the Board for managing cells
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

// Game state variables
let playerPoints = 0;
let playerTotalPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...<br>0 coins";

// Player's inventory (list of coins the player has collected)
const playerInventory: Array<{ serial: number; i: number; j: number }> = [];
const inventoryDiv = document.querySelector<HTMLDivElement>("#inventory")!;

// Initialize the game map
const map = initializeMap();

// A map to store coins for each cache
const cacheCoins: Map<string, Array<{ serial: number; i: number; j: number }>> =
  new Map();

// Map to store point values for each cache location
const _cachePointValues = new Map<string, number>();

// Add player marker and display
const playerMarker = createPlayerMarker();
playerMarker.addTo(map);

// Populate caches around the player's location
populateCaches();

// Initializes the Leaflet map with given configurations.
function initializeMap(): leaflet.Map {
  const map = leaflet.map(document.getElementById("map")!, {
    center: OAKES_CLASSROOM,
    zoom: GAMEPLAY_ZOOM_LEVEL,
    minZoom: GAMEPLAY_ZOOM_LEVEL,
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    zoomControl: false,
    scrollWheelZoom: false,
  });

  // Add OpenStreetMap tile layer
  leaflet
    .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(map);

  return map;
}

// Creates and returns a marker for the player.
function createPlayerMarker(): leaflet.Marker {
  const marker = leaflet.marker(OAKES_CLASSROOM);
  marker.bindTooltip("That's you!");
  return marker;
}

// Updates the player's points display.
function updatePlayerPoints() {
  statusPanel.innerHTML =
    `${playerPoints} points accumulated<br>${playerTotalPoints} coins`;
}

// Function to update the inventory display in the HTML
function updateInventory() {
  inventoryDiv.innerHTML = "<h3>Inventory</h3>"; // Optional header for the inventory

  // Loop through the player's inventory and display each coin.
  playerInventory.forEach((coin) => {
    const coinDiv = document.createElement("div");
    coinDiv.innerHTML = `${coin.j}:${coin.i}#${coin.serial}`;
    inventoryDiv.appendChild(coinDiv);
  });
}

// Spawns a cache at the specified cell position.
function spawnCache(cell: Cell) {
  const bounds = board.getCellBounds(cell);
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
  rect.bindPopup(() => createCachePopup(cell.i, cell.j));

  // Initialize the coins array for this cache (x coins per cache, serial numbers 0 to x-1)
  const coinCount = Math.floor(
    luck([cell.i, cell.j, "coinCount"].toString()) * 10,
  ); // Random coin count for each cache
  const coins: Array<{ serial: number; i: number; j: number }> = [];

  for (let serial = 0; serial < coinCount; serial++) {
    coins.push({ serial, i: cell.i, j: cell.j });
  }

  cacheCoins.set(`${cell.i},${cell.j}`, coins);
}

// Creates a popup with point interactions for a cache.
function createCachePopup(i: number, j: number): HTMLDivElement {
  // Retrieve the coins associated with this cache
  const coins = cacheCoins.get(`${i},${j}`) || [];

  const popupDiv = document.createElement("div");
  popupDiv.classList.add("cache-popup");
  popupDiv.innerHTML = `
    <div>There is a cache here at "${j}, ${i}".<br>It has ${coins.length} coins.</div>
    <button id="poke">poke</button>
    <button id="deposit">deposit</button>`;

  const rect = leaflet.rectangle(board.getCellBounds({ i, j }));
  rect.addTo(map);

  // Create a new Leaflet Popup instance for this cache
  const popup = leaflet.popup().setContent(popupDiv);

  // When the rectangle is clicked, show the popup
  rect.on("click", () => {
    rect.bindPopup(popup).openPopup(); // Open the popup when the rectangle is clicked
  });

  popupDiv.querySelector<HTMLButtonElement>("#poke")!.addEventListener(
    "click",
    () => {
      // Check if there are any coins left in the cache
      if (coins.length > 0) {
        const coin = coins.shift(); // Get and remove the last coin
        if (coin) {
          // Log which coin was attained
          console.log(`Coin attained: ${coin.j}:${coin.i}#${coin.serial}`);

          // Add the coin to the player's inventory
          playerInventory.push(coin);

          // Update the inventory display
          updateInventory();

          // Update the stored value
          cacheCoins.set(`${i},${j}`, coins);

          // Update player's points
          playerPoints++;
          playerTotalPoints++;
          updatePlayerPoints();

          // Update the popup content dynamically after the poke
          popupDiv.querySelector("div")!.innerHTML =
            `There is a cache here at "${j}, ${i}".<br>It has ${coins.length} coins.`;
        }
      }
    },
  );

  popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
    "click",
    () => {
      // Check if the player has at least one coin in the inventory
      if (playerInventory.length > 0) {
        // Remove the first coin from the inventory
        const firstCoin = playerInventory.shift(); // Removes the first coin
        if (firstCoin) {
          console.log(`Coin deposited: ${j}:${i}#${firstCoin.serial}`);

          // Add the coin to the cache's coins array
          coins.push(firstCoin); // Add the first coin to the cache
          cacheCoins.set(`${i},${j}`, coins); // Update the cache coins map

          // Update the popup content dynamically after the deposit
          popupDiv.querySelector("div")!.innerHTML =
            `There is a cache here at "${j}, ${i}".<br>It has ${coins.length} coins.`;

          // Update player's points
          playerPoints++;
          playerTotalPoints++;
          updatePlayerPoints();
        }
      } else {
        console.log("You have no coins to deposit.");
      }

      // Update the inventory display
      updateInventory();
    },
  );

  return popupDiv;
}

// Populates caches in the vicinity of the player's location based on probability.
function populateCaches() {
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      // Adjust OAKES_CLASSROOM's position by the current loop indices (i, j)
      const adjustedLat = OAKES_CLASSROOM.lat + i * TILE_DEGREES;
      const adjustedLng = OAKES_CLASSROOM.lng + j * TILE_DEGREES;
      const adjustedPoint = leaflet.latLng(adjustedLat, adjustedLng);

      // Get the cell corresponding to the adjusted point
      const cell = board.getCellForPoint(adjustedPoint);

      // Randomize cache spawning based on probability
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(cell);
      }
    }
  }
}
