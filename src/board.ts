import leaflet from "leaflet";

// Export the Cell interface so it can be used in other files
export interface Cell {
  readonly i: number;
  readonly j: number;
}

// The Board class manages grid cells and tile-based operations
export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;
  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = `${i},${j}`;

    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }

    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.floor(point.lng / this.tileWidth);
    const j = Math.floor(point.lat / this.tileWidth);

    return this.getCanonicalCell({ i, j });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    const southWest = new leaflet.LatLng(
      j * this.tileWidth,
      i * this.tileWidth,
    );
    const northEast = new leaflet.LatLng(
      (j + 1) * this.tileWidth,
      (i + 1) * this.tileWidth,
    );

    return new leaflet.LatLngBounds(southWest, northEast);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);

    for (
      let di = -this.tileVisibilityRadius;
      di <= this.tileVisibilityRadius;
      di++
    ) {
      for (
        let dj = -this.tileVisibilityRadius;
        dj <= this.tileVisibilityRadius;
        dj++
      ) {
        const neighborCell = this.getCanonicalCell({
          i: originCell.i + di,
          j: originCell.j + dj,
        });
        resultCells.push(neighborCell);
      }
    }

    return resultCells;
  }
}
