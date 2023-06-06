import { GrappleHookBase } from "./GrappleHookBase.js";
import { loadFilesAtRuntime } from "../util/loading.js";

export class Underground extends GrappleHookBase {
	constructor() {
        super("UndergroundScene", undefined, "./assets/UndergroundBackground.json", "./assets/Underground_background_Asset_.png", "./assets/Level2Bg.wav", 2.5, "Platforms");
    }
}