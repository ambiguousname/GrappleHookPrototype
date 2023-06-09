/* 
Scene 2 (Level 2) is based on the underground film set
Players will climb through the crumbling film set
still through the angels perspective
*/
import { GrappleHookBase } from "./GrappleHookBase.js";

export class Underground extends GrappleHookBase {
	constructor() {
        super("UndergroundScene", "CircusScene", "./assets/backgrounds/UndergroundBackground.json", "./assets/backgrounds/Underground_background_Asset_.png", "./assets/audio/Level2Bg.wav", 0, 2.5, "Platforms", 0.6);
    }

    init (data) {
        console.log('init', data);
        this.elapsedTime = data.elapsedTime;
    }
}