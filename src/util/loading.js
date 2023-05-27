// For reasons I cannot discern (something to do with frame rendering), you can't use both THIS and loadFilesAtRuntime in the same scene. So pick one, but not the other.
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

export function loadFilesAtRuntime(scene, filesObj, callback) {
	for (let key in filesObj) {
		let fileToLoad = filesObj[key];
		
		scene.load[fileToLoad.type](key, fileToLoad.url);
	}
	scene.load.once("complete", callback);
	scene.load.start();
}