import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

// Constants and configuration
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 0.0001;
const NEIGHBORHOOD_SIZE = 8; // steps away from player
const CACHE_SPAWN_PROBABILITY = 0.1; // 10% of grid cells within neighborhood size

// Game state variables
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

// Initialize the game map
const map = initializeMap();

// Map to store point values for each cache location
const cachePointValues = new Map<string, number>();

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
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
}

// Spawns a cache at the specified cell position (i, j) on the map.
function spawnCache(i: number, j: number) {
  const bounds = calculateTileBounds(i, j);
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
  rect.bindPopup(() => createCachePopup(i, j));
}

// Calculates the bounds for a tile based on cell indices.
function calculateTileBounds(i: number, j: number): leaflet.LatLngBounds {
  const origin = OAKES_CLASSROOM;
  return leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);
}

// Creates a popup with point interactions for a cache.
function createCachePopup(i: number, j: number): HTMLDivElement {
  // Use the stored point value or generate a new one if it doesn't exist
  let pointValue = cachePointValues.get(`${i},${j}`) ??
    Math.floor(luck([i, j, "initialValue"].toString()) * 100);
  cachePointValues.set(`${i},${j}`, pointValue); // Ensure it's saved in the map

  const popupDiv = document.createElement("div");
  popupDiv.classList.add("cache-popup");
  popupDiv.innerHTML = `
    <div>There is a cache here at "${i},${j}". It has value <span id="value">${pointValue}</span>.</div>
    <button id="poke">poke</button>`;

  popupDiv.querySelector<HTMLButtonElement>("#poke")!.addEventListener(
    "click",
    () => {
      if (pointValue > 0) {
        pointValue--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          pointValue.toString();
        playerPoints++;
        updatePlayerPoints();

        // Update the stored value
        cachePointValues.set(`${i},${j}`, pointValue);
      }
    },
  );

  return popupDiv;
}

// Populates caches in the vicinity of the player's location based on probability.
function populateCaches() {
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(i, j);
      }
    }
  }
}
