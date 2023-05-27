import { loadFilesAtRuntime } from "../util/loading.js";

export class Menu extends Phaser.Scene {
    constructor() {
        super("menuScene");
    }

    preload() {
        
        // load title screen
        this.load.image('TitleScreen', './assets/Game_Cover_.png');
    }

    create() {
        // title config
        let title = this.add.sprite(0,0,'TitleScreen');
        title.setOrigin(0,0);

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

        
        this.space = this.input.keyboard.addKey("SPACE");
        this.keyA = this.input.keyboard.addKey("A");
    }

    update() {
        if(this.space.isDown) {
            this.sound.stopByKey('bg_music');
            this.scene.start("PlayScene");
        }
        if(this.keyA.isDown) {
            this.scene.start("CreditScene");
        }
    }
    
}