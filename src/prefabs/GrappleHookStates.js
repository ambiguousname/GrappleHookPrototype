import {State} from "../util/FSM.js";
import {Grapple} from "./Grapple.js";

export {GrappleNone, GrappleUnhooked, GrappleFiring, GrappleHooked, GrappleRetracting};

// #region Helpers

class GrappleHookManager {

	constructor(_parent = null) {
		super(_parent);
		this.matter = this.parent.scene.matter;
		this.vector = this.matter.vector;
	}

	generateLink(x, y, linkToConnect) {
		let circle = this.matter.add.circle(x, y, Grapple.gameplaySettings.rope.segmentSize, {
			isSensor: false,
		});
		this.matter.composite.add(this.parent.comp, circle);

		if (this.parent.comp.bodies.length > 1) {
			let dist = this.vector.magnitude(this.vector.sub(circle, linkToConnect.position));
			let constraint = this.matter.add.constraint(this.parent.comp.bodies[this.parent.comp.bodies.length - 2], circle, dist, Grapple.gameplaySettings.rope.stiffness);
			this.matter.composite.add(this.parent.comp, constraint);
		}

		this.parent.start = circle;

		return circle;
	}

	// TODO: Need to get this work with firing link
	backFillLink(linkToConnect) {
		let previousLinkPos = this.parent.start.position;

		let dist = this.vector.sub(this.#fireSensor.position, previousLinkPos);
		let dir = this.vector.normalise(dist);

		var endDist = this.vector.sub(previousLinkPos, linkToConnect.position);
		var i = 1;
		while (this.vector.magnitude(endDist) > Grapple.gameplaySettings.rope.segmentSize) {
			let totalDist = this.vector.mult(dir, i * 2 * Grapple.gameplaySettings.rope.segmentSize);
			let newPos = this.vector.add(previousLinkPos, totalDist);
			this.generateLink(newPos.x, newPos.y, linkToConnect);

			endDist = this.vector.sub(newPos, linkToConnect.position);
			i++;
		}
		return this.parent.start;
	}

	retractOne() {
		let compositeConstraint = this.parent.comp.constraints[this.parent.comp.constraints.length - 1];
		let compositeBody = this.parent.start;

		this.matter.composite.remove(this.matter.world.engine.world, this.parent.startConstraint);
		this.matter.composite.remove(this.matter.world.engine.world, compositeConstraint);
		this.matter.composite.remove(this.matter.world.engine.world, compositeBody);

		this.matter.composite.remove(this.parent.comp, compositeBody);
		this.matter.composite.remove(this.parent.comp, compositeConstraint);

		this.parent.start = this.parent.comp.bodies[this.parent.comp.bodies.length - 1];

		this.createStartConstraint()

		// TODO: This is finnicky. Might just replace it with a quick retract.
		if (!this.parent.isHooked()) {
			/*for (var i = this.parent.comp.bodies.length - 1; i >= 0; i--) {
				let store = this.parent.comp.bodies[i].position;
				this.parent.comp.bodies[i].position = oldPos;
				oldPos = store;
			}*/
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
		if (newState === GrappleNone || newState === GrappleHooked) {
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

	constructor(_parent = null, ...args) {
		super(_parent);

		this.#target = this.vector.create(args[0], args[1]);
		this.#target = this.vector.sub(this.#target, this.parent.attachBody.position);
		this.#target = this.vector.normalise(this.#target);

		let sensorPos = this.vector.add(this.vector.mult(this.#target, Grapple.gameplaySettings.firing.attachedOffset), this.parent.attachBody.position);
		this.#fireSensor = this.matter.add.circle(sensorPos.x, sensorPos.y, Grapple.gameplaySettings.rope.segmentSize * 1.5, {
			isSensor: true,
		});
		
		this.parent.end = this.fireGenerateLink(this.#fireSensor.position.x, this.#fireSensor.position.y);
		this.parent.end.isChainEnd = true;

		this.#exiting = false;
		if (2 in args) {
			this.#addVelocityToBody = args[2];
		}
	}

	update() {
		if (this.parent.comp.bodies.length > 0){
			let sensorPos = this.vector.add(this.vector.mult(this.#target, Grapple.gameplaySettings.firing.attachedOffset), this.parent.attachBody.position);
			this.#fireSensor.position = sensorPos;

			if (this.parent.comp.bodies.length < Grapple.gameplaySettings.firing.maxLength && this.vector.magnitude(this.parent.end.velocity) > Grapple.gameplaySettings.firing.stopFiringAtVelocity) {
				if (this.parent.comp.bodies.length > 0 && this.matter.collision.collides(this.parent.comp.bodies[this.parent.comp.bodies.length - 1], this.#fireSensor) === null) {
					this.backFillLink(this.#fireSensor);
				}
			} else {
				this.parent.grapplingFSM.transition(GrappleUnhooked);
			}
		}
	}

	exitState() {
		this.#exiting = true;
		if (this.parent.comp.bodies.length > 0){
			this.backFillLink(this.#fireSensor);

			this.createStartConstraint();
		}

		if (!this.#addVelocityToBody) {
			for (let b in this.parent.comp.bodies) {
				let body = this.parent.comp.bodies[b];
				this.matter.body.setVelocity(body, this.parent.attachBody.velocity);
			}
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
	}

	createStartConstraint() {
		this.parent.startConstraint = this.matter.add.constraint(this.parent.start, this.parent.attachBody, Grapple.gameplaySettings.firing.attachedOffset, Grapple.gameplaySettings.rope.startConstraintStiffness);
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
	}

	update() {
		if (this.parent.comp.bodies.length > 1 && this.time.now - this.#retractTimer > this.#retractSpeed) {
			this.#retractTimer = this.time.now;
			this.retractOne();
		} else if (this.parent.comp.bodies.length === 1 && !this.parent.isHooked()) {
			this.parent.cancel();
		}
	}

	addOne() {

	}

	transitionLogic(newState) {
		if (newState === GrappleNone || (newState === GrappleHooked && this.parent.isHooked())) {
			return newState;
		}
		return null;
	}
}