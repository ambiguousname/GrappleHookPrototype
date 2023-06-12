/* 
Scene 1 (Level 1) is based on the city of Berlin
Players will travel around the city through
the angels perspective
*/
import { GrappleHookBase } from "./GrappleHookBase.js";

export class City extends GrappleHookBase {
	constructor() {
        super("CityScene", "UndergroundScene", './assets/backgrounds/CityBackground.json', './assets/backgrounds/Cityasset_.png', "./assets/audio/Level1Bg.wav");
    }
}
