const streamConstraints = { audio: true, video: false };
const iceServers = {
    iceServers: [
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "stun:stun.l.google.com:19302" },
    ]
};

class WebRTCAudio {

    constructor() {
        this.localStream = null;
        this.rtcPeerConnections = {};
    }

    connect(socket) {
        this.socket = socket;
        navigator.mediaDevices
            .getUserMedia(streamConstraints)
            .then(function (stream) {
                const myAudio = document.querySelector("#myAudio");
                myAudio.setAttribute("autoplay", "true");
                myAudio.setAttribute("controls", "true");
                myAudio.volume = 0.2;
                myAudio.srcObject = stream;
            })
            .catch(function (err) {
                console.log("An error occurred when accessing media devices", err);
            });
    }
    newListener(listener) {
        this.rtcPeerConnections[listener.id] = new RTCPeerConnection(iceServers);

        const audio = document.querySelector("#myAudio");
        audio.setAttribute("autoplay", "true");
        audio.setAttribute("controls", "true");
        audio.volume = 0.5;

        const stream = audio.srcObject;
        stream
            .getTracks()
            .forEach((track) => this.rtcPeerConnections[listener.id].addTrack(track, stream));

        this.rtcPeerConnections[listener.id].onicecandidate = (event) => {
            if (event.candidate) {
                console.log("sending ice candidate");
                socket.emit("candidate", listener.id, {
                    type: "candidate",
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                });
            }
        };

        this.rtcPeerConnections[listener.id]
            .createOffer()
            .then((sessionDescription) => {
                this.rtcPeerConnections[listener.id].setLocalDescription(sessionDescription);
                socket.emit("offer", listener.id, {
                    type: "offer",
                    sdp: sessionDescription,
                    broadcaster: user,
                });
            })
            .catch((error) => {
                console.log(error);
            });

        let li = document.createElement("li");
        li.innerText = viewer.name + " has joined";
        viewers.appendChild(li);
    }

    volumeUp(scene, num) {
        this.alertVolumeInfo(scene, 50, 70, "");
    }
    volumeDown(scene, num) {
        this.alertVolumeInfo(scene, 50, 70, "");
    }
    alertVolumeInfo(scene, x, y, text, {fill, fontSize, fontStyle} = {fill: "#ff0000", fontSize: "24px", fontStyle: "bold"}) {
        scene.audioAlert = scene.add.text(x, y, text, { fill, fontSize, fontStyle});
        setTimeout(() => {scene.audioAlert.destroy();}, 500)
    }
}

export default new WebRTCAudio();
