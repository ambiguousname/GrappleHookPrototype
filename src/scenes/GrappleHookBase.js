import { Player } from "../prefabs/Player.js";
import { lerp } from "../util/lerp.js";
import { loadFilesAtRuntime } from "../util/loading.js";
import { screenToWorldSpace } from "../util/screenToWorldSpace.js";
import { Grapple } from "../prefabs/Grapple.js";
import { TutorialManager } from "../prefabs/Tutorial.js";
import { Timer } from "../prefabs/Timer.js";

export class GrappleHookBase extends Phaser.Scene {
	#nextScene = undefined;
	#tilemapJSON = undefined;
	#backgroundImage = undefined;
	#backgroundMusicURL = undefined;
	#backgroundMusic = undefined;
	constructor(sceneName, nextScene, tilemapJSON, backgroundImage, backgroundMusic, elapsedTime=0, mapScale=4, collisionLayer="Buildings", zoomAmount=0.5) {
        super(sceneName);
		this.sceneName = sceneName;
		this.#nextScene = nextScene;
		this.#tilemapJSON = tilemapJSON;
		this.#backgroundImage = backgroundImage;
		this.#backgroundMusicURL = backgroundMusic;
		this.elapsedTime = elapsedTime;
		this.mapScale = mapScale;
		this.collisionLayer = collisionLayer;
		this.zoomAmount = zoomAmount
    }
	preload() {
		TutorialManager.preload(this);

		// Load in maps for scenes
		this.load.tilemapTiledJSON('map' + this.sceneName, this.#tilemapJSON);
		// Load in assets
		this.load.image('background' + this.sceneName, this.#backgroundImage);
		this.load.image('Feather_Asset_', './assets/Feather_Asset_.png');
		this.load.image('sparkle', './assets/sparkle.png');
		this.load.image('player', './assets/Angel_Asset_.png');

		this.load.image('hook', './assets/hook/Grappling_Hook_1.png');
		this.load.image('hook_hooked', './assets/hook/Grappling_Hook_2.png');
		
		// Load in sfx
		this.load.audio('retract', './assets/audio/RetractHook.wav');
		this.load.audio('extend' , './assets/audio/HookExtend.wav');

		this.load.glsl("rope", "./src/util/ropeShader.glsl");

	}

	init (data) {
        console.log('init', data);
        this.elapsedTime = data.elapsedTime;
    }
	
	create() {
		// Pause screen
		const pauseButton = this.input.keyboard.addKey('P');
		pauseButton.on('down', () => {
			this.pauseGame();
		});
		// Add in sfx
		this.sound.add('retract');
		this.sound.add('extend');
		// Add in background music for level
		let audioName = `${this.sceneName}_music`;
		let files = {};
		files[audioName] = {type: "audio", url: this.#backgroundMusicURL};
		// Load background music for scene 1
		loadFilesAtRuntime(this, files, () => {
			// play background music
			this.#backgroundMusic = this.sound.add(audioName);
			//let music = this.sound.add(audioName);
			let musicConfig = {
				mute: 0,
				volume: 0.1,
				loop: true, 
				delay: 0
			};
			this.#backgroundMusic.play(musicConfig);
		});
		// Restart Current Scene
		this.input.keyboard.on('keydown-R', () => {
			this.restartScene();
		});	
		// Set up map
		this.drawMap(this.mapScale);
		
		// Player spawn location
		const angelSpawn = this.map.findObject('Spawn', obj => obj.name === 'angelSpawn');
  		this.player = new Player(this, angelSpawn.x * this.mapScale, angelSpawn.y * this.mapScale);

		// Set camera view
		this.cameraFollow = new Phaser.Math.Vector2(this.player.body.position.x - this.cameras.main.centerX, (this.player.body.position.y - this.cameras.main.centerY) - this.cameras.main.height/4);
		this.cameraFollowBounds = new Phaser.Math.Vector2(game.config.width * 1/2, game.config.height * 1/2);
		this.cameras.main.setScroll(Math.max(this.cameraFollow.x, this.cameras.main.centerX), Math.max(this.cameraFollow.y, this.cameras.main.centerY));

		if (window.cursorFire !== undefined && window.cursorFire !== null){
			let worldSpace = screenToWorldSpace(this.cameras.main, window.cursorFire);

			this.player.grapple.fire(worldSpace.x, worldSpace.y, true);
			window.cursorFire = null;
		}

		// Switch pointer color if player can reach cursor position
		this.input.on('pointermove', () => {
			const playerX = this.player.body.position.x;
			const playerY = this.player.body.position.y;
			let cursor_pos = screenToWorldSpace(this.cameras.main, this.input.mousePointer);
	
			const distance = this.distance(playerX, playerY, cursor_pos);
	
			if (distance < Grapple.gameplaySettings.firing.maxLength * (Grapple.gameplaySettings.rope.interpolationAmount + 1) ) {
				this.input.setDefaultCursor('url(assets/cursor/greenPointer.png) 16 16, pointer');
			} else {
				this.input.setDefaultCursor('url(assets/cursor/redPointer.png) 16 16, pointer');
			}
		});	
		
		// Create a timer instance
		this.timer = new Timer(this.elapsedTime);

		// Start the timer
		this.timer.start();
		this.timerText = this.add.text(10, 10, 'Time: ' + this.elapsedTime, { fontFamily: 'serif', fontSize: 35, color: '#ffffff' });

		// Adjust timer text position to top left corner of the screen
    	this.cameras.main.on('cameraupdate', this.updateTimerTextPosition, this);

	} 
	// Helper function for pausing
	pauseGame() {
		this.timer.prevTime = this.elapsedTime;
		this.scene.pause();
		this.scene.launch('pauseScreen', { currentScene: this.scene.key });
	}
	
	// Get the distance of the player and cursor
	distance(playerX, playerY, cursor_pos) {
		const cursorX = cursor_pos.x + 30;
		const cursorY = cursor_pos.y + 30;
	
		const distanceX = cursorX - playerX;
		const distanceY = cursorY - playerY;
	
		const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
	
		return distance;
	}	
	// Function to allow quick level reset
	restartScene() {
        // Stop the background music
        this.stopBackgroundMusic();
        
        // Restart the scene
        this.scene.restart();
    }
	// Function to stop background music from playing
	stopBackgroundMusic() {
		if (this.#backgroundMusic) {
			this.#backgroundMusic.stop();
		}
	}
	// Transitioning from level to level
	transitionTo(sceneName) {
		this.stopBackgroundMusic(); 
		let startTime = this.time.now;
		function transitionToAnim() {
			let timeElapsed = this.time.now - startTime;
			this.cameras.main.alpha = (1000 - timeElapsed)/1000;
			if (this.cameras.main.alpha <= 0) {
				// Pass the elapsed time to the next scene
				this.scene.start(sceneName, { elapsedTime: this.elapsedTime });
				//this.scene.start(sceneName);
			} else {
				requestAnimationFrame(transitionToAnim.bind(this));
			}
		}
		requestAnimationFrame(transitionToAnim.bind(this));
	}

	updateTimerTextPosition() {
		const paddingX = 15;
		const paddingY = 15;

		const cameraViewport = this.cameras.main.worldView;
	
		const textX = Phaser.Math.Clamp(cameraViewport.left + paddingX, cameraViewport.left + paddingX, cameraViewport.right - this.timerText.width - paddingX);
		const textY = Phaser.Math.Clamp(cameraViewport.top + paddingY, cameraViewport.top + paddingY, cameraViewport.bottom - this.timerText.height - paddingY);

		this.timerText.setPosition(textX, textY);
	}

	drawMap(scale=1) {
		// Scale current scene map
		this.map = this.make.tilemap({key: 'map' + this.sceneName});
		this.map.forEachTile((tile) => {
			tile.x *= scale;
			tile.y *= scale;
			tile.setSize(tile.width * scale, tile.height * scale);
		});

        this.matter.world.setBounds(0, 0, this.map.widthInPixels * scale, this.map.heightInPixels * scale);
		this.cameras.main.setBounds(0, 0, this.map.widthInPixels * scale, this.map.heightInPixels * scale);
		
		let bg = this.add.image(0, 0, "background" + this.sceneName).setOrigin(0);
		bg.setScale(scale);

		// Set collision layer
		this.drawObjectLayerCollisions({layers: this.map.getObjectLayer(this.collisionLayer), scale: scale});
		// Set feather layer
		this.featherTiles = this.map.addTilesetImage("Feather_Asset_");
		this.featherLayer = this.map.createLayer("Feather", this.featherTiles, 0, 0);
		this.featherLayer.skipCull = true;

		let numFeathers = 0;
		this.featherLayer.forEachTile((tile) => {
			tile.setSize(70, 70);
			if (tile.index !== -1 ){
				numFeathers++;
			}
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
				const tileX = tile.position.x;
				const tileY = tile.position.y;
				this.add.particles(tileX, tileY, 'sparkle', {
					speed: 100,
					lifespan: 500,
					gravityY: 200,
					stopAfter: 10
				});
				// Remove feather once collided with. Also checks if no more feathers are left in the scene
				this.featherLayer.removeTileAt(tile.gameObject.tile.x / scale, tile.gameObject.tile.y / scale);
				this.matter.composite.remove(this.matter.world.engine.world, tile);
				numFeathers--;
				// If all feathers are collected go to the next scene
				if (numFeathers <= 0) {
					this.transitionTo(this.#nextScene);
				}
			}
		};
		
		this.drawMapSensors(this.featherLayer);

		this.cameras.main.setZoom(this.zoomAmount);
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
		TutorialManager.update(this);

		this.cameras.main.scrollX = lerp(this.cameras.main.scrollX, this.cameraFollow.x, delta * 0.01);
		this.cameras.main.scrollY = lerp(this.cameras.main.scrollY, this.cameraFollow.y, delta * 0.01);
		this.player.update();

		
		this.cameraFollow.x = this.player.body.position.x - this.cameras.main.centerX;
		this.cameraFollow.y = (this.player.body.position.y - this.cameras.main.centerY) - this.cameras.main.height/4;

		// Update the timer
		this.timer.update();
		this.elapsedTime = this.timer.elapsedSeconds;

		// Update the timer text with the elapsed time
		this.timerText.setText('Time: ' + this.elapsedTime);
	
		//Update the timer text position
		this.updateTimerTextPosition();
		
		// If this gets revisited, you need to fix because the camera origin is 0.5 by default:
		/*if (Math.abs(this.player.body.position.x - (this.cameras.main.centerX + this.cameras.main.scrollX)) > this.cameraFollowBounds.x/2) {
		}

		if (Math.abs(this.player.body.position.y - (this.cameras.main.centerY + this.cameras.main.scrollY)) > this.cameraFollowBounds.y/2) {
			// this.cameraFollow.y = (this.player.body.position.y - (this.cameras.main.scrollY + this.cameras.main.centerY)) + this.cameraFollowBounds.y/2;
		}*/
	}
}
