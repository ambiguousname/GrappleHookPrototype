import { Player } from "../prefabs/Player.js";

export class GrapplePrototype extends Phaser.Scene {
	preload() {
		
	}
	
	create() {
        this.matter.world.setBounds();
		this.player = new Player(this, 100, 100);
	}

	update() {
		this.player.update();
	}
}