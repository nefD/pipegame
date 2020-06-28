import Phaser from 'phaser'

import HelloWorldScene from './scenes/HelloWorldScene'
import BasicScene from './scenes/BasicScene';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

const config: Phaser.Types.Core.GameConfig = {
	// type: Phaser.AUTO,
	type: Phaser.WEBGL,
	// width: 800,
	// height: 600,
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { y: 200 }
		}
	},
	render: {
		// pixelArt: true,
	},
	scene: [BasicScene],
	scale: {
		autoCenter: Phaser.Scale.CENTER_BOTH,
		mode: Phaser.Scale.FIT,
		width: GAME_WIDTH,
		height: GAME_HEIGHT,
	},
};

export default new Phaser.Game(config)
