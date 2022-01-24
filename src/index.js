import "phaser";
import config from "./config/config";
import MainScene from "./scenes/MainScene";
import WaitingRoom from "./scenes/WaitingRoom";

class Game extends Phaser.Game {
  constructor() {
    // Add the config file to the game
    super(config);
    
    this.scene.add("MainScene", MainScene);
    this.scene.add("WaitingRoom", WaitingRoom);

    this.scene.start("MainScene");
  }
}
// Create new instance of game
window.onload = function () {
  window.game = new Game();
};