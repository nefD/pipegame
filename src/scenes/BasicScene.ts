import Phaser from 'phaser';
import {
  Direction,
  S_PIPE,
  TILE_HEIGHT,
} from "../data";
import PipeTile, { connectionsFactory } from '~/pipetile';
import { shuffleArray } from '~/utils';
import Board from '~/board';
import { CustomParticle } from '~/customParticle';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
} from '~/main';

export default class BasicScene extends Phaser.Scene
{
  constructor() {
    super('basic-scene');
  }

  preload() {
    this.load.image(S_PIPE.cross, ['assets/pipe-cross.png', 'assets/pipe-cross-n.png']);
    this.load.image(S_PIPE.i, ['assets/pipe-I.png', 'assets/pipe-I-n.png']);
    this.load.image(S_PIPE.l, ['assets/pipe-L.png', 'assets/pipe-L-n.png']);
    this.load.image(S_PIPE.t, ['assets/pipe-T.png', 'assets/pipe-T-n.png']);
    this.load.image(S_PIPE.single, ['assets/pipe-single.png', 'assets/pipe-single-n.png']);
    this.load.image('arrow', 'assets/arrow.png');
    this.load.image('circle', 'assets/circle.png');
  }

  public keyA!: Phaser.Input.Keyboard.Key;
  public board!: Board;

  public timerText?: Phaser.GameObjects.Text;
  public timerValue: number = 0;

  public mouseLight?: Phaser.GameObjects.Light;

  create() {

    this.timerText = this.add.text(20, 20, '0');
    this.timerText.setFontSize(32);
    this.timerText.setOrigin(0.5, 0.5);
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.updateTimer,
      callbackScope: this,
    });

    this.input.mouse.disableContextMenu();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.board = new Board(this, 150, 50);
    this.board.setBoardSize(15, 15);
    this.board.initBoard();
    this.board.generateBoard();

    this.mouseLight = this.lights.addLight(0, 0, 200, 0xFFFFB8, 1.0);
    this.lights.enable().setAmbientColor(0xf5f5f5);

    let particles = this.add.particles('circle');
    let baseScale = 0.2;
    let emitter = particles.createEmitter({
      speed: 0,
      scaleY: baseScale,
      scaleX: {
        onUpdate: (particle, key, t, value) => {
          return baseScale - (t * (baseScale * 0.9));
        }
      },
      lifespan: 2000,
      tint: 0x00aa00,
      frequency: 2000,
      gravityY: 600,
      emitCallback: (particle: Phaser.GameObjects.Particles.Particle, emitter) => {
        const point: Phaser.Math.Vector2 = Phaser.Math.RND.pick(this.board.slimePoints);
        if (!point) {
          particle.y = 0;
          particle.x = -50;
          return;
        }
        particle.x = point.x;
        particle.y = point.y;
        emitter.frequency = Math.max(800, 2000 - (this.board.slimePoints.length * 70));
      },
      rotate: {
        onUpdate: (particle, key, t, value) => {
          return Phaser.Math.RadToDeg(Math.atan2(particle.velocityY, particle.velocityX) + Math.PI / 2);
        },
      }
    });
    emitter.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  updateTimer(): void {
    this.timerValue += 1;
    this.timerText?.setText(`${this.timerValue}`);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (Phaser.Input.Keyboard.JustDown(this.keyA)) {
      this.board.createEndPath();
    }

    if (this.mouseLight) {
      this.mouseLight.x = this.input.mousePointer.x + Math.sin(time * 0.0015) * 35;
      this.mouseLight.y = this.input.mousePointer.y + Math.cos(time * 0.0009) * 35;
      this.mouseLight.intensity = (1.75 + ((Math.sin(time * 0.025) + 1.0) / 8)) * 0.75;
    }
  }

}
