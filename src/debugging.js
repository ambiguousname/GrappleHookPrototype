import { Grapple } from "./prefabs/Grapple.js";
import { Player } from "./prefabs/Player.js";

let debugSettings = {
	grapple: {
		rope: {
			stiffness: [0, 100, 0.01],
			startConstraintStiffness: [0, 100, 0.01],
			segmentSize: [1, 100, 1],
		},

		firing: {
			startingVelocity: [0, 100, 0.01],
			stopFiringAtVelocity: [0, 1000, 0.1],
			maxLength: [1, 30, 1],
			attachedOffset: [1, 100, 1],
		},

		retracting: {
			retractSpeed: [1, 500, 0.1],
		},
	},

	player: {
		body: {
			density: [1, 100, 0.001],
			groundFriction: [0, 1000, 0.001],
			staticFriction: [0, 1000, 0.001],
			airFriction: [0, 1000, 0.001],
			restitution: [0, 100, 0.01],
			chamferRadius: null,
		},

		movement: {
			acceleration: [1, 1000, 0.01],
			jumpAcceleration: [1, 10000, 0.01],
			maxXVelocity: [1, 1000, 1],
			groundDamp: [0, 100, 0.01],
		}
	}
}

function debugGameplaySettings(gameplaySettings, debugSettingName) {
	let bigDiv = document.createElement("div");
	bigDiv.style.paddingRight = "1%";
	bigDiv.style.width = "50%";
	bigDiv.innerHTML += `<h1 style="color: red; padding-right: 5%; ">${debugSettingName}</h1>`;
	for (let settingCategory in gameplaySettings) {
		let div = document.createElement("div");
		div.style.paddingRight = "1%";
		div.style.display = "inline-grid";
		div.innerHTML += `<h2>${settingCategory}</h2>`;
		for (let setting in gameplaySettings[settingCategory]){
			if (setting in debugSettings[debugSettingName][settingCategory] && debugSettings[debugSettingName][settingCategory][setting] === null) {
				continue;
			}
			let id = document.createElement("div");
			id.style.display = "inline";

			let slider = document.createElement("input");
			slider.type = "range";
			slider.min = -100;
			slider.max = 100;
			let potentialValue = gameplaySettings[settingCategory][setting];
			id.innerHTML = `<p>${setting} - <span id="${setting}Val">${potentialValue}</span></p>`;

			if (setting in debugSettings[debugSettingName][settingCategory]) {
				let settingOptions = debugSettings[debugSettingName][settingCategory][setting];
				slider.min = settingOptions[0];
				slider.max = settingOptions[1];
				potentialValue /= settingOptions[2];
			}
			slider.value = potentialValue;

			slider.oninput = function(s) {
				let val = parseInt(s.target.value);
				let graphicsVal = val.toString();
				if (setting in debugSettings[debugSettingName][settingCategory]) {
					let scale = debugSettings[debugSettingName][settingCategory][setting][2];
					val *= scale;
					graphicsVal = val.toString();
					// Futzy decimal point display:
					if (graphicsVal.indexOf(".") >= 0 && graphicsVal.length - graphicsVal.indexOf(".") > scale.toString().length + 1) {
						graphicsVal = graphicsVal.slice(0, scale.toString().length - (scale.toString().indexOf(".") - 2));
					}
				}
				gameplaySettings[settingCategory][setting] = val;
				
				document.getElementById(setting + "Val").innerText = graphicsVal;
			}

			id.appendChild(slider);

			div.appendChild(id);
		}
		bigDiv.appendChild(div);
	}
	document.getElementById("settings").appendChild(bigDiv);
}

export function debug() {
	debugGameplaySettings(Grapple.gameplaySettings, "grapple");
	debugGameplaySettings(Player.gameplaySettings, "player");
	window.debugging = true;
}