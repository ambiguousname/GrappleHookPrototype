/* 
Scene 1 (Level 1) is based on the city of Berlin
Players will travel around the city through
the angels perspective
*/
import { GrappleHookBase } from "./GrappleHookBase.js";

export class GrapplePrototype extends GrappleHookBase {
	constructor() {
        super("PlayScene", "UndergroundScene", './assets/CityBackground.json', './assets/Cityasset_.png', "./assets/Level1Bg.wav");
    }
}
