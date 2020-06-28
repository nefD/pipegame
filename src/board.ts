import Phaser from 'phaser';
import PipeTile, { connectionsFactory } from '~/pipetile';
import {
  Direction,
  S_PIPE,
  TILE_HEIGHT,
} from '~/data';
import {
  shuffleArray,
  uniqueArray,
} from '~/utils';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
} from '~/main';

interface PathTile {
  tile: PipeTile;
  connections: Direction[];
}
const pathTileFactory = (tile: PipeTile, connections: Direction[] = []) => ({ tile, connections });

export default class Board {

  public scene: Phaser.Scene;
  public tiles: Array<PipeTile[]> = [];
  public height: number = 0;
  public width: number = 0;
  public x: number = 0;
  public y: number = 0;
  public startTile?: PipeTile;
  public endTiles: PipeTile[] = [];
  public poweredTiles: PipeTile[] = [];
  public emitter = new Phaser.Events.EventEmitter();
  public container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number = 0, y: number = 0) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.container = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.container.setDepth(1);
  }

  public setBoardSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public getBoardScreenHeight() {
    const targetHeight = GAME_HEIGHT - 50;
    return targetHeight;
  }

  public getBoardScreenWidth() {
    const targetHeight = GAME_HEIGHT - 50;
    const perTile = targetHeight / this.height;
    return perTile * this.width;
  }

  public initBoard() {
    const targetHeight = GAME_HEIGHT - 50;
    const perTile = targetHeight / this.height;
    const targetScale = perTile / TILE_HEIGHT;

    let offsetX = -((perTile * this.width) / 2) + (perTile / 2);
    let offsetY = -((perTile * this.height) / 2) + (perTile / 2);



    this.tiles = [];
    for (let column = 0; column < this.width; column++) {
      this.tiles[column] = [];
      for (let row = 0; row < this.height; row++) {
        let o = new PipeTile(this.scene, offsetX + (column * perTile), offsetY + (row * perTile));
        this.scene.add.existing(o);
        this.container.add(o);

        o.setPipeline('Light2D');
        o.setScale(targetScale);
        this.tiles[column][row] = o;
        o.setBoardPosition(column, row);

        o.on('clicked', this.onTileClicked, this);
        this.emitter.on('updatePoweredStatus', o.onUpdatePoweredStatus, o);
      }
    }
  }

  public onTileClicked() {
    this.emitter.emit('updatePoweredStatus');
    this.determinePoweredTiles();
  }

  public generateBoard() {
    const startX = Phaser.Math.RND.integerInRange(3, this.width - 4);
    const startY = Phaser.Math.RND.integerInRange(3, this.height - 4);
    this.startTile = this.tiles[startX][startY];
    this.startTile.setPowered(true);

    const xCenterDist = startX - Math.round(this.width / 2);
    const yCenterDist = startY - Math.round(this.height / 2);
    if (Math.abs(xCenterDist) > Math.abs(yCenterDist)) {
      if (xCenterDist < 0) {
        this.startTile.openConnection(Direction.east);
      } else {
        this.startTile.openConnection(Direction.west);
      }
    } else {
      if (yCenterDist < 0) {
        this.startTile.openConnection(Direction.south);
      } else {
        this.startTile.openConnection(Direction.north);
      }
    }

    let tries = 0;
    while (tries < 20 && this.endTiles.length < 4) {
      tries += 1;
      this.createEndPath();
    }

    this.fillRemainingBoard();
    this.shuffleBoard();
    this.determinePoweredTiles();
  }

  public createEndPath() {
    if (!this.startTile) {
      return;
    }

    const maxAttempts = 50;
    const minimumLength = 10;
    const minimumDistance = 4;
    const path: PathTile[] = [];
    let possibleDirections: Direction[] = [];
    let currentTile: PathTile;
    let nextTile: PathTile;
    let nextDirection: Direction = Direction.north;

    // the first tile in our path should be in the direction of our start tiles connection
    if (this.startTile.connections.north) {
      currentTile = pathTileFactory(this.tiles[this.startTile.boardX][this.startTile.boardY - 1], [Direction.south]);
    } else if (this.startTile.connections.east) {
      currentTile = pathTileFactory(this.tiles[this.startTile.boardX + 1][this.startTile.boardY], [Direction.west]);
    } else if (this.startTile.connections.south) {
      currentTile = pathTileFactory(this.tiles[this.startTile.boardX][this.startTile.boardY + 1], [Direction.north]);
    } else {
      currentTile = pathTileFactory(this.tiles[this.startTile.boardX - 1][this.startTile.boardY], [Direction.east]);
    }
    path.push(currentTile);

    const isEligible = (tile: PathTile, direction: Direction) => {
      const tileConnections = uniqueArray(tile.tile.getOpenConnections().concat(tile.connections));
      if (tileConnections.length >= 3 && !tileConnections.includes(direction)) {
        return false;
      }
      let x, y;
      switch (direction) {
        case Direction.north: x = 0; y = -1; break;
        case Direction.east: x = 1; y = 0; break;
        case Direction.south: x = 0; y = 1; break;
        case Direction.west: x = -1; y = 0; break;
      }
      if (
        tile.tile.boardX + x < 0 || tile.tile.boardX + x >= this.width ||
        tile.tile.boardY + y < 0 || tile.tile.boardY + y >= this.height
      ) {
        return false;
      }

      const checkTile = this.tiles[tile.tile.boardX + x][tile.tile.boardY + y];
      return checkTile != this.startTile
        && (checkTile.getConnectionCount() < 3 || checkTile.oppositeDirectionIsOpen(direction))
        && !path.some(t => t.tile === checkTile)
        && !this.endTiles.includes(checkTile);
    };

    const weightPossibleDirections = (tile: PathTile, possibleDirections: Direction[]) => {
      this.endTiles.forEach(endTile => {
        // TODO - only weight the direction with the most bias
        let dirs: Record<Direction, number> = {
          [Direction.north]: 0,
          [Direction.east]: 0,
          [Direction.south]: 0,
          [Direction.west]: 0,
        };

        const xCenterDist = endTile.boardX - Math.round(this.width / 2);
        const yCenterDist = endTile.boardY - Math.round(this.height / 2);
        if (xCenterDist < 0 && possibleDirections.includes(Direction.west)) {
          possibleDirections.push(Direction.west);
          // dirs[Direction.west] += 1;
        } else if (possibleDirections.includes(Direction.east)) {
          possibleDirections.push(Direction.east);
          // dirs[Direction.east] += 1;
        }
        if (yCenterDist < 0 && possibleDirections.includes(Direction.south)) {
          possibleDirections.push(Direction.south);
          // dirs[Direction.south] += 1;
        } else if (possibleDirections.includes(Direction.north)) {
          possibleDirections.push(Direction.north);
          // dirs[Direction.north] += 1;
        }
      });
    };

    let success = false;
    let attempt = 0;
    for (attempt = 0; attempt < maxAttempts; attempt++) {
      possibleDirections = [];
      if (isEligible(currentTile, Direction.north)) {
        possibleDirections.push(Direction.north);
      }
      if (isEligible(currentTile, Direction.east)) {
        possibleDirections.push(Direction.east);
      }
      if (isEligible(currentTile, Direction.south)) {
        possibleDirections.push(Direction.south);
      }
      if (isEligible(currentTile, Direction.west)) {
        possibleDirections.push(Direction.west);
      }

      // @TODO - Favor going in new directions rather than reusing existing ones

      if (possibleDirections.length === 0) {
        return;
      }

      weightPossibleDirections(currentTile, possibleDirections);
      shuffleArray(possibleDirections);
      nextDirection = possibleDirections[0];
      switch (nextDirection) {
        case Direction.north:
          // TODO - write a helper function for this
          nextTile = pathTileFactory(this.tiles[currentTile.tile.boardX][currentTile.tile.boardY - 1], [Direction.south]);
          break;
        case Direction.east:
          nextTile = pathTileFactory(this.tiles[currentTile.tile.boardX + 1][currentTile.tile.boardY], [Direction.west]);
          break;
        case Direction.south:
          nextTile = pathTileFactory(this.tiles[currentTile.tile.boardX][currentTile.tile.boardY + 1], [Direction.north]);
          break;
        case Direction.west:
          nextTile = pathTileFactory(this.tiles[currentTile.tile.boardX - 1][currentTile.tile.boardY], [Direction.east]);
          break;
      }
      currentTile.connections.push(nextDirection);
      path.push(nextTile);
      currentTile = nextTile;

      if (path.length >= minimumLength) {
        const openConnections = currentTile.tile.getOpenConnections().length + currentTile.connections.length;
        const isMinimum = this.isMinimumDistance(currentTile.tile, minimumDistance);
        const notEdge = currentTile.tile.boardX > 0 &&
          currentTile.tile.boardY > 0 &&
          currentTile.tile.boardX < this.width - 1 &&
          currentTile.tile.boardY < this.height - 1;
        if (openConnections === 1 && isMinimum && notEdge) {
          success = true;
          break;
        }
      }
    }

    if (!success) {
      return;
    }

    this.endTiles.push(currentTile.tile);
    path.forEach(t => t.tile.openConnections(t.connections));
  }

  private isMinimumDistance = (tile: PipeTile, minimumDistance: number, debug = false) => {
    return !this.endTiles.concat(this.startTile || [])
      .some(t => {
        if (debug) console.log(`distance between ${tile.boardX},${tile.boardY} and ${t.boardX},${t.boardY} is ${Math.abs(tile.boardX - t.boardX) + Math.abs(tile.boardY - t.boardY)}`);
        return Math.abs(tile.boardX - t.boardX) + Math.abs(tile.boardY - t.boardY) < minimumDistance;
      });
  }

  public shuffleBoard() {
    for (let column = 0; column < this.width; column++) {
      for (let row = 0; row < this.height; row++) {
        Array.from(Array(Phaser.Math.RND.integerInRange(0, 3))).map((v,i) => this.tiles[column][row].rotateClockwise(true));
        // this.tiles[column][row].rotateClockwise(true);
      }
    }
  }

  public fillRemainingBoard() {
    let tile: PipeTile;

    let count = 0;

    for (let column = 0; column < this.width; column++) {
      for (let row = 0; row < this.height; row++) {
        tile = this.tiles[column][row];
        if (tile === this.startTile || this.endTiles.includes(tile)) {
          continue;
        }

        let possibleConnections = [Direction.north, Direction.east, Direction.south, Direction.west];

        if (column === 0) possibleConnections = possibleConnections.filter(d => d !== Direction.west);
        if (row === 0) possibleConnections = possibleConnections.filter(d => d !== Direction.north);
        if (column === this.width - 1) possibleConnections = possibleConnections.filter(d => d !== Direction.east);
        if (row === this.height - 1) possibleConnections = possibleConnections.filter(d => d !== Direction.south);

        possibleConnections.sort(() => Math.floor(Math.random() * 3) - 1);
        let upperBound = Math.min(3, possibleConnections.length);
        const possibleNums = [upperBound, upperBound, upperBound, 2, 2, 2, 2];
        // possibleNums.sort(() => Math.floor(Math.random() * 3) - 1);
        // let numConnections = Phaser.Math.RND.integerInRange(2, Math.min(3, possibleConnections.length));
        let numConnections = possibleNums[Phaser.Math.RND.integerInRange(0, possibleNums.length - 1)];

        // let numConnections = possibleNums.pop()!;
        const connections = connectionsFactory();

        for (let i = 0; i < numConnections; i++) {
          const dir = possibleConnections.pop();
          switch (dir) {
            case Direction.north: connections.north = true; break;
            case Direction.east: connections.east = true; break;
            case Direction.south: connections.south = true; break;
            case Direction.west: connections.west = true; break;
          }
        }

        tile.setConnections(connections);
        count += 1;
      }
    }
  }

  public getTileInDir(fromTile: PipeTile, dir: Direction): PipeTile | null {
    let targetX = fromTile.boardX,
        targetY = fromTile.boardY;
    switch (dir) {
      case Direction.north: targetY--; break;
      case Direction.east: targetX++; break;
      case Direction.south: targetY++; break;
      case Direction.west: targetX--; break;
    }
    if (targetX < 0 || targetY < 0 || targetX >= this.width || targetY >= this.height) {
      return null;
    }
    return this.tiles[targetX][targetY];
  }

  public determinePoweredTiles() {
    if (!this.startTile) {
      return;
    }

    let currentTile: PipeTile;
    let currentConnections: Direction[] = [];
    const checked: PipeTile[] = [];
    const queue: PipeTile[] = [ this.startTile ];

    let attempts = 0;
    const maxAttempts = this.width * this.height + 1;
    while (queue.length > 0 && attempts < maxAttempts) {
      attempts++;
      if (queue.length === 0) break;
      currentTile = queue.shift()!;
      if (!currentTile) break;
      checked.push(currentTile);

      currentConnections = currentTile.getOpenConnections();
      currentConnections.forEach(d => {
        const otherTile = this.getTileInDir(currentTile, d);
        if (otherTile
          && otherTile.oppositeDirectionIsOpen(d)
          && !queue.includes(otherTile)
          && !checked.includes(otherTile)
        ) {
          queue.push(otherTile);
        }
      });
    }

    let changed = 0;
    this.poweredTiles.forEach((t, i) => {
      if (!checked.includes(t)) {
        if (t.powered) changed++;
        t.setPowered(false, changed * 15);
      }
    });

    this.poweredTiles = checked;

    changed = 0;
    this.poweredTiles.forEach((t, i) => {
      if (!t.powered) changed++;
      t.setPowered(true, changed * 15)
    });

    this.checkForVictoryCondition();
  }

  public rt?: Phaser.GameObjects.RenderTexture;

  public debugFlag = false;
  public checkForVictoryCondition() {
    // if (!this.debugFlag) {
    //   this.debugFlag = true;
    //   return;
    // }
    if (this.endTiles.some(t => !t.powered)) {
      return false;
    }

    let count = 0;
    let countDelay = 8;
    let tile;
    for (let column = 0; column < this.width; column++) {
      for (let row = 0; row < this.height; row++) {
        tile = this.tiles[column][row];
        if (!tile.powered) {
          tile.runDestroyTween(count * countDelay);
          count++;
        }
      }
    }

    const dropDuration = 200;
    const dropDelay = (count * countDelay) + 400;

    let oldRt: Phaser.GameObjects.RenderTexture;
    if (this.rt) {
      oldRt = this.rt;
    }

    this.rt = this.scene.add.renderTexture(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.getBoardScreenWidth(), this.getBoardScreenHeight());
    this.rt.setOrigin(0.5);

    this.scene.tweens.add({
      delay: dropDelay,
      targets: this.rt,
      scale: { value: 0.85, duration: dropDuration, ease: 'Quart.easeInOut' },
      onStart: () => {
        if (oldRt) {
          this.rt?.draw(oldRt, this.getBoardScreenWidth() / 2, this.getBoardScreenHeight() / 2);
          oldRt.destroy(true);
        }
        this.container.each(o => o.resetPipeline());
        this.rt?.draw(this.container, this.getBoardScreenWidth() / 2, this.getBoardScreenHeight() / 2);
        this.container.setVisible(false);
      },
    });

    const fromColor = new Phaser.Display.Color(255, 255, 255);
    const toColor = new Phaser.Display.Color(125, 125, 125);
    const colorTween = this.scene.tweens.addCounter({
      from: 0,
      to: 100,
      duration: dropDuration,
      delay: dropDelay,
      completeDelay: 10,
      onUpdate: () => {
        const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
          fromColor,
          toColor,
          100,
          colorTween.getValue() || 0,
        );
        this.rt?.setTint(Phaser.Display.Color.ObjectToColor(tint).color);
      },
      onComplete: () => {
        this.createNextBoard();
      }
    });
  }

  public createNextBoard() {
    this.tiles = [];
    this.startTile = undefined;
    this.endTiles = [];
    this.poweredTiles = [];
    this.container.removeAll(true);
    this.container.setVisible(true);

    this.debugFlag = false;

    this.initBoard();
    this.generateBoard();
  }
}
