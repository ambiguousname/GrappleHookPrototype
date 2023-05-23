import { screenToWorldSpace } from "../util/screenToWorldSpace.js";
import { Grapple } from "./Grapple.js";
import { getAllCollisions } from "../util/collision.js";

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
			acceleration: 3,
			jumpAcceleration: 12,
			// Doesn't actually determine max velocity right now. Set by groundDamp and acceleration.
			maxXVelocity: 200,
			// Better than friction:
			groundDamp: 0.8,
		},

		gravity: {
			// How long do we count as "grounded" for after we've left a platform?
			coyoteTime: 1000,
		}
	}

	#groundedBody = null;
	isGrounded = false;

	constructor(scene, x, y) {
		this.scene = scene;
		this.vector = this.scene.matter.vector;

		this.sprite = this.scene.matter.add.image(x, y, "player", null, {
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

		this.body = this.sprite.body;

		// Freeze rotation (looks less weird, and makes friction more useful):
		this.scene.matter.body.setInertia(this.body, Infinity);

		this.grapple = new Grapple(this.scene, this.body);

		this.constructInput();

		this.scene.matter.world.on("collisionactive", this.updatePlayerGrounded, this);
		this.scene.matter.world.on("collisionstart", this.updatePlayerGrounded, this);
		this.scene.matter.world.on("collisionend", getAllCollisions.bind(this, this.endPlayerGrounded), this);
	}

	updatePlayerGrounded(event) {
		for (let i = 0; i < event.pairs.length; i++) {
			let pair = event.pairs[i];
			if (!pair.isActive) {
				continue;
			}
			let bodyA = pair.bodyA;
			let bodyB = pair.bodyB;
			if (bodyA.id === this.body.id || bodyB.id === this.body.id) {
				let up = this.vector.create(0, -1);
				if (bodyB.id === this.body.id) {
					up = this.vector.create(0, 1);
				}
				if (this.vector.dot(pair.collision.normal, up) > 0.9) {
					this.isGrounded = true;
					if (bodyA.id === this.body.id) {
						this.#groundedBody = bodyB.id;
					} else {
						this.#groundedBody = bodyA.id;
					}
				}
			}
		}
	}

	#coyoteTimer = -1;

	endPlayerGrounded(bodyA, bodyB) {
		if ((bodyA.id === this.body.id || bodyB.id === this.body.id) && (this.#groundedBody !== null)) {
			this.#groundedBody = null;
			this.#coyoteTimer = this.scene.time.now;
		}
	}

	constructInput() {
		this.scene.input.on("pointerdown", (pointer) => {
			if (pointer.primaryDown) {
				if (this.grapple.isGrappleHookOut()) {
					this.grapple.cancel();
				}
				let worldSpace = screenToWorldSpace(this.scene.cameras.main, this.scene.input.mousePointer);

				this.grapple.fire(worldSpace.x, worldSpace.y, this.isGrounded, () => {
					this.isGrounded = false;
				});
				this.isGrounded = false;
			}
		}, this);

		this.movementKeys = this.scene.input.keyboard.addKeys("A,D");
		this.retractExtendKeys = this.scene.input.keyboard.addKeys("W, S");

		// Map keys to direction:
		for (let key in this.movementKeys) {
			switch (key) {
				case "A":
					this.movementKeys[key].direction = this.vector.create(-1, 0);
				break;
				case "D":
					this.movementKeys[key].direction = this.vector.create(1, 0);
					break;
				default:
					this.movementKeys[key].direction = this.vector.create(0, 0);
					break;
			}
		}

		for (let key in this.retractExtendKeys) { 
			switch (key) {
				case "W":
					this.retractExtendKeys[key].retractAmount = 1;
					break;
				case "S":
					this.retractExtendKeys[key].retractAmount = -1;
					break;
				default:
					this.retractExtendKeys[key].retractAmount = 0;
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
				intendedMove = this.vector.add(intendedMove, this.vector.mult(key.direction, Player.gameplaySettings.movement.acceleration));
			}
		}

		let newVelocity = this.vector.add(this.body.velocity, intendedMove);

		let retractingHeld = false;
		for (let keyName in this.retractExtendKeys) {
			let key = this.retractExtendKeys[keyName];
			if (key.isDown) {
				this.grapple.retract(key.retractAmount * Grapple.gameplaySettings.retracting.retractSpeed);
				retractingHeld = true;
			}
		}

		if (!retractingHeld && this.grapple.isRetracting()) {
			this.grapple.stopRetract();
		}

		if (this.jump.isDown) {
			// Are we on the ground or attached to a web?
			if (this.grapple.isHooked() || this.isGrounded) {
				this.isGrounded = false;
				this.#groundedBody = null;
				newVelocity = this.vector.add(newVelocity, this.vector.create(0, -Player.gameplaySettings.movement.jumpAcceleration));	
			}
			this.grapple.cancel();
		}

		if (Math.abs(newVelocity.x) > Player.gameplaySettings.movement.maxXVelocity) {
			newVelocity.x = Math.sign(newVelocity.x) * Player.gameplaySettings.movement.maxXVelocity;
		}

		newVelocity.x *= Player.gameplaySettings.movement.groundDamp;

		this.scene.matter.body.setVelocity(this.body, newVelocity);
		// #endregion
	}

	update() {
		this.grapple.update();

		this.movementUpdate();

		if (this.isGrounded && this.#groundedBody === null && this.scene.time.now - this.#coyoteTimer >= Player.gameplaySettings.gravity.coyoteTime) {
			this.isGrounded = false;
			this.#coyoteTimer = -1;
		}

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