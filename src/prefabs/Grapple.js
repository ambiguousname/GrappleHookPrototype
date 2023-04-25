export class Grapple {
	// #region Universal Constants:
	
	// Rope physics:
	stiffness = 0.5;
	segmentSize = 10;

	// Firing:
	startingVelocity = 0.05;
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
		this.grapplingMode = "NONE";
	}

	update() {
		switch (this.grapplingMode) {
			case "FIRING":
				this.firingUpdate();
				break;
			default:
				break;
		}
	}

	// #endregion

	// #region Grapple Hook NONE state

	#target;
	#fireSensor;

	fire(x, y) {
		if (this.grapplingMode === "NONE") {
			this.grapplingMode = "FIRING";

			this.#target = this.scene.matter.vector.create(x, y);
			this.#target = this.scene.matter.vector.sub(this.#target, this.attachBody.position);
			this.#target = this.scene.matter.vector.normalise(this.#target);

			let sensorPos = this.scene.matter.vector.add(this.scene.matter.vector.mult(this.#target, this.attachedOffset), this.attachBody.position);
			this.#fireSensor = this.scene.matter.add.circle(sensorPos.x, sensorPos.y, this.segmentSize * 1.5, {
				isSensor: true,
			});
			
			this.end = this.generateLink(this.#fireSensor.position.x, this.#fireSensor.position.y);
		}
	}
	
	// #endregion

	// #region Grapple Hook FIRING state

	firingUpdate(){
		let sensorPos = this.scene.matter.vector.add(this.scene.matter.vector.mult(this.#target, this.attachedOffset), this.attachBody.position);
		this.#fireSensor.position = sensorPos;

		if (this.comp.bodies.length < this.maxLength && this.scene.matter.vector.magnitude(this.end.velocity) > this.stopFiringAtVelocity) {
			if (this.comp.bodies.length > 0 && this.scene.matter.collision.collides(this.comp.bodies[this.comp.bodies.length - 1], this.#fireSensor) === null) {
				this.backFillLink();
			}
		} else {
			this.grapplingMode = "UNHOOKED";
			this.stopFire();
		}
	}

	stopFire() {
		console.log("----");
		this.backFillLink();

		let bodyDist = this.scene.matter.vector.sub(this.start.position, this.attachBody.position);
		this.startConstraint = this.scene.matter.add.constraint(this.start, this.attachBody, this.scene.matter.vector.magnitude(bodyDist), this.stiffness);

		this.scene.matter.world.remove(this.scene.matter.world, this.#fireSensor);
		this.#fireSensor = null;
	}

	generateLink(x, y) {
		let circle = this.scene.matter.add.circle(x, y, this.segmentSize, {
			isSensor: false,
		});
		this.scene.matter.composite.add(this.comp, circle);

		let fireForce = this.scene.matter.vector.mult(this.#target, this.startingVelocity);

		this.scene.matter.body.applyForce(circle, circle.position, fireForce);

		if (this.comp.bodies.length > 1) {
			let dist = this.scene.matter.vector.magnitude(this.scene.matter.vector.sub(circle, this.#fireSensor.position));
			let constraint = this.scene.matter.add.constraint(this.comp.bodies[this.comp.bodies.length - 2], circle, dist, this.stiffness);
			this.scene.matter.composite.add(this.comp, constraint);
		}

		this.start = circle;

		return circle;
	}

	backFillLink(){
		let previousLinkPos = this.start.position;

		let dist = this.scene.matter.vector.sub(this.#fireSensor.position, previousLinkPos);
		let dir = this.scene.matter.vector.normalise(dist);

		var endDist = this.scene.matter.vector.sub(previousLinkPos, this.#fireSensor.position);
		var i = 1;
		while (this.scene.matter.vector.magnitude(endDist) > this.segmentSize) {
			let totalDist = this.scene.matter.vector.mult(dir, i * 2 * this.segmentSize);
			let newPos = this.scene.matter.vector.add(previousLinkPos, totalDist);
			this.generateLink(newPos.x, newPos.y);

			endDist = this.scene.matter.vector.sub(newPos, this.#fireSensor.position);
			i++;
		}
		return this.start;
	}

	// #endregion

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
		this.scene.matter.world.removeConstraint(body.fixed);
	}

	// #endregion
}