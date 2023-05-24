export class Credit extends Phaser.Scene {
    constructor() {
        super("CreditScene");
    }
    preload() {
        // load credit screen
        this.load.image('CreditScreen', './assets/Credit Scene.png');
    }

    create() {
        // credit config
        let title = this.add.sprite(0,0,'CreditScreen');
        title.setOrigin(0,0);
        
        this.keyA = this.input.keyboard.addKey("A");
    }

    update() {
        if(this.keyA.isDown) {
            // Go to Menu
            this.sound.stopByKey('bg_music');
            this.scene.start('menuScene');
            
        }
    
    }
    
}