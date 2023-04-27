export class State {
	constructor(_parent = null, ...args) {
		this.parent = _parent;
	}

	update() {

	}

	transitionLogic(newState = null) {
		return newState;
	}

	exitState() {

	}
}

export class FSM {
	constructor(_activeState = null, _parent) {
		this.parent = _parent;
		this.activeState = new _activeState();
	}

	update() {
		this.activeState.update();
	}

	transition(newState, ...args) {
		let stateToTransition = this.activeState.transitionLogic(newState);
		if (stateToTransition !== null && !(this.activeState instanceof stateToTransition)) {
			this.activeState.exitState();
			this.activeState = new stateToTransition(this.parent, ...args);
		}
	}
}