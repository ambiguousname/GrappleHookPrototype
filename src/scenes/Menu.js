/* 
Main menu screen where players will have the 
option to start the game or go to credits.
*/
import { Button } from "../util/button.js";
import { loadFilesAtRuntime } from "../util/loading.js";

export class Menu extends Phaser.Scene {
    constructor() {
        super("menuScene");
    }

    preload() {
        
        // load title screen
        this.load.image('TitleScreen', './assets/Game_Cover_.png');

        let g = this.add.graphics();
        g.fillStyle(0x18202f);
        g.fillRect(0, 0, 100, 50);
        g.generateTexture("button", 100, 50);
        g.destroy();
    }

    create() {
        // Set cursor to default arrow
        this.input.setDefaultCursor('default');
        // title config
        let title = this.add.sprite(0,0,'TitleScreen');
        title.setOrigin(0,0);

        let b = new Button(this, game.config.width/2, game.config.height/2 + 75, "button", "Play", () => {
            window.cursorFire = this.input.mousePointer;
            this.scene.start("PlayScene", { elapsedTime: 0 });
            this.sound.stopByKey('bg_music');
        });

        let credits = new Button(this, game.config.width/2, game.config.height/2 + 150, "button", "Credits", () => {
            this.scene.start("CreditScene");
        });

        // load audio
        loadFilesAtRuntime(this, {
            "bg_music": {type: "audio", url: "./assets/IntroSampPiano.wav"}
        }, () => {
            let music = this.sound.add('bg_music');
            let musicConfig = {
                mute: 0,
                volume: 0.4,
                loop: true, 
                delay: 0
            }
            music.play(musicConfig);
        });

        
        // this.space = this.input.keyboard.addKey("SPACE");
        // this.keyA = this.input.keyboard.addKey("A");
    }

    update() {
    }
    
}