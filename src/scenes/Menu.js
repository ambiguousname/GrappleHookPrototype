export class Menu extends Phaser.Scene {
    constructor() {
        super("menuScene");
    }

    preload() {
        // load title screen
        this.load.image('TitleScreen', './assets/Temp Title Screen.png');
    }

    create() {
        // title config
        let title = this.add.sprite(0,0,'TitleScreen');
        title.setOrigin(0,0);
        
        this.space = this.input.keyboard.addKey("SPACE");
    }

    update() {
        if(this.space.isDown) {
            this.scene.start("PlayScene");
        }
    }
    
}