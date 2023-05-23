// Set up as a callback with getAllCollisions.bind(this, callback);
export function getAllCollisions(callback, event){
	for (let i = 0; i < event.pairs.length; i++) {
		let pair = event.pairs[i];
		callback.call(this, pair.bodyA, pair.bodyB);
	}
}