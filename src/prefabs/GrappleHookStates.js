import {State} from "../util/FSM.js";
import { getAllCollisions } from "../util/collision.js";
import {Grapple} from "./Grapple.js";

export {GrappleNone, GrappleUnhooked, GrappleFiring, GrappleHooked, GrappleRetracting};

// #region Helpers

class GrappleHookManager extends State {

	#lastAdded = null;
	constructor(_parent = null) {
		super(_parent);
		this.matter = this.parent.scene.matter;
		this.vector = this.matter.vector;
	}

	generateLink(x, y, linkToConnect) {
		let circle = this.matter.add.circle(x, y, Grapple.gameplaySettings.rope.segmentSize, {
			isSensor: false,
		});
		circle.next = null;
		circle.prev = null;

		this.matter.composite.add(this.parent.comp, circle);

		if (this.parent.comp.bodies.length > 1) {
			if (this.#lastAdded === null) {
				this.#lastAdded = linkToConnect;
			}
			circle.next = this.#lastAdded;
			circle.next.prev = circle;

			let dist = this.vector.magnitude(this.vector.sub(circle, linkToConnect.position));
			let constraint = this.matter.add.constraint(circle.next, circle, dist, Grapple.gameplaySettings.rope.stiffness);
			this.matter.composite.add(this.parent.comp, constraint);
		}
		this.#lastAdded = circle;

		this.parent.start = circle;

		return circle;
	}

	// TODO: Need to get this work with firing link
	backFillLink(linkToConnect, generateLink=this.generateLink) {
		let previousLinkPos = this.parent.start.position;

		let dist = this.vector.sub(linkToConnect.position, previousLinkPos);
		let dir = this.vector.normalise(dist);

		var endDist = this.vector.sub(previousLinkPos, linkToConnect.position);
		var i = 1;
		while (this.vector.magnitude(endDist) > Grapple.gameplaySettings.rope.segmentSize) {
			let totalDist = this.vector.mult(dir, i * 2 * Grapple.gameplaySettings.rope.segmentSize);
			let newPos = this.vector.add(previousLinkPos, totalDist);
			generateLink.call(this, newPos.x, newPos.y, linkToConnect);

			endDist = this.vector.sub(newPos, linkToConnect.position);
			i++;
		}
		return this.parent.start;
	}

	removeStartConstraint() {
		if (this.parent.startConstraint !== undefined) {
			this.matter.composite.remove(this.matter.world.engine.world, this.parent.startConstraint);
		}
	}

	createStartConstraint() {
		this.parent.startConstraint = this.matter.add.constraint(this.parent.start, this.parent.attachBody, Grapple.gameplaySettings.firing.attachedOffset, Grapple.gameplaySettings.rope.startConstraintStiffness);
	}

	retractOne() {
		if (this.parent.comp.bodies.length <= 1) {
			return;
		}
		let compositeConstraint = this.parent.comp.constraints[this.parent.comp.constraints.length - 1];
		let compositeBody = this.parent.start;
		
		let oldPos = compositeBody.position;
		let oldVel = compositeBody.velocity;

		this.removeStartConstraint();
		this.matter.composite.remove(this.matter.world.engine.world, compositeConstraint);
		this.matter.composite.remove(this.matter.world.engine.world, compositeBody);

		this.matter.composite.remove(this.parent.comp, compositeBody);
		this.matter.composite.remove(this.parent.comp, compositeConstraint);

		this.parent.start = this.parent.start.next;
		this.parent.start.prev = null;

		this.createStartConstraint();

		// TODO: This is finnicky. Might just replace it with a quick retract.
		if (!this.parent.isHooked()) {
			let curr = this.parent.start;
			while (curr !== null) {
				let store = this.vector.clone(curr.position);
				let storeVel = this.vector.clone(curr.velocity);

				this.matter.body.setPosition(curr, oldPos);
				this.matter.body.setVelocity(curr, oldVel);
				
				oldPos = store;
				oldVel = storeVel;

				curr = curr.next;
			}
		}
	}

	generativeAdd() {
		if (this.parent.comp.bodies.length < Grapple.gameplaySettings.firing.maxLength) {
			let currPos = this.vector.clone(this.parent.attachBody.position);
			let startPos = this.vector.clone(this.parent.start.position);

			let dist = this.vector.sub(currPos, startPos);
			dist = this.vector.normalise(dist);
			dist = this.vector.mult(dist, Grapple.gameplaySettings.rope.segmentSize * 2);

			let newBodyPos = this.vector.add(currPos, dist);
			let newLinkPos = this.vector.add(startPos, dist);

			this.removeStartConstraint();
			this.matter.body.setPosition(this.parent.attachBody, newBodyPos);
			this.generateLink(newLinkPos.x, newLinkPos.y, this.parent.start);
			this.createStartConstraint();
		}
	}
}
// #endregion


class GrappleNone extends State {
	transitionLogic(newState) {
		if (newState === GrappleFiring) {
			return newState;
		} else {
			return null;
		}
	}
}

class GrappleUnhooked extends State {
	transitionLogic(newState) {
		if (newState === GrappleNone || newState === GrappleHooked || newState === GrappleRetracting) {
			return newState;
		}
		return null;
	}
}

class GrappleFiring extends GrappleHookManager {
	#target;
	#fireSensor;

	#exiting = false;
	#addVelocityToBody = true;
	#firingEndCallback = null;

	constructor(_parent = null, ...args) {
		super(_parent);

		
		let sfx = this.parent.scene.sound;
		sfx.play("extend");

		this.#target = this.vector.create(args[0], args[1]);
		this.#target = this.vector.sub(this.#target, this.parent.attachBody.position);
		this.#target = this.vector.normalise(this.#target);

		let sensorPos = this.vector.add(this.vector.mult(this.#target, Grapple.gameplaySettings.firing.attachedOffset), this.parent.attachBody.position);
		this.#fireSensor = this.matter.add.circle(sensorPos.x, sensorPos.y, Grapple.gameplaySettings.rope.segmentSize * 1.5, {
			isSensor: true,
		});

		// Doesn't actually work right now for preventing firing through walls, since the offset got changed. Would probably be better to raycast back to the player.
		/*this.fireSensorCollisionCheck = getAllCollisions.bind(this, (bodyA, bodyB) => {
			if (this.#fireSensor === null) {
				return;
			}
			if (bodyA.id === this.#fireSensor.id || bodyB.id === this.#fireSensor.id) {
				if (bodyA.isSensor && bodyB.isSensor) {
					return;
				}
				
				let bodyInArr = this.parent.comp.bodies.filter(body => (body.id === bodyA.id) || (body.id === bodyB.id)).length > 0;
				if (bodyInArr) {
					return;
				}

				// If we've been firing for too long, don't do anything.
				// TODO, better fix: just check for a sensor collision automatically at fire creation??
				if (this.parent.comp.bodies.length > 3) {
					return;
				}

				let pos = new Phaser.Math.Vector2(this.#fireSensor.position.x, this.#fireSensor.position.y);
				console.log(pos, this.parent.attachBody.position);

				if (pos.dot(this.parent.attachBody.position) >= 0.9) {
					return;
				}

				this.parent.cancelNoFSMTransition();
				// Create end and bind to hook:
				this.parent.end = this.generateLink(pos.x, pos.y, pos);
				this.parent.grapplingFSM.transition(GrappleHooked);
			}
		});*/
		// this.matter.world.on("collisionstart", this.fireSensorCollisionCheck);
		
		this.parent.end = this.fireGenerateLink(this.#fireSensor.position.x, this.#fireSensor.position.y);
		this.parent.end.isChainEnd = true;

		this.#exiting = false;
		if (2 in args) {
			this.#addVelocityToBody = args[2];
		}
		if (3 in args) {
			this.#firingEndCallback = args[3];
		}
	}

	transitionLogic(newState) {
		if (newState === GrappleRetracting) {
			return null;
		}
		return newState;
	}

	update() {

		if (this.parent.comp.bodies.length > 0){
			let sensorPos = this.vector.add(this.vector.mult(this.#target, Grapple.gameplaySettings.firing.attachedOffset), this.parent.attachBody.position);
			this.#fireSensor.position = sensorPos;

			if (this.parent.comp.bodies.length < Grapple.gameplaySettings.firing.maxLength && this.vector.magnitude(this.parent.end.velocity) > Grapple.gameplaySettings.firing.stopFiringAtVelocity) {
				if (this.parent.comp.bodies.length > 0 && this.matter.collision.collides(this.parent.start, this.#fireSensor) === null) {
					this.backFillLink(this.#fireSensor, this.fireGenerateLink);
				}
			} else {
				this.parent.grapplingFSM.transition(GrappleUnhooked);
			}
		}
	}

	exitState() {
		this.#exiting = true;

		// this.matter.world.off("collisionstart", this.fireSensorCollisionCheck);
		// this.fireSensorCollisionCheck = null;
		if (this.parent.comp.bodies.length > 0){
			this.backFillLink(this.#fireSensor, this.fireGenerateLink);

			this.createStartConstraint();
		}

		if (!this.#addVelocityToBody) {
			for (let b in this.parent.comp.bodies) {
				let body = this.parent.comp.bodies[b];
				this.matter.body.setVelocity(body, this.parent.attachBody.velocity);
			}
		}
		if (this.#firingEndCallback !== null) {
			this.#firingEndCallback();
		}

		this.matter.composite.remove(this.matter.world.engine.world, this.#fireSensor);
		this.#fireSensor = null;
	}

	// #region Helpers

	fireGenerateLink(x, y) {
		let circle = this.generateLink(x, y, this.#fireSensor);

		let fireForce = this.matter.vector.mult(this.#target, Grapple.gameplaySettings.firing.startingVelocity);

		if (this.#addVelocityToBody || !this.#exiting){
			this.matter.body.applyForce(circle, circle.position, fireForce);
		}
		return circle;
	}
	// #endregion
}

class GrappleHooked extends State {
	constructor(_parent = null) {
		super(_parent);
		if (this.parent.end.fixed === null || this.parent.end.fixed === undefined) {
			this.parent.fixToPoint(this.parent.end);
		}
	}

	transitionLogic(newState) {
		if (newState === GrappleNone || newState === GrappleRetracting) {
			return newState;
		}
		return null;
	}
}

class GrappleRetracting extends GrappleHookManager {
	#retractSpeed;
	#retractTimer;

	constructor(_parent = null, ...args) {
		super(_parent);
		this.matter = this.parent.scene.matter;
		this.time = this.parent.scene.time;

		this.#retractSpeed = args[0];
		this.#retractTimer = 0;

		if (this.#retractSpeed > 0) {
			let sfx = this.parent.scene.sound;
			sfx.play("retract");
		}
	}
	
	updateSpeed(speed) {
		this.#retractSpeed = speed;
	}

	update() {

		if (this.parent.comp.bodies.length >= 1 && this.time.now - this.#retractTimer > Math.abs(this.#retractSpeed)) {
			this.#retractTimer = this.time.now;
			if (this.#retractSpeed > 0) {
				this.retractOne();
			} else if (this.parent.isHooked()) {
				this.generativeAdd();
			}
		} else if (this.parent.comp.bodies.length === 1 && !this.parent.isHooked()) {
			this.parent.cancel();
		}
	}

	transitionLogic(newState) {
		if (newState === GrappleNone || newState === GrappleUnhooked || (newState === GrappleHooked && this.parent.isHooked())) {
			return newState;
		}
		return null;
	}
}