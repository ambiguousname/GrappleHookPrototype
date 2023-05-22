import { Player } from "../prefabs/Player.js";
import { lerp } from "../util/lerp.js";

export class GrapplePrototype extends Phaser.Scene {
	constructor() {
        super("PlayScene");
    }
	preload() {
		this.load.tilemapTiledJSON('map', './assets/CityBackground.json');
		// this.load.spritesheet('tiles', './assets/tiles.png', {frameWidth: 70, frameHeight: 70});
		this.load.image('Cityasset_', './assets/Cityasset_.png');
		this.load.image('Feather_Asset_', './assets/Feather_Asset_.png');

		this.load.image('player', './assets/Game_Cover_.png');

		this.load.audio('bg1_music', './assets/Level1Bg.wav');
		this.load.audio('retract', './assets/RetractHook.wav');
		this.load.audio('extend' , './assets/HookExtend.wav');
	}
	
	create() {
		// Retract sfx
		this.sound.add('retract');
		this.sound.add('extend');
		// play background music
		let music = this.sound.add('bg1_music');
		let musicConfig = {
            mute: 0,
            volume: 0.1,
            loop: true, 
            delay: 0
        };
        music.play(musicConfig);

		this.player = new Player(this, 0, 0);

		this.drawMap();

        this.matter.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
		this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
		// this.cameras.main.startFollow(this.player.body);
		
		// this.matter.add.rectangle(300, 50, 500, 50, {isStatic: true});

		this.cameraFollow = new Phaser.Math.Vector2(0, 0);
		this.cameraFollowBounds = new Phaser.Math.Vector2(game.config.width * 1/2, game.config.height * 1/2);
		// this.fps.setParent()
	}

	drawMap() {
		this.map = this.make.tilemap({key: 'map'});
		
		this.background = this.map.addTilesetImage('Cityasset_');
		// this.backgroundLayer = this.map.getImageIndex("CityBg", this.background, 0, 0);

		// this.groundTiles = this.map.addTilesetImage("tiles");
		// this.groundLayer = this.map.createLayer("World", this.groundTiles, 0, 0);
		
		// this.groundLayer.setCollisionByExclusion([-1]);
		// this.matter.world.convertTilemapLayer(this.groundLayer);

		// this.drawObjectLayerCollisions(this.map.getObjectLayer("Buildings"));

		this.featherTiles = this.map.addTilesetImage("Feather_Asset_");
		this.featherLayer = this.map.createLayer("Feather", this.featherTiles, 0, 0);
		console.log(this.featherLayer);

		// Basic collision check, to fix:
		this.featherLayer.onCollision = (event) => {
			let bodyA = event.bodyA;
			let bodyB = event.bodyB;
			if (bodyA.id === this.player.body.id || bodyB.id === this.player.body.id) {
				let tile = bodyA;
				if ("gameObject" in bodyB) {
					tile = bodyB;
				}
				this.coinLayer.removeTileAt(tile.gameObject.tile.x, tile.gameObject.tile.y);
				this.matter.composite.remove(this.matter.world.engine.world, tile);
			}
		};

		/* For individual tiles:
		this.groundLayer.setCollisionByProperty({collides: true});*/
		
		this.drawMapSensors(this.featherLayer);

		this.cameras.main.setZoom(0.5);
	}

	drawObjectLayerCollisions(...layers) {
		for (let l in layers) {
			let layer = layers[l];
			layer.objects.forEach((object) => {
				let vertices = [];
				if ("polygon" in object) {
					vertices = vertices.concat(object.polygon);
				} else if ("rectangle" in object) {
					vertices.push(new Phaser.Math.Vector2(object.x, object.y), new Phaser.Math.Vector2(object.x + object.width, object.y), new Phaser.Math.Vector2(object.x + width, object.y + object.height), new Phaser.Math.Vector2(object.x, object.y + object.height));
				}
				this.matter.bodies.fromVertices(object.x, object.y, vertices);
			}, this);
		}
	}

	drawMapSensors(...layers) {
		for (let l in layers) {
			let layer = layers[l];
			let tiles = layer.getTilesWithin(0, 0, layer.layer.width, layer.layer.height);
			for (let i = 0; i < tiles.length; i++) {
				if (tiles[i].index > 0) {
					let body = new Phaser.Physics.Matter.TileBody(this.matter.world, tiles[i]);
					body.setSensor(true);
					body.setOnCollide(layer.onCollision);
				}
			}
		}
	}

	update(time, delta) {
		this.cameras.main.scrollX = lerp(this.cameras.main.scrollX, this.cameraFollow.x, delta * 0.01);
		this.cameras.main.scrollY = lerp(this.cameras.main.scrollY, this.cameraFollow.y, delta * 0.01);
		this.player.update();

		
		this.cameraFollow.x = this.player.body.position.x - this.cameras.main.centerX;
		this.cameraFollow.y = (this.player.body.position.y - this.cameras.main.centerY) - this.cameras.main.height/4;
		
		// If this gets revisited, you need to fix because the camera origin is 0.5 by default:
		/*if (Math.abs(this.player.body.position.x - (this.cameras.main.centerX + this.cameras.main.scrollX)) > this.cameraFollowBounds.x/2) {
		}

		if (Math.abs(this.player.body.position.y - (this.cameras.main.centerY + this.cameras.main.scrollY)) > this.cameraFollowBounds.y/2) {
			// this.cameraFollow.y = (this.player.body.position.y - (this.cameras.main.scrollY + this.cameras.main.centerY)) + this.cameraFollowBounds.y/2;
		}*/
	}
}
