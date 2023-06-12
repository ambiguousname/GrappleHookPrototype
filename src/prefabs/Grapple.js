import {FSM} from "../util/FSM.js";
import { getAllCollisions } from "../util/collision.js";
import { lerp } from "../util/lerp.js";
import * as GrappleHookStates from "./GrappleHookStates.js";

// Control the grappling hook functionality
export class Grapple {
	// TODO: Add a Phaser.Rope and make it conform to the points in the composite.
	
	// Rope physics:
	static gameplaySettings = {
		rope: {
			stiffness: 0.5,
			startConstraintStiffness: 0.5,
			segmentSize: 10,
			interpolationAmount: 20,
		},

		firing: {
			startingVelocity: 0.03,
			stopFiringAtVelocity: 1,
			maxLength: 20,
			attachedOffset: 60,
			fireDelay: 500,
		},
		
		retracting: {
			retractSpeed: 20,
		}
	}

	#fireTimer;

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
		// See GrappleHookStates.js for the full list
		this.grapplingFSM = new FSM(GrappleHookStates.GrappleNone, this);
		this.fireCollisionCheck = getAllCollisions.bind(this, this.firingCollisionCheck);
		this.scene.matter.world.on("collisionstart", this.fireCollisionCheck);

		
		this.ropeShader = this.scene.add.shader("rope", 0, 0, Grapple.gameplaySettings.rope.segmentSize, Grapple.gameplaySettings.firing.maxLength * (Grapple.gameplaySettings.rope.interpolationAmount + 1));
		this.ropeShader.setRenderToTexture("ropeShaderTexture");

		// Used in this.drawRope
		// Set to vertical alignment for rope:
		this.rope = this.scene.add.rope(0, 0, "ropeShaderTexture", null, Grapple.gameplaySettings.firing.maxLength * (Grapple.gameplaySettings.rope.interpolationAmount + 1), false);

		this.grappleEnd = this.scene.add.image(0, 0, "hook");
		this.grappleEnd.setOrigin(0.5, 1);

		this.#hideGrapple();

		this.#fireTimer = 0;
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

	// The grapple hook is generated using Matter.JS, and actually rendering it to Phaser requires making use of Phaser's ropes:
	drawRope() {
		let arr = [this.attachBody.position];

		let colors = [0xaaaaaa];
		let a = 1;

		let curr = this.start;
		let prevPosition = this.attachBody.position;
		while (curr !== null) {
			// Interpolate for greater shader resolution:
			for (let i = 1; i < Grapple.gameplaySettings.rope.interpolationAmount; i++) {
				arr.push(lerp(curr.position, prevPosition, i/Grapple.gameplaySettings.rope.interpolationAmount));
				colors.push(a * 0xffffff + (1 - a) * 0xaaaaaa);
				a = (a + 1) % 2;
			}

			arr.push(curr.position);

			colors.push(a * 0xffffff + (1 - a) * 0xaaaaaa);
			a = (a + 1) % 2;

			prevPosition = curr.position;
			curr = curr.next;
		}

		// Attach to the end grappling hook sprite
		if (this.grappleEnd.texture.key === "hook") {
			this.grappleEnd.setPosition(this.end.position.x, this.end.position.y);

			let prev = null; //this.end.prev;
			if (prev === null) {
				prev = this.attachBody;
			}
			this.grappleEnd.setRotation(Phaser.Math.Angle.Between(this.end.position.x, this.end.position.y, prev.position.x, prev.position.y) - Math.PI/2);
		} else if (this.grappleEnd.texture.key === "hook_hooked" && this.grappleEnd.visible) {
			arr.push({x: this.grappleEnd.x, y: this.grappleEnd.y});
			colors.push(a * 0xffffff + (1 - a) * 0xaaaaaa);
		}
		
		this.rope.setPoints(arr);
		this.rope.setColors(colors);

	}

	// #endregion

	// #region Public Methods

	// Cancel the hook by removing all the bodies from it, but don't ACTUALLY switch the state of it.
	// This was used to try and fix an earlier bug, but now it's just sort of a holdover.
	cancelNoFSMTransition() {
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
	}

	cancel() {
		this.cancelNoFSMTransition();

		this.#hideGrapple();
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
		if (this.scene.time.now - this.#fireTimer > Grapple.gameplaySettings.firing.fireDelay) {
			this.#fireTimer = this.scene.time.now;
			this.#showGrapple();
			this.grapplingFSM.transition(GrappleHookStates.GrappleFiring, x, y, addVelocity, callback);
		}
	}

	// Are we going to hook into something? Is it anything but something from the grappling hook chain?
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