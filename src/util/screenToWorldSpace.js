export function screenToWorldSpace(camera, pos) {
	let displayRes = {x: camera.displayWidth/camera.width, y: camera.displayHeight/camera.height};
	return {x: camera.worldView.x + pos.x * displayRes.x, y: camera.worldView.y + pos.y * displayRes.y};
}