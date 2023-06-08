/* 
Scene 2 (Level 2) is based on the underground film set
Players will climb through the crumbling film set
still through the angels perspective
*/
import { GrappleHookBase } from "./GrappleHookBase.js";

export class Underground extends GrappleHookBase {
	constructor() {
        super("UndergroundScene", undefined, "./assets/UndergroundBackground.json", "./assets/Underground_background_Asset_.png", "./assets/Level2Bg.wav", 2.5, "Platforms");
    }
}