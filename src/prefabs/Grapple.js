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
		if (newState === GrappleNone || newState === GrappleHooked) {
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

		let sensorPos = this.vector.add(this.vector.mult(this.#target, Grapple.gameplaySettings.firing.attachedOffset), this.parent.attachBody.position);
		this.#fireSensor = this.matter.add.circle(sensorPos.x, sensorPos.y, Grapple.gameplaySettings.rope.segmentSize * 1.5, {
			isSensor: true,
		});
		
		this.parent.end = this.generateLink(this.#fireSensor.position.x, this.#fireSensor.position.y);
		this.parent.end.isChainEnd = true;
	}

	update() {
		if (this.parent.comp.bodies.length > 0){
			let sensorPos = this.vector.add(this.vector.mult(this.#target, Grapple.gameplaySettings.firing.attachedOffset), this.parent.attachBody.position);
			this.#fireSensor.position = sensorPos;

			if (this.parent.comp.bodies.length < Grapple.gameplaySettings.firing.maxLength && this.vector.magnitude(this.parent.end.velocity) > Grapple.gameplaySettings.firing.stopFiringAtVelocity) {
				if (this.parent.comp.bodies.length > 0 && this.matter.collision.collides(this.parent.comp.bodies[this.parent.comp.bodies.length - 1], this.#fireSensor) === null) {
					this.backFillLink();
				}
			} else {
				this.parent.grapplingFSM.transition(GrappleUnhooked);
			}
		}
	}

	exitState() {
		if (this.parent.comp.bodies.length > 0){
			this.backFillLink();

			this.parent.startConstraint = this.matter.add.constraint(this.parent.start, this.parent.attachBody, Grapple.gameplaySettings.firing.attachedOffset, Grapple.gameplaySettings.rope.startConstraintStiffness);
		}

		this.matter.composite.remove(this.matter.world.engine.world, this.#fireSensor);
		this.#fireSensor = null;
	}

	// #region Helpers

	
	generateLink(x, y) {
		let circle = this.matter.add.circle(x, y, Grapple.gameplaySettings.rope.segmentSize, {
			isSensor: false,
		});
		this.matter.composite.add(this.parent.comp, circle);

		let fireForce = this.matter.vector.mult(this.#target, Grapple.gameplaySettings.firing.startingVelocity);

		this.matter.body.applyForce(circle, circle.position, fireForce);

		if (this.parent.comp.bodies.length > 1) {
			let dist = this.vector.magnitude(this.vector.sub(circle, this.#fireSensor.position));
			let constraint = this.matter.add.constraint(this.parent.comp.bodies[this.parent.comp.bodies.length - 2], circle, dist, Grapple.gameplaySettings.rope.stiffness);
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
		while (this.vector.magnitude(endDist) > Grapple.gameplaySettings.rope.segmentSize) {
			let totalDist = this.vector.mult(dir, i * 2 * Grapple.gameplaySettings.rope.segmentSize);
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

class GrappleRetracting extends State {
	#retractTimer;
	constructor(_parent = null) {
		super(_parent);
		this.matter = this.parent.scene.matter;
		this.time = this.parent.scene.time;

		this.#retractTimer = 0;
	}

	update() {
		if (this.parent.comp.bodies.length > 1 && this.time.now - this.#retractTimer > Grapple.gameplaySettings.retracting.retractSpeed) {
			this.#retractTimer = this.time.now;
			this.retractOne();
		} else if (this.parent.comp.bodies.length === 1 && !this.parent.isHooked()) {
			this.parent.cancel();
		}
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

		this.parent.startConstraint = this.matter.add.constraint(this.parent.start, this.parent.attachBody, Grapple.gameplaySettings.firing.attachedOffset, Grapple.gameplaySettings.rope.startConstraintStiffness);

		// TODO: This is finnicky. Might just replace it with a quick retract.
		if (!this.parent.isHooked()) {
			/*for (var i = this.parent.comp.bodies.length - 1; i >= 0; i--) {
				let store = this.parent.comp.bodies[i].position;
				this.parent.comp.bodies[i].position = oldPos;
				oldPos = store;
			}*/
		}
	}

	transitionLogic(newState) {
		if (newState === GrappleNone || (newState === GrappleHooked && this.parent.isHooked())) {
			return newState;
		}
		return null;
	}
}

export class Grapple {
	// TODO: Add a Phaser.Rope and make it conform to the points in the composite.
	
	// Rope physics:
	static gameplaySettings = {
		rope: {
			stiffness: 0.5,
			startConstraintStiffness: 0.5,
			segmentSize: 10,
		},

		firing: {
			startingVelocity: 0.03,
			stopFiringAtVelocity: 1,
			maxLength: 20,
			attachedOffset: 45,
		},
		
		retracting: {
			retractSpeed: 20,
		}
	}

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

	// #region Public Methods
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

		this.end = null;
		this.start = null;

		this.grapplingFSM.transition(GrappleNone);
	}

	hasFired() {
		return this.grapplingFSM.activeState instanceof GrappleFiring || this.grapplingFSM.activeState instanceof GrappleUnhooked || this.grapplingFSM.activeState instanceof GrappleHooked;
	}

	isHooked() {
		return this.end !== undefined && this.end !== null && this.end.fixed !== undefined && this.end.fixed !== null;
	}

	startRetracting() {
		this.grapplingFSM.transition(GrappleRetracting);
	}

	stopRetracting() {
		if (this.isHooked() && this.grapplingFSM.activeState instanceof GrappleRetracting) {
			this.grapplingFSM.transition(GrappleHooked);
		}
	}

	// #endregion

	// #region Grapple Hook NONE state

	#target;
	#fireSensor;

	fire(x, y) {
		this.grapplingFSM.transition(GrappleFiring, x, y);
	}
	
	// #endregion

	firingCollisionCheck(event, bodyA, bodyB) {
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
			if (!(bodyInArr) && other.id !== this.attachBody.id && !other.isSensor) {
				this.grapplingFSM.transition(GrappleHooked);
			}
		}
	}

	// #region Utility Functions

	fixToPoint(body, position) {
		if (body.fixed !== null) {
			this.clearFix(body);
		}
		body.fixed = this.scene.matter.add.worldConstraint(body, 0, 0, {
			pointA: new Phaser.Math.Vector2(position.x, position.y),
		});
	}

	fixToPoint(body) {
		if (body.fixed !== null) {
			this.clearFix(body);
		}
		body.fixed = this.scene.matter.add.worldConstraint(body, 0, 0, {
				pointA: new Phaser.Math.Vector2(body.position.x, body.position.y),
		});
	}

	clearFix(body) {
		if (body !== null && body !== undefined && body.fixed !== null && body.fixed !== undefined) {
			this.scene.matter.world.removeConstraint(body.fixed);
			body.fixed = null;
		}
	}

	// #endregion
}