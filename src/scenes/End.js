/* 
Scene 3 (Level 3) is based on the circus that is 
in town for the season.
Players will climb through the scafolding to
reach their lover, but now we are seeing 
the perspective of a human
*/
import { loadFilesAtRuntime } from "../util/loading.js";
import { Button } from "../util/button.js";

export class End extends Phaser.Scene {
	constructor() {
        super("EndScene");
    }

    preload() {
        this.load.image('EndScreen', './assets/Ending.png');

        let g = this.add.graphics();
        g.fillStyle(0x18202f);
        g.fillRect(0, 0, 100, 50);
        g.generateTexture("button", 100, 50);
        g.destroy();
    }

    init (data) {
        console.log('init', data);
        this.elapsedTime = data.elapsedTime;
    }

    create() {
        // Set cursor to default arrow
        this.input.setDefaultCursor('default');
        // Screen config
        let screen = this.add.sprite(0,0,'EndScreen');
        screen.setOrigin(0,0);
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

        // Sisplay final time in minutes and seconds
        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = this.elapsedTime % 60;

        let TimeConfig = {
            fontFamily: 'Palatino',
            fontSize: '28px',
            color: '#c9c5b7',
            align: 'center',
            padding: {
            top: 5,
            bottom: 5,
            },
            fixedWidth: 200
        };

        this.add.text(game.config.width / 2, game.config.height / 2 + 100, `${minutes} minutes ${seconds} seconds`, TimeConfig).setOrigin(0.5);

        // Button to take you to menu
        let menu = new Button(this, game.config.width/3 + 30, game.config.height/2 + 212, "button", "Menu", () => {
            this.scene.start("menuScene");
            this.sound.stopByKey('bg_music');
        });
        // Button to take you to credits
        let credits = new Button(this, game.config.width/2 + 30, game.config.height/2 + 212, "button", "Credits", () => {
            window.cursorFire = this.input.mousePointer;
            this.scene.start("CreditScene");
        });
    }
}