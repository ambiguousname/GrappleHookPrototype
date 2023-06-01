import { Player } from "../prefabs/Player.js";
import { lerp } from "../util/lerp.js";
import { loadFilesAtRuntime } from "../util/loading.js";
import { screenToWorldSpace } from "../util/screenToWorldSpace.js";

export class GrappleHookBase extends Phaser.Scene {
	#nextScene = undefined;
	constructor(sceneName, nextScene) {
        super(sceneName);
		this.#nextScene = nextScene;
    }
	preload() {
		// setPreload(this);
		
		this.load.tilemapTiledJSON('map', './assets/CityBackground.json');
		// this.load.spritesheet('tiles', './assets/tiles.png', {frameWidth: 70, frameHeight: 70});
		this.load.image('background', './assets/Cityasset_.png');
		this.load.image('Feather_Asset_', './assets/Feather_Asset_.png');
		this.load.image('sparkle', './assets/sparkle.png');
		this.load.image('player', './assets/Angel_Asset_.png');

		// this.load.image('rope', './assets/hook/Rope_.png');
		this.load.image('hook', './assets/hook/Grappling_Hook_1.png');
		this.load.image('hook_hooked', './assets/hook/Grappling_Hook_2.png');
		

		this.load.audio('retract', './assets/RetractHook.wav');
		this.load.audio('extend' , './assets/HookExtend.wav');

		this.load.glsl("rope", "./src/util/ropeShader.glsl");
	}
	
	create() {
		// Restart Current Scene
		this.input.keyboard.on('keydown-R', () => {
			this.scene.restart();
		});	

		// Retract sfx
		this.sound.add('retract');
		this.sound.add('extend');

		loadFilesAtRuntime(this, {
			"bg1_music": {type: "audio", url: "./assets/Level1Bg.wav"}
		}, () => {
			// play background music
			let music = this.sound.add('bg1_music');
			let musicConfig = {
				mute: 0,
				volume: 0.1,
				loop: true, 
				delay: 0
			};
			music.play(musicConfig);
		});

		let scale = 4;

		this.drawMap(scale);
		
		// Player spawn location
		const angelSpawn = this.map.findObject('Spawn', obj => obj.name === 'angelSpawn');
  		this.player = new Player(this, angelSpawn.x * scale, angelSpawn.y * scale);


		//this.player = new Player(this, 0, this.map.heightInPixels - 50);

		// this.cameras.main.startFollow(this.player.body);
		
		// this.matter.add.rectangle(300, 50, 500, 50, {isStatic: true});

		this.cameraFollow = new Phaser.Math.Vector2(this.player.body.position.x - this.cameras.main.centerX, (this.player.body.position.y - this.cameras.main.centerY) - this.cameras.main.height/4);
		this.cameraFollowBounds = new Phaser.Math.Vector2(game.config.width * 1/2, game.config.height * 1/2);
		this.cameras.main.setScroll(Math.max(this.cameraFollow.x, this.cameras.main.centerX), Math.max(this.cameraFollow.y, this.cameras.main.centerY));

		let worldSpace = screenToWorldSpace(this.cameras.main, window.cursorFire);

		this.player.grapple.fire(worldSpace.x, worldSpace.y, true);
	}

	transitionTo(sceneName) {
		let startTime = this.time.now;
		function transitionToAnim() {
			let timeElapsed = this.time.now - startTime;
			this.cameras.main.alpha = (1000 - timeElapsed)/1000;
			if (this.cameras.main.alpha <= 0) {
				this.scene.start(sceneName);
			} else {
				requestAnimationFrame(transitionToAnim.bind(this));
			}
		}
		requestAnimationFrame(transitionToAnim.bind(this));
	}

	drawMap(scale=1) {

		this.map = this.make.tilemap({key: 'map'});
		this.map.forEachTile((tile) => {
			tile.x *= scale;
			tile.y *= scale;
			tile.setSize(tile.width * scale, tile.height * scale);
		});

        this.matter.world.setBounds(0, 0, this.map.widthInPixels * scale, this.map.heightInPixels * scale);
		this.cameras.main.setBounds(0, 0, this.map.widthInPixels * scale, this.map.heightInPixels * scale);
		
		let bg = this.add.image(0, 0, "background").setOrigin(0);
		bg.setScale(scale);

		// this.groundTiles = this.map.addTilesetImage("tiles");
		// this.groundLayer = this.map.createLayer("World", this.groundTiles, 0, 0);
		
		// this.groundLayer.setCollisionByExclusion([-1]);
		// this.matter.world.convertTilemapLayer(this.groundLayer);

		this.drawObjectLayerCollisions({layers: this.map.getObjectLayer("Buildings"), scale: scale});

		this.featherTiles = this.map.addTilesetImage("Feather_Asset_");
		this.featherLayer = this.map.createLayer("Feather", this.featherTiles, 0, 0);
		this.featherLayer.skipCull = true;

		let numFeathers = 0;
		this.featherLayer.forEachTile((tile) => {
			tile.setSize(70, 70);
			numFeathers++;
		});

		// Basic collision check, to fix:
		this.featherLayer.onCollision = (event) => {
			let bodyA = event.bodyA;
			let bodyB = event.bodyB;
			if (bodyA.id === this.player.body.id || bodyB.id === this.player.body.id) {
				let tile = bodyA;
				if (this.player.body.id === bodyA.id) {
					tile = bodyB;
				}
				// particle emmiter for feather
				this.add.particles(tile.gameObject.tile.x / scale, tile.gameObject.tile.y / scale, 'sparkle', {
					speed: 100,
					lifespan: 500,
					gravityY: 200,
					stopAfter: 10
				});
				this.featherLayer.removeTileAt(tile.gameObject.tile.x / scale, tile.gameObject.tile.y / scale);
				this.matter.composite.remove(this.matter.world.engine.world, tile);
				numFeathers--;
				if (numFeathers <= 0) {
					this.transitionTo(this.#nextScene);
				}
			}
		};

		/* For individual tiles:
		this.groundLayer.setCollisionByProperty({collides: true});*/
		
		this.drawMapSensors(this.featherLayer);

		this.cameras.main.setZoom(0.5);
	}

	drawObjectLayerCollisions({scale, ...layers} = {scale: 1, layers: []}) {
		for (let l in layers) {
			let layer = layers[l];
			layer.objects.forEach((object) => {
				let vertices = [];

				let center = {x: 0, y: 0};
				if ("polygon" in object) {
					// Complex polygons NOT recommended because the center is found incorrectly with this method:
					center = this.matter.vertices.centre(object.polygon);
					vertices = object.polygon;
					for (let v in vertices) {
						vertices[v] = {x: vertices[v].x * scale, y: vertices[v].y * scale};
					}
				} else if ("rectangle" in object) {
					vertices.push(new Phaser.Math.Vector2(0, 0), new Phaser.Math.Vector2(object.width * scale, 0), new Phaser.Math.Vector2(object.width * scale, object.height * scale), new Phaser.Math.Vector2(0, object.height * scale));
					center = {x: object.width/2, y: object.height/2};
				}

				this.matter.add.fromVertices((object.x + center.x) * scale, (object.y + center.y) * scale, vertices, {
					isStatic: true,
				});
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