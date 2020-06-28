import Phaser from 'phaser';
import {
  Direction,
  S_PIPE,
  TILE_HEIGHT,
} from "../data";
import PipeTile, { connectionsFactory } from '~/pipetile';
import { shuffleArray } from '~/utils';
import Board from '~/board';

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
  }

  public keyA!: Phaser.Input.Keyboard.Key;
  public board!: Board;
  create() {

    this.input.mouse.disableContextMenu();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const rows = 10;
    const columns = 10;
    this.board = new Board(this, 150, 50);
    this.board.setBoardSize(10, 10);
    this.board.initBoard();
    this.board.generateBoard();

    const light  = this.lights.addLight(0, 0, 200, 0xFFFFB8, 1.0);

    this.lights.enable().setAmbientColor(0xf5f5f5);

    this.input.on('pointermove', function (pointer) {

      light.x = pointer.x;
      light.y = pointer.y;

    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (Phaser.Input.Keyboard.JustDown(this.keyA)) {
      this.board.createEndPath();
    }
  }

}
