export class Button extends Phaser.GameObjects.Image {
	constructor(scene, x, y, texture, text, callback) {
		super(scene, x, y, texture);
		scene.add.existing(this);

		this.text = scene.add.text(x, y, text, {
			fontSize: "25px",
			fontFamily: "serif",
		});
		this.text.setOrigin(0.5);

		this.tint = 0xdddddd;

		this.setOrigin(0.5);
		
		this.setInteractive({
			cursor: "pointer"
		});

		this.on("pointerover", () => {
			this.tint = 0xffffff;
		}, this);

		this.on("pointerout", () => {
			this.tint = 0xdddddd;
		}, this);

		this.on("pointerdown", callback, scene);
	}

	
}