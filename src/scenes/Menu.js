export class Menu extends Phaser.Scene {
    constructor() {
        super("menuScene");
    }

    preload() {
        // load title screen
        this.load.image('TitleScreen', './assets/Temp Title Screen.png');
        // load audio
        this.load.audio('bg_music', './assets/IntroSampPiano.wav');
    }

    create() {
        // title config
        let title = this.add.sprite(0,0,'TitleScreen');
        title.setOrigin(0,0);

        let music = this.sound.add('bg_music');
        let musicConfig = {
            mute: 0,
            volume: 0.4,
            loop: true, 
            delay: 0
        }
        music.play(musicConfig);
        
        this.space = this.input.keyboard.addKey("SPACE");
    }

    update() {
        if(this.space.isDown) {
            this.sound.stopByKey('bg_music');
            this.scene.start("PlayScene");
        }
    }
    
}