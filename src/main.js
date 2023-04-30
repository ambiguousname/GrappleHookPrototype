import * as Scenes from "./scenes/Scenes.js";

window.game = new Phaser.Game({
	type: Phaser.AUTO,
	width: 640,
	height: 480,
	scene: [Scenes.GrapplePrototype],
	physics: {
		default: 'matter',
		enableSleeping: true,
        matter: {
            debug: true,
            debugBodyColor: 0xffffff
        }
	},
});