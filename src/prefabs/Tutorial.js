const keyTest = /^(\w+?)_/;

export class TutorialManager  {
	static tutorialsShown = new Set();
	static keysToShow = new Set(["W_Key_Dark", "A_Key_Dark", "S_Key_Dark", "D_Key_Dark", "Space_Key_Dark"]);
	static imagesToUpdate = new Set();

	static preload(scene){
		this.keysToShow.forEach((key) => {
			scene.load.image(key, `./assets/keys/${key}.png`);
		});
	}

	static async imageFadeOut(img) {
		img.alpha -= 0.05;
		if (img.alpha <= 0) {
			img.destroy();
		} else {
			requestAnimationFrame(this.imageFadeOut.bind(this, img));
		}
	}

	static addImage(scene, getSpritePos, key, kwargs = {}) {
		let pos = getSpritePos();

		let offset = Phaser.Math.Vector2.ZERO;
		if ("offset" in kwargs) {
			offset = kwargs["offset"];
		}

		let img = scene.add.image(pos.x + offset.x, pos.y + offset.y, key);
		img.track = getSpritePos;
		img.trackOffset = offset;
		img.on("destroy", () => {
			this.imagesToUpdate.delete(img);
		});

		let allowPress = null;
		if ("allowPress" in kwargs) {
			allowPress = kwargs["allowPress"];
		}

		let keyName = keyTest.exec(key)[1];
		scene.input.keyboard.on(`keydown-${keyName.toUpperCase()}`, () => {
			if (allowPress === null || allowPress()) {
				requestAnimationFrame(this.imageFadeOut.bind(this, img));
			}
		}, this);
		this.imagesToUpdate.add(img);
		this.tutorialsShown.add(key);
	}

	static update(scene) {
		let player = scene.player;
		let grapple = player.grapple;
		if (!this.tutorialsShown.has("A_Key_Dark")){
			this.addImage(scene, () => {return player.body.position}, "A_Key_Dark", {offset: new Phaser.Math.Vector2(-80, 0)});
		}
		if (!this.tutorialsShown.has("D_Key_Dark")) {
			this.addImage(scene, () => {return player.body.position}, "D_Key_Dark", {offset: new Phaser.Math.Vector2(80, 0)});
		}
		if (!this.tutorialsShown.has("W_Key_Dark")) {
			this.addImage(scene, () => {if (grapple.end === null) {return {x: -20, y: -20}} else { return grapple.end.position}}, "W_Key_Dark", {
				allowPress: () => {return grapple.isGrappleHookOut()}
			});
		}
		if (!this.tutorialsShown.has("S_Key_Dark")) {
			this.addImage(scene, ()=>{if (grapple.end === null) {return {x: -20, y: -20}} else { return player.body.position}}, "S_Key_Dark", {
				allowPress: () => {return grapple.isGrappleHookOut()}
			});
		}
		if (!this.tutorialsShown.has("Space_Key_Dark") && this.tutorialsShown.size >= this.keysToShow.size - 1 && this.imagesToUpdate.size === 0) {
			this.addImage(scene, (img)=> {if (grapple.end === null && (img === null || img.alpha === 1)) {return {x: -20, y: -20}} else { return player.body.position}}, "Space_Key_Dark", {
				allowPress: () => {return grapple.isGrappleHookOut()}
			});
		}

		this.imagesToUpdate.forEach((img) => {
			let pos = img.track(img);
			img.setPosition(pos.x + img.trackOffset.x, pos.y + img.trackOffset.y);
		});
	}
}