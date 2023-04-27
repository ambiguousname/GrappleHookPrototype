import {FSM, State} from "../util/FSM.js";

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
		if (newState === GrappleNone) {
			return newState;
		}
		return null;
	}
}

class GrappleFiring extends State {
	#target;
	#fireSensor;

	constructor(_parent = null, ...args) {
		super(_parent);
		this.matter = this.parent.scene.matter;
		this.vector = this.matter.vector;

		this.#target = this.vector.create(args[0], args[1]);
		this.#target = this.vector.sub(this.#target, this.parent.attachBody.position);
		this.#target = this.vector.normalise(this.#target);

		let sensorPos = this.vector.add(this.vector.mult(this.#target, this.parent.attachedOffset), this.parent.attachBody.position);
		this.#fireSensor = this.matter.add.circle(sensorPos.x, sensorPos.y, this.parent.segmentSize * 1.5, {
			isSensor: true,
		});
		
		this.parent.end = this.generateLink(this.#fireSensor.position.x, this.#fireSensor.position.y);
		this.parent.end.isChainEnd = true;
	}

	update() {
		let sensorPos = this.vector.add(this.vector.mult(this.#target, this.parent.attachedOffset), this.parent.attachBody.position);
		this.#fireSensor.position = sensorPos;

		if (this.parent.comp.bodies.length < this.parent.maxLength && this.vector.magnitude(this.parent.end.velocity) > this.parent.stopFiringAtVelocity) {
			if (this.parent.comp.bodies.length > 0 && this.matter.collision.collides(this.parent.comp.bodies[this.parent.comp.bodies.length - 1], this.#fireSensor) === null) {
				this.backFillLink();
			}
		} else {
			this.parent.grapplingFSM.transition(GrappleUnhooked);
		}
	}

	exitState() {
		this.backFillLink();

		let bodyDist = this.vector.sub(this.parent.start.position, this.parent.attachBody.position);
		this.parent.startConstraint = this.matter.add.constraint(this.parent.start, this.parent.attachBody, this.vector.magnitude(bodyDist), this.parent.stiffness);

		this.matter.composite.remove(this.matter.world.engine.world, this.#fireSensor);
		this.#fireSensor = null;
	}

	// #region Helpers

	
	generateLink(x, y) {
		let circle = this.matter.add.circle(x, y, this.parent.segmentSize, {
			isSensor: false,
		});
		this.matter.composite.add(this.parent.comp, circle);

		let fireForce = this.matter.vector.mult(this.#target, this.parent.startingVelocity);

		this.matter.body.applyForce(circle, circle.position, fireForce);

		if (this.parent.comp.bodies.length > 1) {
			let dist = this.vector.magnitude(this.vector.sub(circle, this.#fireSensor.position));
			let constraint = this.matter.add.constraint(this.parent.comp.bodies[this.parent.comp.bodies.length - 2], circle, dist, this.parent.stiffness);
			this.matter.composite.add(this.parent.comp, constraint);
		}

		this.parent.start = circle;

		return circle;
	}

	backFillLink(){
		let previousLinkPos = this.parent.start.position;

		let dist = this.vector.sub(this.#fireSensor.position, previousLinkPos);
		let dir = this.vector.normalise(dist);

		var endDist = this.vector.sub(previousLinkPos, this.#fireSensor.position);
		var i = 1;
		while (this.vector.magnitude(endDist) > this.parent.segmentSize) {
			let totalDist = this.vector.mult(dir, i * 2 * this.parent.segmentSize);
			let newPos = this.vector.add(previousLinkPos, totalDist);
			this.generateLink(newPos.x, newPos.y);

			endDist = this.vector.sub(newPos, this.#fireSensor.position);
			i++;
		}
		return this.parent.start;
	}
	// #endregion
}

class GrappleHooked extends State {
	constructor(_parent = null) {
		super(_parent);
		this.parent.fixToPoint(this.parent.end);
	}

	transitionLogic(newState) {
		if (newState === GrappleNone) {
			return newState;
		}
		return null;
	}
}

export class Grapple {
	// TODO: Add a Phaser.Rope and make it conform to the points in the composite.

	// #region Universal Constants:
	
	// Rope physics:
	stiffness = 0.5;
	segmentSize = 10;

	// Firing:
	startingVelocity = 0.03;
	stopFiringAtVelocity = 1;
	maxLength = 20;
	attachedOffset = 45;

	// #endregion

	// #region Overall behavior
	
	constructor(scene, _attachBody){
		this.scene = scene;
		this.attachBody = _attachBody;

		this.comp = scene.matter.composite.create();

		/*
		Possible states:
		NONE - Grappling hook is not displaying.
		FIRING - Grappling hook is extending until it hits something or runs out of length.
		UNHOOKED - Grappling hook is fired, but unhooked to anything.
		HOOKED - Grappling hook is hooked into something.
		RETRACTING - Grappling hooks is retracting.
		*/
		this.grapplingFSM = new FSM(GrappleNone, this);
		this.fireCollisionCheck = this.scene.matter.world.on("collisionstart", this.firingCollisionCheck, this);
	}

	update() {
		this.grapplingFSM.update();
	}

	// #endregion

	cancel() {
		this.scene.matter.world.off(this.fireCollisionCheck);
		this.fireCollisionCheck = null;
		this.clearFix(this.end);

		if (this.startConstraint !== null && this.startConstraint !== undefined) {
			this.scene.matter.composite.remove(this.scene.matter.world.engine.world, this.startConstraint);
		}

		for (var body in this.comp.bodies) {
			this.scene.matter.composite.remove(this.scene.matter.world.engine.world, this.comp.bodies[body]);
		}
		for (var constraint in this.comp.constraints) {
			this.scene.matter.composite.remove(this.scene.matter.world.engine.world, this.comp.constraints[constraint]);
		}
		this.scene.matter.composite.clear(this.comp, false, true);
		this.grapplingFSM.transition(GrappleNone);
	}

	hasFired() {
		return this.grapplingFSM.activeState instanceof GrappleFiring || this.grapplingFSM.activeState instanceof GrappleUnhooked || this.grapplingFSM.activeState instanceof GrappleHooked;
	}

	// #region Grapple Hook NONE state

	#target;
	#fireSensor;

	fire(x, y) {
		this.grapplingFSM.transition(GrappleFiring, x, y);
	}
	
	// #endregion

	firingCollisionCheck(event, bodyA, bodyB) {
		// TODO: Avoid checking collisions with other grapple circles for stopping firing.
		var currentEnd = null;
		var other = null;
		if (bodyA.isChainEnd) {
			currentEnd = bodyA;
			other = bodyB;
		} else if (bodyB.isChainEnd) {
			currentEnd = bodyB;
			other = bodyA;
		}

		if (currentEnd !== null) {
			let bodyInArr = this.comp.bodies.filter(body => body.id === other.id).length > 0;
			if (!(bodyInArr)) {
				this.grapplingFSM.transition(GrappleHooked);
			}
		}
	}

	// #region Utility Functions

	fixToPoint(body, position) {
		body.fixed = this.scene.matter.add.worldConstraint(body, 0, 1, {
			pointA: new Phaser.Math.Vector2(position.x, position.y),
		});
	}

	fixToPoint(body) {
		body.fixed = this.scene.matter.add.worldConstraint(body, 0, 1, {
				pointA: new Phaser.Math.Vector2(body.position.x, body.position.y),
		});
	}

	clearFix(body) {
		if (body !== null && body !== undefined && body.fixed !== null && body.fixed !== undefined) {
			this.scene.matter.world.removeConstraint(body.fixed);
		}
	}

	// #endregion
}