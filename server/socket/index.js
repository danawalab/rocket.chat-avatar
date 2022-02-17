const rooms = {
    // 공용
    "general": {
        roomKey: "general",
        players: {},
        numPlayers: 0,
    }
};

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log(`A socket connection to the server has been made: ${socket.id}`);

        socket.on("joinRoom", (roomKey, input) => {
            socket.join(roomKey);
            const roomInfo = rooms[roomKey];

            roomInfo.players[socket.id] = {
                rotation: 0,
                x: 400,
                y: 300,
                playerId: socket.id,
                ...input
            };

            roomInfo.numPlayers = Object.keys(roomInfo.players).length;

            socket.emit("setState", roomInfo);

            socket.emit("currentPlayers", {
                players: roomInfo.players,
                numPlayers: roomInfo.numPlayers,
            });

            // 새로운 플레이어
            socket.to(roomKey).emit("newPlayer", {
                playerInfo: roomInfo.players[socket.id],
                numPlayers: roomInfo.numPlayers,
            });
        });

        // 아바타 이동
        socket.on("playerMovement", function (data) {
            try {
                const {x, y, roomKey} = data;
                if (x && y) {
                    rooms[roomKey].players[socket.id].x = x;
                    rooms[roomKey].players[socket.id].y = y;
                    socket.to(roomKey).emit("playerMoved", rooms[roomKey].players[socket.id]);
                }
            } catch (e) {
                console.warn(e);
            }
        });
        socket.on("playerStopped", function (data) {
            const { x, y, roomKey } = data;
            rooms[roomKey].players[socket.id].x = x;
            rooms[roomKey].players[socket.id].y = y;
            socket
                .to(roomKey)
                .emit("otherPlayerStopped", rooms[roomKey].players[socket.id]);
        });

        // 연결끊기
        socket.on("disconnect", function () {
            //find which room they belong to
            let roomKey = 0;
            for (let keys1 in rooms) {
                for (let keys2 in rooms[keys1]) {
                    Object.keys(rooms[keys1][keys2]).map((el) => {
                        if (el === socket.id) {
                            roomKey = keys1;
                        }
                    });
                }
            }

            const roomInfo = rooms[roomKey];

            if (roomInfo) {
                console.log("user disconnected: ", socket.id);
                // remove this player from our players object
                delete roomInfo.players[socket.id];
                // update numPlayers
                roomInfo.numPlayers = Object.keys(roomInfo.players).length;
                // emit a message to all players to remove this player
                io.to(roomKey).emit("disconnected", {
                    playerId: socket.id,
                    numPlayers: roomInfo.numPlayers,
                });
            }
        });

        socket.on("isKeyValid", function (roomKey, input) {
            if (!Object.keys(rooms).includes(roomKey)) {
                rooms[roomKey] = {
                    roomKey,
                    players: {},
                    numPlayers: 0,
                }
            }
            socket.emit("keyIsValid", roomKey, input);
        });
        // get a random code for the room
        socket.on("getRoomCode", async function (roomKey) {
            socket.emit("roomCreated", roomKey || "general");
        });


    });
};
