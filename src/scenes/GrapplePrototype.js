import { Player } from "../prefabs/Player.js";

export class GrapplePrototype extends Phaser.Scene {
	preload() {
		
	}
	
	create() {
        this.matter.world.setBounds();
		this.player = new Player(this, 100, 400);
		
		this.matter.add.rectangle(300, 50, 500, 50, {isStatic: true});
	}

	update() {
		this.player.update();
	}
}