export function screenToWorldSpace(camera, pos) {
	let displayRes = {x: camera.displayWidth/camera.width, y: camera.displayHeight/camera.height};
	// console.log(displayRes);
	// const debug = {x: (camera.scrollX - camera.width * camera.originX) + pos.x * displayRes.x, y: (camera.scrollY - camera.height * camera.originY) + pos.y * displayRes.y};
	// console.log( pos );

	return {x: (camera.scrollX - camera.width * camera.originX) + pos.x * displayRes.x, y: (camera.scrollY - camera.height * camera.originY) + pos.y * displayRes.y};
}