
import Phaser from "phaser";

export default class WaitingRoom extends Phaser.Scene {
    constructor() {
        super("WaitingRoom");
        this.state = {};
        this.hasBeenSet = false;
    }

    init(data) {
        this.socket = data.socket;
    }
    preload() {
        this.load.html("codeform", "assets/text/codeform.html");
    }

    create() {
        const scene = this;

        const params = new URLSearchParams(location.search);
        const userName = params.get("userName") || ("anonymous" + Math.ceil(Math.random() * 9999));
        const roomKey = params.get("roomKey") || "general";
        const roomName = params.get("roomName") || "개인방";
        const rColor = "0x" + Math.floor(Math.random()*16777215).toString(16)

        scene.popUp = scene.add.graphics();
        scene.boxes = scene.add.graphics();

        // for popup window
        scene.popUp.lineStyle(1, 0xffffff);
        scene.popUp.fillStyle(0xffffff, 0.5);

        // for boxes
        scene.boxes.lineStyle(1, 0xffffff);
        scene.boxes.fillStyle(0xa9a9a9, 1);

        // popup window
        scene.popUp.strokeRect(25, 25, 750, 500);
        scene.popUp.fillRect(25, 25, 750, 500);

        // title
        scene.title = scene.add.text(300, 200, roomName, {
            fill: "#a173eb",
            fontSize: "24px",
            fontStyle: "bold"
        });

        // right popup
        scene.boxes.strokeRect(290, 240, 270, 100);
        scene.boxes.fillRect(290, 240, 270, 100);
        scene.inputElement = scene.add.dom(425, 270).createFromCache("codeform");
        scene.inputElement.addListener("click");
        scene.inputElement.on("click", function (event) {
            scene.socket.emit("isKeyValid", roomKey, {userName, roomKey, roomName, rColor});
        });

        scene.socket.emit("getRoomCode", roomKey);

        scene.notValidText = scene.add.text(670, 295, "", {
            fill: "#ff0000",
            fontSize: "15px",
        });

        scene.socket.on("roomCreated", function (roomKey) {
            scene.roomKey = roomKey;
            // scene.roomKeyText.setText(scene.roomKey);
        });

        scene.socket.on("keyNotValid", function () {
            scene.notValidText.setText("Invalid Room Key");
        });
        scene.socket.on("keyIsValid", function (roomKey, input) {
            scene.socket.emit("joinRoom", roomKey, input);
            scene.scene.stop("WaitingRoom");
        });

    }

    update() {

    }

}