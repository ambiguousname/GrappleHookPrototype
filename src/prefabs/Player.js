import { screenToWorldSpace } from "../util/screenToWorldSpace.js";
import { Grapple } from "./Grapple.js";

export class Player {
	static gameplaySettings = {
		body: {
			density: 0.001,
			groundFriction: 0,
			staticFriction: 0,
			airFriction: 0.01,
			// Might want to set this to be part of a different body or something? Leads to weird impacts with ground.
			restitution: 0.3,
			// Rounding just in case? Seems to be fixed with no friction though.
			chamferRadius: 0,
		},

		movement: {
			// How much acceleration you get from the ground (does not include W):
			acceleration: 1,
			// How much acceleration being attached to a rope gives (only for W):
			attachedUpAcceleration: 0.5,
			jumpAcceleration: 10,
			maxXVelocity: 200,
			// Better than friction:
			groundDamp: 0.95,
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
			// Prevent wall stick:
			restitution: Player.gameplaySettings.body.restitution,
			chamfer: {
				radius: Player.gameplaySettings.body.chamferRadius,
			},
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
					/*let otherBody = bodyB;
					if (otherBody.id === this.body.id) {
						otherBody = bodyA;
					}*/
					if (this.vector.dot(pair.collision.normal, this.vector.create(0, -1)) > 0.9) {
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
					let worldSpace = screenToWorldSpace(this.scene.cameras.main, this.scene.input.mousePointer);
					this.grapple.fire(worldSpace.x, worldSpace.y, this.groundedBody !== null);
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
					this.movementKeys[key].direction = this.vector.create(0, -1);
					break;
				default:
					this.movementKeys[key].direction = this.vector.create(0, 0);
					break;
			}
		}

		this.jump = this.scene.input.keyboard.addKey("SPACE");
	}

	movementUpdate() {
		// #region Keyboard Events
		let intendedMove = this.vector.create(0, 0);
		for (let keyName in this.movementKeys) {
			let key = this.movementKeys[keyName];
			// Exclude W unless the grapple is hooked.
			if (key.isDown && !(!this.grapple.isHooked() && keyName === "W")) {
				let accel = Player.gameplaySettings.movement.acceleration;
				if (this.grapple.isHooked() && keyName === "W") {
					accel = Player.gameplaySettings.movement.attachedUpAcceleration;
				}
				intendedMove = this.vector.add(intendedMove, this.vector.mult(key.direction, accel));
			}
		}

		let newVelocity = this.vector.add(this.body.velocity, intendedMove);

		if (this.jump.isDown) {
			// Are we on the ground or attached to a web?
			if (this.grapple.isHooked() || this.groundedBody !== null) {
				this.grapple.cancel();
				newVelocity = this.vector.add(newVelocity, this.vector.create(0, -Player.gameplaySettings.movement.jumpAcceleration));	
			}
		}

		if (Math.abs(newVelocity.x) > Player.gameplaySettings.movement.maxXVelocity) {
			newVelocity.x = Math.sign(newVelocity.x) * Player.gameplaySettings.movement.maxXVelocity;
		}

		newVelocity.x *= Player.gameplaySettings.movement.groundDamp;

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

		if (window.debugging) {
			this.updateProperties();
		}
	}

	updateProperties() {
		for (let setting in Player.gameplaySettings.body) {
			let value = Player.gameplaySettings.body[setting];
			switch (setting) {
				case "density":
					this.scene.matter.body.setDensity(this.body, value);
					break;
				case "groundFriction":
					this.body.friction = value;
					break;
				case "staticFriction":
					this.body.frictionStatic = value;
					break;
				case "airFriction":
					this.body.frictionAir = value;
					break;
				case "restitution":
					this.body.restitution = value;
					break;
			}	
		}
	}
}