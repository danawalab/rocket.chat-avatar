import Phaser from "phaser";
import OpenviduHandler from "../medio/OpenviduHandler"

const openvidu = new OpenviduHandler();

export default class MainScene extends Phaser.Scene {
    constructor() {
        super("MainScene");
        this.state = {};
        this.joined = false;
    }

    preload() {
        // scene 중에 사용되는 assert을 로딩을 정의

        // 배경 이미지
        this.load.tilemapTiledJSON("map", "../assets/maps/map2.json");
        this.load.image("tilset_17x17", "../assets/maps/tileset_17x17.png");
        this.load.image("logo", "../assets/maps/danawa-logo.png");

        // audio image
        this.load.image("speakerOff", "../assets/audio/speaker_off.png");
        this.load.image("speakerOn", "../assets/audio/speaker_on.png");
        this.load.image("volumeUp", "../assets/audio/volume_up.png");
        this.load.image("volumeDown", "../assets/audio/volume_down.png");

        // atlas 케릭터
        this.load.atlas("atlas", "../assets/atlas/atlas.png", "../assets/atlas/atlas.json");
    }

    create() {
        // scene 생성, 즉 1회 로직 정의
        const scene = this;

        // 배경 이미지를 등록하여 표시한다.
        scene.map = scene.make.tilemap({key: "map"});

        // 맵의 타일셋 이미지추가 (load key) 메모리에 로딩 정도
        const tileset = scene.map.addTilesetImage("tileset_17x17", "tilset_17x17");
        const logo = scene.map.addTilesetImage("logo", "logo");


        // 레이어 추가 (실제 화면 표시)
        scene.belowLayer = scene.map.createLayer("Below", [tileset], 0, 0);
        scene.belowLayer.setCollisionByProperty({collides: true});

        scene.logoLayer = scene.map.createLayer("Logo", [logo], 0, 0);
        scene.logoLayer.setCollisionByProperty({collides: true});

        scene.worldLayer = scene.map.createLayer("World", [tileset], 0, 0);
        scene.worldLayer.setCollisionByProperty({collides: true});

        // 서버와 통신용으로 io() 내장 함수를 사용한다.
        this.socket = io();
        // 사용자가 접근시 최초에는 WaitingRoom Scene 화면을 런칭해준다. (룸 이름 입력 화면)
        scene.scene.launch("WaitingRoom", {socket: scene.socket});
        // 물리 객체의 그룹을 하나만든다. 
        this.otherPlayers = this.physics.add.group();
        // 키보드 입력, 이동 등 업데이트시 사용됨.
        this.cursors = this.input.keyboard.createCursorKeys();

        // 케릭터 객체를 하나 추가한다. 폰드기반 객체 -> astronaut
        // x:0, y:0, key, 
        this.astronaut = this.physics.add.sprite(1, 1, "atlas", "misa-front");
        this.astronaut.setVisible(false);

        // atlas 왼쪽, 오른쪽, 위, 아래 이동 애니메이션을 추가해준다.

        // 왼쪽 이동 애니메이션
        this.anims.create({
            key: "misa-left-walk",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "misa-left-walk.", start: 0, end: 3, zeroPad: 3
            }),
            frameRate: 10,
            repeat: -1,
        });
        // 오른쪽 이동 애니메이션
        this.anims.create({
            key: "misa-right-walk",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "misa-right-walk.",
                start: 0,
                end: 3,
                zeroPad: 3,
            }),
            frameRate: 10,
            repeat: -1,
        });
        // 앞 이동 애니메이션
        this.anims.create({
            key: "misa-front-walk",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "misa-front-walk.",
                start: 0,
                end: 3,
                zeroPad: 3,
            }),
            frameRate: 10,
            repeat: -1,
        });
        // 뒤 이동 애니메이션
        this.anims.create({
            key: "misa-back-walk",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "misa-back-walk.",
                start: 0,
                end: 3,
                zeroPad: 3,
            }),
            frameRate: 10,
            repeat: -1,
        });


        // ***** 서버 통신 ****

        this.socket.on("setState", function (state) {
            console.log("setState", state);
            const {roomKey, players, numPlayers, input} = state;
            scene.physics.resume();
            scene.state.roomKey = roomKey;
            scene.state.players = players;
            scene.state.numPlayers = numPlayers;

            const player = Object.values(players).find(player => player.playerId === scene.socket.id)

            if (player) {
                openvidu.joinSession(roomKey, player.userName)
                    .then(() => {
                        scene.audioConnectText = scene.add.text(
                            200,
                            80,
                            "마이크를 연결하였습니다.",
                            {
                                fill: "#65C18C",
                                fontSize: "66px",
                                fontStyle: "bold"
                            });
                        setTimeout(() => {
                            scene.audioConnectText.destroy()
                        }, 5000)
                    })
                    .catch(error => {
                        console.warn(error)
                        scene.audioConnectText = scene.add.text(
                            200,
                            80,
                            "마이크를 연결할 수 없습니다.",
                            {
                                fill: "#FF7BA9",
                                fontSize: "24pt",
                                fontStyle: "bold"
                            });
                        setTimeout(() => {
                            scene.audioConnectText.destroy()
                        }, 5000)
                    })
            }

        });

        // 모든 플레이어
        this.socket.on("currentPlayers", function (arg) {
            console.log("currentPlayers", arg);
            const {players, numPlayers} = arg;
            scene.state.numPlayers = numPlayers;
            Object.keys(players).forEach(id => {
                if (players[id].playerId === scene.socket.id) {
                    scene.addPlayer(scene, players[id]);
                } else {
                    scene.addOtherPlayers(scene, players[id]);
                }
            });
        });

        this.socket.on("newPlayer", function (arg) {
            console.log("newPlayer", arg);
            const {playerInfo, numPlayers} = arg;
            scene.addOtherPlayers(scene, playerInfo);
            scene.state.numPlayers = numPlayers;
        });

        this.socket.on("playerMoved", function (playerInfo) {
            scene.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (playerInfo.playerId === otherPlayer.playerId) {
                    const oldX = otherPlayer.x;
                    const oldY = otherPlayer.y;
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                    otherPlayer.playerName.setPosition(playerInfo.x - 20, playerInfo.y - 25);
                    if (oldX < playerInfo.x) {
                        otherPlayer.anims.play("misa-right-walk", true);
                    } else if (oldX > playerInfo.x) {
                        otherPlayer.anims.play("misa-left-walk", true);
                    } else if (oldY < playerInfo.y) {
                        otherPlayer.anims.play("misa-front-walk", true);
                    } else if (oldY > playerInfo.y) {
                        otherPlayer.anims.play("misa-back-walk", true);
                    }
                }
            });
        });

        this.socket.on("otherPlayerStopped", function (playerInfo) {
            scene.otherPlayers.getChildren().forEach(function (otherPlayer) {
                console.log(otherPlayer, playerInfo.playerId)
                if (playerInfo.playerId === otherPlayer.playerId) {
                    otherPlayer.anims.stop(null, true);
                }
            });
        });

        this.socket.on("disconnected", function (arg) {
            const {playerId, numPlayers} = arg;
            scene.state.numPlayer = numPlayers;
            scene.otherPlayers.getChildren().forEach(otherPlayer => {
                if (playerId === otherPlayer.playerId) {
                    otherPlayer.destroy();
                    console.log("destroy player", otherPlayer.playerId);
                }
            });
        });

    }

    update() {
        // 한번 실행이 아닌 움직임, 이동 같은 기능은 update 함수 정의
        const scene = this;

        if (this.astronaut) {
            // player인 경우
            const speed = 225;
            const prevVelocity = this.astronaut.body.velocity.clone();
            this.astronaut.body.setVelocity(0);

            // 특정 방향에서 속도가 빨라지는 현상으로 방지하기 위한 코드.
            this.astronaut.body.velocity.normalize().scale(speed);

            // Horizontal movement
            if (this.cursors.left.isDown) {
                // 좌표로 보았을때 마이너스로 보내야 좌측이등
                // 왼쪽 이동
                this.astronaut.body.setVelocityX(-speed);
                this.astronaut.anims.play("misa-left-walk", true);
                // 좌우 반전 (반전)
                // this.astronaut.flipX = true;
            } else if (this.cursors.right.isDown) {
                // 오른쪽 이동
                this.astronaut.body.setVelocityX(speed);
                this.astronaut.anims.play("misa-right-walk", true);
                // 좌우 반전 (원본)
                // this.astronaut.flipX = false;
            } else if (this.cursors.up.isDown) {
                // 위로 이동
                this.astronaut.body.setVelocityY(-speed);
                this.astronaut.anims.play("misa-back-walk", true);
            } else if (this.cursors.down.isDown) {
                // 아래로 이동
                this.astronaut.body.setVelocityY(speed);
                this.astronaut.anims.play("misa-front-walk", true);
            } else {
                // 애니메이션(움직임) 종료
                this.astronaut.anims.stop(null, true);
            }

            // emit player movement
            var x = this.astronaut.x;
            var y = this.astronaut.y;
            if (this.astronaut.oldPosition && (x !== this.astronaut.oldPosition.x || y !== this.astronaut.oldPosition.y)) {
                this.moving = true;
                this.socket.emit("playerMovement", {
                    x: this.astronaut.x,
                    y: this.astronaut.y,
                    roomKey: scene.state.roomKey,
                });
                this.astronaut
                    .playerName
                    .setPosition(this.astronaut.body.x, this.astronaut.body.y - 15)
                // emit player stopped
            } else if (this.joined && this.moving) {
                this.moving = false;
                this.socket.emit("playerStopped", {
                    x: this.astronaut.x,
                    y: this.astronaut.y,
                    roomKey: scene.state.roomKey,
                });
                this.astronaut
                    .playerName
                    .setPosition(this.astronaut.body.x, this.astronaut.body.y - 15)
            }

            // save old position data
            this.astronaut.oldPosition = {
                x: this.astronaut.x,
                y: this.astronaut.y,
                rotation: this.astronaut.rotation,
            };
        }

    }

    // 내 플레이어 추가
    addPlayer(scene, playerInfo) {
        // scene 연결 
        scene.joined = true;
        // 객체 추가 (atlas)
        scene.astronaut = scene.physics.add
            .sprite(playerInfo.x, playerInfo.y, "atlas", "misa-front")
            .setOrigin(0.5, 0.5)
            .setSize(30, 40)
            .setOffset(0, 24);
        let shortUserName = playerInfo.userName.substring(0, 5)
        scene.astronaut.playerName = scene.add.text(
            playerInfo.x - 20,
            playerInfo.y - 25,
            shortUserName,
            {
                fill: "#000000",
                fontSize: "12px",
                fontStyle: "bold"
            });


        // 레이어와 물리 벽 추가
        scene.physics.add.collider(scene.astronaut, this.belowLayer);
        scene.physics.add.collider(scene.astronaut, this.worldLayer);
        scene.physics.add.collider(scene.astronaut, this.logoLayer);

        // 카메라 동기화
        scene.camera = scene.cameras.main;
        // 객체 추적 
        scene.camera.startFollow(scene.astronaut);
    }

    addOtherPlayers(scene, playerInfo) {
        const otherPlayer = scene.add.sprite(
            playerInfo.x,
            playerInfo.y,
            "atlas"
        );
        otherPlayer.playerId = playerInfo.playerId;
        let shortUserName = playerInfo.userName.substring(0, 5)

        otherPlayer.playerName = scene.add.text(
            playerInfo.x - 20,
            playerInfo.y - 25,
            shortUserName,
            {
                fill: "#000000",
                fontSize: "12px",
                fontStyle: "bold"
            });
        scene.otherPlayers.add(otherPlayer);
    }
}

