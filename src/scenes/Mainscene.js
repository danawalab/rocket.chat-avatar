import Phaser from "phaser";

export default class MainScene extends Phaser.Scene {
    constructor() {
        super("MainScene");
        this.state = {};
    }

    preload() {
        // scene 중에 사용되는 assert을 로딩을 정의

        // spritesheet
        //   - 하나의 이미지에 여러 장면의 모음일때 frameWidth, frameHeight 옵션을 사용하여 분리하여 사용한다.
        // image
        //   - 단순히 이미지를 로그한다.

        // 우주인 케릭터
        this.load.spritesheet("astronaut", "assets/spritesheets/astronaut3.png", {
            frameWidth: 29,
            frameHeight: 37,
            endFrame: 3,
        });

        // 배경 이미지
        this.load.image("mainroom", "assets/backgrounds/mainroom.png");
        
        // atlas 케릭터
        this.load.atlas("atlas", "../assets/atlas/atlas.png", "../assets/atlas/atlas.json");

        // this.load.on('progress',  function  (value)  {
        //     console.log(value);
        // });
    
        // this.load.on('complete',  function  ()  {
        //     console.log('complete');
        // });
    }

    create() {
        // scene 생성, 즉 1회 로직 정의
        const scene = this;
        // 배경 이미지를 등록하여 표시한다.
        this.add.image(0, 0, "mainroom").setOrigin(0);
        // 서버와 통신용으로 io() 내장 함수를 사용한다.
        this.socket = io();
        // 사용자가 접근시 최초에는 WaitingRoom Scene 화면을 런칭해준다. (룸 이름 입력 화면)
        scene.scene.launch("WaitingRoom", { socket: scene.socket });
        // 물리 객체의 그룹을 하나만든다. 
        this.otherPlayers = this.physics.add.group();
        // 키보드 입력, 이동 등 업데이트시 사용됨.
        this.cursors = this.input.keyboard.createCursorKeys();


        // 케릭터 객체를 하나 추가한다. 폰드기반 객체 -> astronaut
        this.astronaut = this.physics.add.sprite(1, 1, "atlas", "misa-front");
        this.astronaut.setVisible(false);

        // atlas 왼쪽, 오른쪽, 위, 아래 이동 애니메이션을 추가해준다.

        // 왼쪽 이동 애니메이션
        this.anims.create({ key: "misa-left-walk", 
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "misa-left-walk.", start: 0, end: 3, zeroPad: 3 }), 
            frameRate: 10,
            repeat: -1,
        });
        // 오른쪽 이동 애니메이션
        this.anims.create({ key: "misa-right-walk",
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
        this.anims.create({ key: "misa-front-walk",
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
        this.anims.create({ key: "misa-back-walk",
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

        this.socket.on("setState", function(state) {
            const { roomKey, players, numPlayers } = state;

            scene.physics.resume();

            scene.state.roomKey = roomKey;
            scene.state.players = players;
            scene.state.numPlayers = numPlayers;
        });

        // 모든 플레이어
        this.socket.on("currentPlayers", function(arg) {
            const { players, numPlayers } = arg;
            scene.state.numPlayers = numPlayers;
            Object.keys(players).forEach(id => {
                console.log(players[id].playerId, scene.socket.id, players[id].playerId === scene.socket.id);
                if (players[id].playerId === scene.socket.id) {
                    scene.addPlayer(scene, players[id]);
                } else {
                    scene.addOtherPlayers(scene, players[id]);
                }
            });
        });

        this.socket.on("newPlayer", function(arg) {
            const { playerInfo, numPlayers } = arg;
            scene.addOtherPlayers(scene, playerInfo);
            scene.state.numPlayers = numPlayers;
        });

        this.socket.on("playerMoved", function(playerInfo) {
            scene.otherPlayers.getChildren().forEach(function(otherPlayer) {
                if (playerInfo.playerId === otherPlayer.playerId) {
                    const oldX = otherPlayer.x;
                    const oldY = otherPlayer.y;
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                }
            });
        });

        this.socket.on("otherPlayerStopped", function (playerInfo) {
            scene.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.anims.stop(null, true);
                }
            });
        });

        this.socket.on("disconnected", function(arg) {
            const { playerId, numPlayers } = arg;
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
            

            // Horizontal movement
            if (this.cursors.left.isDown) { 
                // 좌표로 보았을때 마이너스로 보내야 좌측이등
                // 왼쪽 이동
                this.astronaut.body.setVelocityX(-speed);
                this.astronaut.flipX = true;
            } else if (this.cursors.right.isDown) {
                this.astronaut.body.setVelocityX(speed);
                this.astronaut.flipX = false;
                

            }

            // Verical movement
            if (this.cursors.up.isDown) {
                this.astronaut.body.setVelocityY(-speed);
            } else if (this.cursors.down.isDown) {
                this.astronaut.body.setVelocityY(speed);
            }

            // 특정 방향에서 속도가 빨라지는 현상으로 방지하기 위한 코드.
            this.astronaut.body.velocity.normalize().scale(speed);



            // emit player movement
            let x = this.astronaut.x;
            let y = this.astronaut.y;
            if (this.astronaut.oldPosition &&
                (x !== this.astronaut.oldPosition.x ||
                y !== this.astronaut.oldPosition.y)) {
                this.moving = true;
                this.socket.emit("playerMovement", {
                    x: this.astronaut.x,
                    y: this.astronaut.y,
                    roomKey: scene.state.roomKey,
                });
            }
            // save old position data
            this.astronaut.oldPosition = {
                x: this.astronaut.x,
                y: this.astronaut.y,
                rotation: this.astronaut.rotation,
            };
        }

    }

    addPlayer(scene, playerInfo) {
        scene.joined = true;
        scene.astronaut = scene.physics.add
            .sprite(playerInfo.x, playerInfo.y, "astronaut")
            .setOrigin(0.5, 0.5)
            .setSize(30, 40)
            .setOffset(0, 24);
    }
    addOtherPlayers(scene, playerInfo) {
        const otherPlayer = scene.add.sprite(
            playerInfo.x + 40,
            playerInfo.y + 40,
            "astronaut"
        );
        otherPlayer.playerId = playerInfo.playerId;
        scene.otherPlayers.add(otherPlayer);
    }
}

