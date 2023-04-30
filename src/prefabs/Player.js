import { Grapple } from "./Grapple.js";

export class Player {
	static gameplaySettings = {
		density: 0.001,

		acceleration: 1.1,
		groundFriction: 0.05,
		staticFriction: 0.05,
		airFriction: 0.01,
	}

	constructor(scene, x, y) {
		this.body = scene.matter.add.rectangle(x, y, 40, 40, {
			density: Player.gameplaySettings.density,
			friction: Player.gameplaySettings.groundFriction,
			frictionStatic: Player.gameplaySettings.staticFriction,
			frictionAir: Player.gameplaySettings.airFriction,
		});

		// Freeze rotation (looks less weird, and makes friction more useful):
		scene.matter.body.setInertia(this.body, Infinity);

		this.grapple = new Grapple(scene, this.body, new Phaser.Math.Vector2(10, 5));
		this.scene = scene;

		this.scene.input.on("pointerdown", (pointer) => {
			if (pointer.primaryDown) {
				if (this.grapple.hasFired()) {
					this.grapple.cancel();
				} else {
					this.grapple.fire(this.scene.input.mousePointer.x, this.scene.input.mousePointer.y);
				}
			}
		}, this);

		this.movementKeys = this.scene.input.keyboard.addKeys("W,S,A,D");

		this.vector = this.scene.matter.vector;

		// Map keys to direction:
		for (let key in this.movementKeys) {
			switch (key) {
				case "A":
					this.movementKeys[key].direction = this.vector.create(-1, 0);
				break;
				case "D":
					this.movementKeys[key].direction = this.vector.create(1, 0);
					break;
				case "S":
					this.movementKeys[key].direction = this.vector.create(0, 1);
					break;
				case "W":
				default:
					this.movementKeys[key].direction = this.vector.create(0, 0);
			}
		}

		this.jump = this.scene.input.keyboard.addKey("SPACE");
	}

	movementUpdate() {
		// #region Keyboard Events
		let intendedMove = this.vector.create(0, 0);
		for (let keyName in this.movementKeys) {
			let key = this.movementKeys[keyName];
			if (key.isDown) {
				intendedMove = this.vector.add(intendedMove, key.direction);
			}
		}

		let newVelocity = this.vector.add(this.body.velocity, this.vector.mult(intendedMove, Player.gameplaySettings.acceleration));

		this.scene.matter.body.setVelocity(this.body, newVelocity);
		// #endregion


		// #region Mouse Events
		if (this.scene.input.mousePointer.buttons === 2) {
			this.grapple.startRetracting();
		} else {
			this.grapple.stopRetracting();
		}
		// #endregion
	}

	update() {
		this.grapple.update();

		this.movementUpdate();
	}
}