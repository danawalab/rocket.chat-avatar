
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
        scene.title = scene.add.text(100, 75, "Rocket.Chat", {
            fill: "#a173eb",
            fontSize: "66px",
            fontStyle: "bold"
        });

        // left popup
        // scene.boxes.strokeRect(100, 200, 275, 100);
        // scene.boxes.fillRect(100, 200, 275, 100);
        // scene.requestButton = scene.add.text(140, 215, "Request Room key", {
        //     fill: "#000000",
        //     fontSize: "20px",
        //     fontStyle: "bold",
        // });

        // right popup
        scene.boxes.strokeRect(175, 200, 275, 100);
        scene.boxes.fillRect(175, 200, 275, 100);
        scene.inputElement = scene.add.dom(300, 250).createFromCache("codeform");
        scene.inputElement.addListener("click");
        scene.inputElement.on("click", function (event) {
            if (event.target.name === "enterRoom") {
                // const input = scene.inputElement.getChildByName("code-form");
                // scene.socket.emit("isKeyValid", input.value);
                // parent windows 에서 파라미터 전달. (rocket.chat 최초 파라미터.)

                // console.log(input);
                // 기본 general 방으로 접속
                scene.socket.emit("isKeyValid", roomKey, userName);
            }
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