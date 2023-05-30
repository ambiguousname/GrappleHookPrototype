import { Button } from "../util/button.js";

export class Credit extends Phaser.Scene {
    constructor() {
        super("CreditScene");
    }
    preload() {
        // load credit screen
        this.load.image('CreditScreen', './assets/Credit Scene.png');

        let g = this.add.graphics();
        g.fillStyle(0x18202f);
        g.fillRect(0, 0, 100, 50);
        g.generateTexture("button", 100, 50);
        g.destroy();
    }

    create() {
        // credit config
        let title = this.add.sprite(0,0,'CreditScreen');
        title.setOrigin(0,0);

        let menu = new Button(this, game.config.width/3 + 25, game.config.height/2 + 212, "button", "Menu", () => {
            this.scene.start("menuScene");
            this.sound.stopByKey('bg_music');
        });

        // let play = new Button(this, game.config.width/2 + 25, game.config.height/2 + 212, "button", "Play", () => {
        //     this.scene.start("PlayScene");
        // });
        
    }

    update() {
    }
    
}