import {FSM} from "../util/FSM.js";
import * as GrappleHookStates from "./GrappleHookStates.js";

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
		this.grapplingFSM = new FSM(GrappleHookStates.GrappleNone, this);
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

		this.grapplingFSM.transition(GrappleHookStates.GrappleNone);
	}

	hasFired() {
		return this.grapplingFSM.activeState instanceof GrappleHookStates.GrappleFiring || this.grapplingFSM.activeState instanceof GrappleHookStates.GrappleUnhooked || this.grapplingFSM.activeState instanceof GrappleHookStates.GrappleHooked;
	}

	isHooked() {
		return this.end !== undefined && this.end !== null && this.end.fixed !== undefined && this.end.fixed !== null;
	}

	retract(speed) {
		this.grapplingFSM.transition(GrappleHookStates.GrappleRetracting, speed);
	}

	// #endregion

	fire(x, y, addVelocity=true) {
		this.grapplingFSM.transition(GrappleHookStates.GrappleFiring, x, y, addVelocity);
	}

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
				this.grapplingFSM.transition(GrappleHookStates.GrappleHooked);
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