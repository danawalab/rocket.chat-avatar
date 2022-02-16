import { OpenVidu } from "openvidu-browser";

export default class OpenviduHandler {

    constructor() {
        this.OV = null
        this.session = null;
        this.roomKey = null;    	// Name of the video session the user will connect to
        this.token = null;			// Token retrieved from OpenVidu Server

        console.log("openvidu")
    }

    async joinSession(roomKey, userName) {

        // session login

        const loginResponse = await fetch("api-login/login", {
            method: "POST",
            body: JSON.stringify({user: userName}),
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            }
        })

        console.log("step 1. logged ", loginResponse.status);

        // get token

        const getTokenResponse = await fetch("api-sessions/get-token", {
            method: "POST",
            body: JSON.stringify({sessionName: roomKey}),
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            }
        })

        const getTokenBody = await getTokenResponse.json()
        const token = getTokenBody[0]
        console.log("step 2. getToken ", getTokenBody);


        // --- 1) Get an OpenVidu object ---

        const OV = new OpenVidu();

        // --- 2) Init a session ---

        const session = OV.initSession();

        // --- 3) Specify the actions when events take place in the session ---

        // On every new Stream received...
        session.on('streamCreated', (event) => {

            // Subscribe to the Stream to receive it
            // HTML video will be appended to element with 'video-container' id
            const subscriber = session.subscribe(event.stream, 'video-container');

            // When the HTML video has been appended to DOM...
            subscriber.on('videoElementCreated', (event) => {

                // Add a new HTML element for the user's name and nickname over its video
                // 비디오 추가
                this.appendUserData(event.element, subscriber.stream.connection);
            });
        });

        // On every Stream destroyed...
        session.on('streamDestroyed', (event) => {
            // Delete the HTML element with the user's name and nickname
            // 비디오 삭제
            this.removeUserData(event.stream.connection);
        });

        // On every asynchronous exception...
        session.on('exception', (exception) => {
            console.warn(exception);
        });


        // --- 4) Connect to the session passing the retrieved token and some more data from
        //        the client (in this case a JSON with the nickname chosen by the user) ---

        await session.connect(token, { clientData: userName })


        // --- 6) Get your own camera stream ---

        const publisher = OV.initPublisher('video-container', {
            audioSource: undefined, // The source of audio. If undefined default microphone
            videoSource: false, // The source of video. If undefined default webcam
            publishAudio: true,  	// Whether you want to start publishing with your audio unmuted or not
            publishVideo: false,  	// Whether you want to start publishing with your video enabled or not
            insertMode: 'APPEND',	// How the video is inserted in the target element 'video-container'
            mirror: false       	// Whether to mirror your local video or not
        });

        // --- 7) Specify the actions when events take place in our publisher ---

        // When our HTML video has been added to DOM...
        publisher.on('videoElementCreated', (event) => {
            // Init the main video with ours and append our data
            console.log("videoElementCreated", event)
            const userData = { userName };
            // this.initMainVideo(event.element, userData);
            this.appendUserData(event.element, userData);
            event.element.setAttribute("muted", true); // Mute local video
        });


        // --- 8) Publish your stream ---
        navigator.getUserMedia({ audio: true, video: false}, function (stream) {
            if (stream.getAudioTracks().length > 0) {
                console.log("publisher")
                session.publish(publisher);
            } else {
                console.log("viewer")
            }
        }, function (error) {
            // code for when there is an error
            console.warn(error);
            console.warn("viewer mode");
        });

        this.OV = OV;
        this.session = session;
        this.roomKey = roomKey;
        this.token = token;

        window.onbeforeunload = () => { // Gracefully leave session
            if (session) {
                this.removeUser();
                this.leaveSession();
            }
            this.logOut();
        }

    }
    appendUserData(videoElement, connection) {
        const nodeId = connection.connectionId;
        const dataNode = document.createElement('div');
        dataNode.id = "data-" + nodeId;
        videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
    }
    removeUserData(connection) {
        const userNameRemovedList = document.querySelectorAll("#data-" + connection.connectionId);
        userNameRemovedList.forEach(element => element.remove())
    }
    removeUser() {
        fetch('api-sessions/remove-user', {
            method: "POST",
            body: JSON.stringify({sessionName: this.roomKey, token: this.token}),
        })
            .then(response => console.warn("You have been removed from session " + this.roomKey))
            .catch(error => console.warn("You have been removed from session error.."))

    }
    leaveSession() {
        this.removeUser();
        // --- 9) Leave the session by calling 'disconnect' method over the Session object ---

        this.session.disconnect();
        this.session = null;

        // Removing all HTML elements with the user's nicknames
        document.querySelectorAll(".data-node").forEach(element => element.remove());
    }
    logOut() {
        fetch('api-login/logout', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        })
    }
}

