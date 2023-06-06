import { GrappleHookBase } from "./GrappleHookBase.js";
import { loadFilesAtRuntime } from "../util/loading.js";

export class Underground extends GrappleHookBase {
	constructor() {
        super("UndergroundScene");
    }

    create() {
        super.create();
      
        // Load the tile map and other assets specific to the UndergroundScene
        this.load.tilemapTiledJSON('undergroundMap' , './assets/UndergroundBackground.json');
        this.load.image('underground', './assets/Underground_background_Asset.png');
        // Load in scene 2 background music
        loadFilesAtRuntime(this, {
			"bg2_music": {type: "audio", url: "./assets/Level2Bg.wav"}
		}, () => {
			// play background music
			let music = this.sound.add('bg2_music');
			let musicConfig = {
				mute: 0,
				volume: 0.1,
				loop: true, 
				delay: 0
			};
			music.play(musicConfig);
		});
      
        // Once the assets are loaded, you can proceed with creating the map and other elements
        this.load.on('complete', () => {
          // Create the tile map and layers
          this.drawMap();
      
          // ... Additional setup for the UndergroundScene
        });
      }
      
}