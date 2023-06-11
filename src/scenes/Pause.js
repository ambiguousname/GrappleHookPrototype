import { Button } from "../util/button.js";
import { TutorialManager } from "../prefabs/Tutorial.js";

export class Pause extends Phaser.Scene {
    constructor() {
      super({ key: 'pauseScreen', active: false });
    }
  
    create(data) {
        const { width, height } = this.sys.game.config;
    
        // Create a semi-transparent background
        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.5);
        background.fillRect(0, 0, width, height);
    
        // Create the resume button
        const resumeButton = new Button(this, width / 2, height / 2 - 50, 'button', 'Resume', () => {
            this.resumeGame(data.currentScene);
        });
  
    
        // Create the menu button
        const menuButton = new Button( this, width / 2, height / 2 + 50, 'button', 'Menu', () => {
            this.goToMenu(data.currentScene);
          });
    
        // Disable input for the current scene if it exists
        const GrappleHookBaseScene = this.scene.get('GrappleHookBase');
        if (GrappleHookBaseScene) {
          GrappleHookBaseScene.input.enabled = false;
        }
      }
    // Helper function to resume current scene
    resumeGame(sceneName) {
        this.scene.stop();
        const GrappleHookBaseScene = this.scene.get(sceneName);
        if (GrappleHookBaseScene) {
            GrappleHookBaseScene.input.enabled = true;
            // Resume the timer
            GrappleHookBaseScene.timer.startTime = Date.now();
            // Resume current scene
            GrappleHookBaseScene.scene.resume();
        }
  }
    // Helper function to go back to menue
    goToMenu(sceneName) {
        this.scene.stop(sceneName);
        const GrappleHookBaseScene = this.scene.get(sceneName);
        if (GrappleHookBaseScene) {
            // Reset tutorial
            TutorialManager.reset();
            GrappleHookBaseScene.input.enabled = true;
            // Stop all sounds
            GrappleHookBaseScene.sound.stopAll();
            // Reset Cursor to arrow
            this.input.setDefaultCursor();
            // Reset timer
            GrappleHookBaseScene.elapsedTime = 0;
            // Go to menu scene
            this.scene.start('menuScene');
            // Put on top layer
            this.scene.bringToTop('menuScene');
        }
    }
}
