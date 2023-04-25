import { Grapple } from "./Grapple.js";

export class Player {
	constructor(scene, x, y) {
		this.icon = scene.matter.add.rectangle(x, y, 50, 50);
		this.grapple = new Grapple(scene, this.icon, new Phaser.Math.Vector2(10, 5));
		this.scene = scene;
	}

	update() {
		this.grapple.update();

		if (this.scene.input.mousePointer.isDown) {
			this.grapple.fire(this.scene.input.mousePointer.x, this.scene.input.mousePointer.y);
		}
	}
}