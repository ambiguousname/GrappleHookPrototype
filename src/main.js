import * as Scenes from "./scenes/Scenes.js";
import {debug} from "./debugging.js";

window.game = new Phaser.Game({
	type: Phaser.AUTO,
	width: 640,
	height: 480,
	parent: "game",
	scene: [Scenes.GrapplePrototype, Scenes.Menu],
	physics: {
		default: 'matter',
		enableSleeping: true,
        matter: {
            debug: true,
            debugBodyColor: 0xffffff
        }
	},
});

debug();
