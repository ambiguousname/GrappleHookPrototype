import { Grapple } from "./Grapple.js";

export class Player {
	static gameplaySettings = {
		body: {
			density: 0.001,
			groundFriction: 0.05,
			staticFriction: 0.05,
			airFriction: 0.01,
		},

		movement: {
			acceleration: 1.1,
			jumpAcceleration: 10,
		}
	}

	constructor(scene, x, y) {
		this.scene = scene;
		this.vector = this.scene.matter.vector;

		this.body = this.scene.matter.add.rectangle(x, y, 40, 40, {
			density: Player.gameplaySettings.body.density,
			friction: Player.gameplaySettings.body.groundFriction,
			frictionStatic: Player.gameplaySettings.body.staticFriction,
			frictionAir: Player.gameplaySettings.body.airFriction,
		});

		this.groundedBody = null;

		// Freeze rotation (looks less weird, and makes friction more useful):
		this.scene.matter.body.setInertia(this.body, Infinity);

		this.grapple = new Grapple(this.scene, this.body, new Phaser.Math.Vector2(10, 5));

		this.constructInput();

		this.scene.matter.world.on("collisionactive", this.updatePlayerGrounded, this);
		this.scene.matter.world.on("collisionend", this.endPlayerGrounded, this);
	}

	updatePlayerGrounded(event, bodyA, bodyB) {
		if (bodyA.id === this.body.id || bodyB.id === this.body.id) {
			for (let i = 0; i < event.pairs.length; i++) {
				let pair = event.pairs[i];
				if (!pair.isActive) {
					continue;
				}
				if (bodyA.id === pair.bodyA.id && bodyB.id === pair.bodyB.id) {
					if (this.vector.dot(pair.collision.normal, this.vector.create(0, 1)) > 0.9) {
						if (bodyA.id === this.body.id) {
							this.groundedBody = bodyB.id;
						} else {
							this.groundedBody = bodyA.id;
						}
					}
				}
			}
		}
	}

	endPlayerGrounded(event, bodyA, bodyB) {
		if ((bodyA.id === this.body.id || bodyB.id === this.body.id) && (this.groundedBody !== null)) {
			this.groundedBody = null;
		}
	}

	constructInput() {
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

		let newVelocity = this.vector.add(this.body.velocity, this.vector.mult(intendedMove, Player.gameplaySettings.movement.acceleration));

		if (this.jump.isDown) {
			// Are we on the ground or attached to a web?
			if (this.grapple.isHooked() || this.groundedBody !== null) {
				this.grapple.cancel();
				newVelocity = this.vector.add(newVelocity, this.vector.create(0, -Player.gameplaySettings.movement.jumpAcceleration));	
			}
		}

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