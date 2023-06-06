import { GrappleHookBase } from "./GrappleHookBase.js";

export class GrapplePrototype extends GrappleHookBase {
	constructor() {
        super("PlayScene", "UndergroundScene", './assets/CityBackground.json', './assets/Cityasset_.png', "./assets/Level1Bg.wav");
    }
}
