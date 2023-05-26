import {FSM} from "../util/FSM.js";
import { getAllCollisions } from "../util/collision.js";
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
		this.fireCollisionCheck = getAllCollisions.bind(this, this.firingCollisionCheck);
		this.scene.matter.world.on("collisionstart", this.fireCollisionCheck);

		// Set to vertical alignment for rope:
		this.rope = this.scene.add.rope(0, 0, "rope", null, Grapple.gameplaySettings.firing.maxLength, false);
		this.grappleEnd = this.scene.add.image(0, 0, "hook");
		this.grappleEnd.setOrigin(0.5, 1);

		this.#hideGrapple();
	}

	update() {
		this.grapplingFSM.update();
		
		if (this.start !== undefined && this.start !== null) {
			this.drawRope();
		}
	}

	#hideGrapple() {
		this.rope.visible = false;
		this.grappleEnd.visible = false;
	}

	#showGrapple() {
		this.rope.visible = true;
		this.grappleEnd.visible = true;
		this.grappleEnd.setTexture("hook");
	}

	drawRope() {
		let arr = [this.attachBody.position];
		let curr = this.start;
		while (curr !== null) {
			arr.push(curr.position);

			curr = curr.next;
		}

		if (this.grappleEnd.texture.key === "hook") {
			this.grappleEnd.setPosition(this.end.position.x, this.end.position.y);

			let prev = null; //this.end.prev;
			if (prev === null) {
				prev = this.attachBody;
			}
			this.grappleEnd.setRotation(Phaser.Math.Angle.Between(this.end.position.x, this.end.position.y, prev.position.x, prev.position.y) - Math.PI/2);
		} else if (this.grappleEnd.texture.key === "hook_hooked" && this.grappleEnd.visible) {
			arr.push({x: this.grappleEnd.x, y: this.grappleEnd.y});
		}
		
		this.rope.setPoints(arr);
	}

	// #endregion

	// #region Public Methods
	cancel() {
		this.fireCollisionCheck = null;
		this.clearFix(this.end);

		this.#hideGrapple();

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

	isGrappleHookOut() {
		return !(this.grapplingFSM.activeState instanceof GrappleHookStates.GrappleNone);
	}

	retractHasFired() {
		return !(this.#prevRetractState instanceof GrappleHookStates.GrappleFiring);
	}

	isHooked() {
		return this.end !== undefined && this.end !== null && this.end.fixed !== undefined && this.end.fixed !== null;
	}

	isRetracting() {
		return this.grapplingFSM.activeState instanceof GrappleHookStates.GrappleRetracting;
	}

	isMaxLength() {
		return this.comp.bodies.length >= Grapple.gameplaySettings.firing.maxLength;
	}

	#prevRetractState = null;
	retract(speed) {
		if (this.isRetracting()) {
			this.grapplingFSM.activeState.updateSpeed(speed);
		} else {
			this.#prevRetractState = this.grapplingFSM.activeState.constructor;
			if (this.#prevRetractState instanceof GrappleHookStates.GrappleFiring) {
				this.#prevRetractState = GrappleHookStates.GrappleUnhooked;
			}

			this.grapplingFSM.transition(GrappleHookStates.GrappleRetracting, speed);
		}
	}

	stopRetract() {
		if (this.grapplingFSM.activeState instanceof GrappleHookStates.GrappleRetracting) {
			this.grapplingFSM.transition(this.#prevRetractState);
		}
	}

	// #endregion

	fire(x, y, addVelocity=true, callback=null) {
		this.#showGrapple();
		this.grapplingFSM.transition(GrappleHookStates.GrappleFiring, x, y, addVelocity, callback);
	}

	firingCollisionCheck(bodyA, bodyB) {
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
				this.grappleEnd.setTexture("hook_hooked");
				this.grappleEnd.setPosition(this.end.position.x, this.end.position.y);
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