function lerpObj(a, b, t, func) {
	if (Object.hasOwn(a, "x") && Object.hasOwn(a, "y") && Object.hasOwn(b, "x") && Object.hasOwn(b, "y")) {
		return {
			x: func(a.x, b.x, t),
			y: func(a.y, b.y, t),
		};
	} else {
		return func(a, b, t);
	}
}

export function lerp(a, b, t) {
	return lerpObj(a, b, t, (a, b, t) => {
		return ((b - a) * t) + a;
	});
}