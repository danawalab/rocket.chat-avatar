
const maximum = process.env.MAXIMUM || 20;

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
      
      socket.on("joinRoom", (roomKey, username) => {
        socket.join(roomKey);
        const roomInfo = rooms[roomKey];

        roomInfo.players[socket.id] = {
          rotation: 0,
          x: 400,
          y: 300,
          playerId: socket.id,
          username: username
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
        const { x, y, roomKey } = data;
        if (x && y && rooms[roomKey]?.players[socket.id]) {
          rooms[roomKey].players[socket.id].x = x;
          rooms[roomKey].players[socket.id].y = y;
          socket.to(roomKey).emit("playerMoved", rooms[roomKey].players[socket.id]);
        }
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
  
      socket.on("isKeyValid", function (rookKey, input) {
        Object.keys(rooms).includes(rookKey)
          ? socket.emit("keyIsValid", rookKey, input)
          : socket.emit("keyNotValid");
      });
      // get a random code for the room
      socket.on("getRoomCode", async function () {
        //TODO 대화방마다 고유한값으로 식별한다. 처음엔 general 코드로 개발 진행 중..
        socket.emit("roomCreated", "general");
      });





      // 이하 audio
      socket.on("offer", offer => {
        socket.to(offer.id).emit("getOffer", {
          sdp: offer.sdp,
          offerSendID: offer.offerSendID
        });
      });

      socket.on("answer", answer => {
        socket.to(answer.id).emit("getAnswer", {
          sdp: answer.sdp,
          answerSendID: answer.answerSendID,
        });
      });

      socket.on("candidate", candidate => {
        socket.to(candidate.id).emit("getCandidate", {
          candidate: candidate.candidate,
          candidateSendID: candidate.candidateSendID,
        });
      });





    });
  };
  
  // function codeGenerator() {
  //   let code = "";
  //   let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  //   for (let i = 0; i < 5; i++) {
  //     code += chars.charAt(Math.floor(Math.random() * chars.length));
  //   }
  //   // return code;
  //   // test return...
  //   return "ABCD";
  // }