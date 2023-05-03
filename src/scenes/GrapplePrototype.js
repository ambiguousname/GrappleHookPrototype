import { Player } from "../prefabs/Player.js";
import { lerp } from "../util/lerp.js";

export class GrapplePrototype extends Phaser.Scene {
	constructor() {
        super("PlayScene");
    }
	preload() {
		this.load.tilemapTiledJSON('map', './assets/map.json');
		this.load.spritesheet('tiles', './assets/tiles.png', {frameWidth: 70, frameHeight: 70});
		this.load.image('coin', 'assets/coinGold.png');
	}
	
	create() {
		this.player = new Player(this, 100, 400);

		this.drawMap();

        this.matter.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
		this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
		// this.cameras.main.startFollow(this.player.body);
		
		// this.matter.add.rectangle(300, 50, 500, 50, {isStatic: true});

		this.cameraFollow = new Phaser.Math.Vector2(0, 0);
		this.cameraFollowBounds = new Phaser.Math.Vector2(game.config.width * 1/2, game.config.height * 1/2);
	}

	drawMap() {

		this.map = this.make.tilemap({key: 'map'});

		this.groundTiles = this.map.addTilesetImage("tiles");
		this.groundLayer = this.map.createLayer("World", this.groundTiles, 0, 0);
		// this.groundLayer.setCollisionByExclusion([-1]);

		this.coinTiles = this.map.addTilesetImage("coin");
		this.coinLayer = this.map.createLayer("Coins", this.coinTiles, 0, 0);

		// Basic collision check, to fix:
		this.coinLayer.onCollision = (event) => {
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

		this.groundLayer.setCollisionByProperty({collides: true});
		this.matter.world.convertTilemapLayer(this.groundLayer);
		
		this.drawMapSensors(this.coinLayer);
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
		this.cameraFollow.y = (this.player.body.position.y - this.cameras.main.centerY) - game.config.height/4;
		/*if (Math.abs(this.player.body.position.x - (this.cameras.main.centerX + this.cameras.main.scrollX)) > this.cameraFollowBounds.x/2) {
		}

		if (Math.abs(this.player.body.position.y - (this.cameras.main.centerY + this.cameras.main.scrollY)) > this.cameraFollowBounds.y/2) {
			// this.cameraFollow.y = (this.player.body.position.y - (this.cameras.main.scrollY + this.cameras.main.centerY)) + this.cameraFollowBounds.y/2;
		}*/
	}
}
