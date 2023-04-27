import { Grapple } from "./Grapple.js";

export class Player {
	// #region Settings
	
	timeToFire = 1;

	// #endregion

	#fireTimer = 0;
	constructor(scene, x, y) {
		this.icon = scene.matter.add.rectangle(x, y, 50, 50);
		this.grapple = new Grapple(scene, this.icon, new Phaser.Math.Vector2(10, 5));
		this.scene = scene;

		this.scene.input.on("pointerdown", (pointer) => {
			if (pointer.primaryDown) {
				if (this.grapple.hasFired()) {
					this.grapple.cancel();
				} else {
					this.grapple.fire(this.scene.input.mousePointer.x, this.scene.input.mousePointer.y);
				}
			} else if (this.scene.input.mousePointer.buttons === 2) {

			}
		}, this);
	}

	update() {
		this.grapple.update();
	}
}