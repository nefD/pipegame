import Phaser from 'phaser';
import {
  Direction,
  S_PIPE,
} from '~/data';
import UUID = Phaser.Utils.String.UUID;
import Color = Phaser.Display.Color;

export interface Connections {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

export const connectionsFactory = (config?: Partial<Connections>): Connections => ({
  north: false,
  east: false,
  south: false,
  west: false,
  ...config,
});

export default class PipeTile extends Phaser.GameObjects.Sprite {

  public boardX = 0;
  public boardY = 0;
  public powered = false;
  public connections: Connections = {
    north: false,
    east: false,
    south: false,
    west: false,
  };
  private rotateTween?: Phaser.Tweens.Tween;
  private colorTween?: Phaser.Tweens.Tween;
  private targetAngle = 0;
  private unpoweredColor = new Phaser.Display.Color(255, 255, 255);
  private poweredColor = new Phaser.Display.Color(0, 255, 0);

  constructor(scene, x, y) {
    super(scene, x, y, S_PIPE.i);
    this.setInteractive();
    this.setScale(2, 2);
    this.on('pointerdown', this.clicked, this);
  }

  public setBoardPosition(x: number, y: number) {
    this.boardX = x;
    this.boardY = y;
  }

  setConnections(connections: Connections) {
    this.connections = { ...connections };
    this.onConnectionsUpdated();
  }

  onConnectionsUpdated() {
    const count = this.getConnectionCount();
    if (count === 4) {
      this.setTexture(S_PIPE.cross);
    } else if (count === 3) {
      this.setTexture(S_PIPE.t);
      if (!this.connections.north) {
        // 0 degrees if WES
        this.setAngle(0);
      } else if (!this.connections.east) {
        // 90 degrees if NWS
        this.setAngle(90);
      } else if (!this.connections.south) {
        // 180 degrees if WEN
        this.setAngle(180);
      } else {
        // 270 degrees if NES
        this.setAngle(270);
      }
    } else if (count === 2) {
      // Is it 'I' shaped?
      if ((this.connections.north && this.connections.south) || (this.connections.east && this.connections.west)) {
        this.setTexture(S_PIPE.i);
        if (this.connections.north && this.connections.south) {
          // 0 degrees if NS
          this.setAngle(0);
        } else {
          // 90 degrees if EW
          this.setAngle(90);
        }
      } else {
        // No, so it must be L shaped
        this.setTexture(S_PIPE.l);
        if (this.connections.north && this.connections.east) {
          // 0 degrees if NE
          this.setAngle(0);
        } else if (this.connections.east && this.connections.south) {
          // 90 degrees if ES
          this.setAngle(90);
        } else if (this.connections.west && this.connections.south) {
          // 180 degrees if WS
          this.setAngle(180);
        } else {
          // 270 degrees if WN
          this.setAngle(270);
        }
      }
    } else {
      // single
      this.setTexture(S_PIPE.single);
      if (this.connections.north) {
        // 0 degrees if N
        this.setAngle(0);
      } else if (this.connections.east) {
        // 90 degrees if E
        this.setAngle(90);
      } else if (this.connections.south) {
        // 180 degrees if S
        this.setAngle(180);
      } else {
        // 270 degrees if W
        this.setAngle(270);
      }
    }
    this.targetAngle = this.angle;
  }

  public getConnectionCount = () => (+this.connections.north) + (+this.connections.east) + (+this.connections.south) + (+this.connections.west);

  clicked(pointer: Phaser.Input.Pointer) {
    if (pointer.rightButtonDown()) {
      this.rotateCounterClockwise();
    } else {
      this.rotateClockwise();
    }
    this.emit('clicked');
  }

  public onUpdatePoweredStatus() {
    // if (this.boardX === 0) {
    //   console.log(`updating powered status!`);
    // }
  }

  public setPowered(powered: boolean, delay: number = 0) {
    if (powered === this.powered) {
      return;
    }
    this.powered = powered;
    this.runColorTween(delay);
  }

  runColorTween(delay: number = 0) {
    if (this.colorTween) {
      this.colorTween.stop();
    }

    this.colorTween = this.scene.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 200,
      delay,
      onUpdate: () => {
        const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
          this.powered ? this.unpoweredColor : this.poweredColor,
          this.powered ? this.poweredColor : this.unpoweredColor,
          100,
          this.colorTween?.getValue() || 0,
        );
        this.setTint(Phaser.Display.Color.ObjectToColor(tint).color);
      },
      onComplete: () => {
        this.colorTween?.remove();
        this.colorTween = undefined;
      }
    });
  }

  runRotateTween() {
    this.rotateTween = this.scene.tweens.add({
      targets: this,
      angle: { value: this.targetAngle, duration: 200, ease: 'Back.easeInOut' },
      scale: { value: 3, duration: 100, yoyo: true, ease: 'Sine.easeInOut' },
      onComplete: () => {
        this.rotateTween?.remove();
        this.rotateTween = undefined;
        this.targetAngle = this.angle;
      },
    });
  }

  runDestroyTween(delay: number) {
    this.scene.tweens.add({
      delay,
      targets: this,
      alpha: { value: 0, duration: 300 },
      angle: { value: Phaser.Math.RND.integerInRange(-360, 360), duration: 300 },
      scale: { value: this.scale * 0.25, duration: 300 },
      x: { value: this.x + Phaser.Math.RND.integerInRange(-75, 75), duration: 400, ease: 'Cubic.easeOut' },
      y: { value: this.y + 200, duration: 200, ease: 'Back.easeIn' },
    });
  }

  rotateClockwise(skipAnimation = false) {
    this.connections = connectionsFactory({
      north: this.connections.west,
      east: this.connections.north,
      south: this.connections.east,
      west: this.connections.south,
    });

    if (skipAnimation) {
      this.setAngle(this.angle + 90);
      return;
    }

    if (this.rotateTween) {
      this.rotateTween.stop(1);
      this.rotateTween = undefined;
    }
    this.targetAngle = this.angle + 90;
    this.runRotateTween();
  }

  rotateCounterClockwise(skipAnimation = false) {
    this.connections = connectionsFactory({
      north: this.connections.east,
      east: this.connections.south,
      south: this.connections.west,
      west: this.connections.north,
    });

    if (skipAnimation) {
      this.setAngle(this.angle - 90);
      return;
    }

    if (this.rotateTween) {
      this.rotateTween.stop(1);
      this.rotateTween = undefined;
    }
    this.targetAngle = this.angle - 90;
    this.runRotateTween();
  }

  public getOpenConnections(): Direction[] {
    const open: Direction[] = [];
    if (this.connections.north) open.push(Direction.north);
    if (this.connections.east) open.push(Direction.east);
    if (this.connections.south) open.push(Direction.south);
    if (this.connections.west) open.push(Direction.west);
    return open;
  }

  public openConnections(dirs: Direction[]) {
    dirs.forEach(dir => {
      switch (dir) {
        case Direction.north: this.connections.north = true; break;
        case Direction.east: this.connections.east = true; break;
        case Direction.south: this.connections.south = true; break;
        case Direction.west: this.connections.west = true; break;
      }
    });
    this.onConnectionsUpdated();
  }

  public openConnection(dir: Direction) {
    switch (dir) {
      case Direction.north: this.connections.north = true; break;
      case Direction.east: this.connections.east = true; break;
      case Direction.south: this.connections.south = true; break;
      case Direction.west: this.connections.west = true; break;
    }
    this.onConnectionsUpdated();
  }

  public openOppositeConnection(dir: Direction) {
    switch (dir) {
      case Direction.north: this.openConnection(Direction.south); break;
      case Direction.east: this.openConnection(Direction.west); break;
      case Direction.south: this.openConnection(Direction.north); break;
      case Direction.west: this.openConnection(Direction.east); break;
    }
  }

  public directionIsOpen(dir: Direction) {
    switch (dir) {
      case Direction.north: return this.connections.north;
      case Direction.east: return this.connections.east;
      case Direction.south: return this.connections.south;
      case Direction.west: return this.connections.west;
    }
  }

  public oppositeDirectionIsOpen(dir: Direction) {
    switch (dir) {
      case Direction.north: return this.connections.south;
      case Direction.east: return this.connections.west;
      case Direction.south: return this.connections.north;
      case Direction.west: return this.connections.east;
    }
  }

  public openRandomConnection() {
    const num = Phaser.Math.RND.integerInRange(0, 3);
    switch (num) {
      case 0: this.connections.north = true; break;
      case 1: this.connections.east = true; break;
      case 2: this.connections.south = true; break;
      case 3: this.connections.west = true; break;
    }
    this.onConnectionsUpdated();
  }

  public randomlyRotate() {

  }
}

