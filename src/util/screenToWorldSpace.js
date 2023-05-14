export function screenToWorldSpace(camera, pos) {
	let displayRes = {x: camera.displayWidth/camera.width, y: camera.displayHeight/camera.height};
	return {x: (camera.scrollX - camera.width * camera.originX) + pos.x * displayRes.x, y: (camera.scrollY - camera.height * camera.originY) + pos.y * displayRes.y};
}