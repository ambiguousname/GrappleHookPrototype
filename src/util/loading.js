export function setPreload(scene) {
	let loading = scene.add.text(game.config.width/2, game.config.height/2, "Loading 0%", {
		fontFamily: "serif",
		fontSize: "50px",
	});
	loading.setOrigin(0.5);

	scene.load.on("progress", (value) => {
		loading.setText(`Loading ${parseInt(value) * 100}%`);
	});
	scene.load.on("complete", () => {
		loading.destroy();
	});
}