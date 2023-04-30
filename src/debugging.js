import { Grapple } from "./prefabs/Grapple.js";
import { Player } from "./prefabs/Player.js";

let debugSettings = {
	grapple: {
		rope: {
			
		}
	},
}

export function debug() {
	for (let settingCategory in Grapple.gameplaySettings) {
		for (let setting in Grapple.gameplaySettings[settingCategory]){
			let id = document.createElement("p");
			id.innerText = setting;

			let slider = document.createElement("input");
			slider.type = "range";
			slider.min = -100;
			slider.max = 100;
			slider.value = Grapple.gameplaySettings[settingCategory][setting];

			slider.oninput = function(s) {
				Grapple.gameplaySettings[settingCategory][setting] = parseInt(s.target.value);
			}

			id.appendChild(slider);

			document.getElementById("settings").appendChild(id);
		}
	}
}