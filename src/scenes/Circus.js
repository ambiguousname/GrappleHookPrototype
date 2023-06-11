/* 
Scene 3 (Level 3) is based on the circus that is 
in town for the season.
Players will climb through the scafolding to
reach their lover, but now we are seeing 
the perspective of a human
*/
import { GrappleHookBase } from "./GrappleHookBase.js";

export class Circus extends GrappleHookBase {
	constructor() {
        super("CircusScene", undefined, "./assets/CircusBackground.json", "./assets/Circus_background_Asset_.png", "./assets/Level2Bg.wav", 0, 2.5, "Platforms");
    }

    init (data) {
        console.log('init', data);
        this.elapsedTime = data.elapsedTime;
    }
}