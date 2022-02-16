const path = require("path");
const https = require('https');
const redirectToHTTPS = require('express-http-to-https').redirectToHTTPS
const express = require("express");
const session = require('express-session');
const morgan = require("morgan");
const compression = require("compression");
const socketio = require("socket.io");
const OpenVidu = require('openvidu-node-client').OpenVidu;
const OpenViduRole = require('openvidu-node-client').OpenViduRole;
const fs = require('fs');
const bodyParser = require('body-parser');
const config = require("./config/config")

const PORT = process.env.PORT || 3000;
const app = express();

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

// Collection to pair session names with OpenVidu Session objects
let mapSessions = {};
// Collection to pair session names with tokens
let mapSessionNamesTokens = {};

// ***** openvidu URI ****** //

const OV = new OpenVidu(config.OPENVIDU_URL, config.OPENVIDU_SECRET);

const createSession = (res, sessionName, connectionProperties) => {
    // New session
    console.log('New session ' + sessionName);

    // Create a new OpenVidu Session asynchronously
    OV.createSession()
        .then(session => {
            // Store the new Session in the collection of Sessions
            mapSessions[sessionName] = session;
            // Store a new empty array in the collection of tokens
            mapSessionNamesTokens[sessionName] = [];

            // Generate a new connection asynchronously with the recently created connectionProperties
            session.createConnection(connectionProperties)
                .then(connection => {

                    // Store the new token in the collection of tokens
                    mapSessionNamesTokens[sessionName].push(connection.token);

                    // Return the Token to the client
                    res.status(200).send({
                        0: connection.token
                    });
                })
                .catch(error => {
                    console.error(error);
                });
        })
        .catch(error => {
            console.error(error);
        });

}

const createApp = () => {
    app.use(morgan("dev"));
    app.use(redirectToHTTPS([/localhost:(\d{4})/], [/\/insecure/], 301));

    app.use(express.json());
    app.use(bodyParser.json({
        type: 'application/vnd.api+json'
    }));
    app.use(express.urlencoded({extended: true}));
    app.use(compression());

    app.use(session({
        saveUninitialized: true,
        resave: false,
        secret: config.OPENVIDU_SECRET,
        cookie: {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
            maxAge: 60 * 60 * 24 * 1000
        },
    }));

    app.use(express.static(path.join(__dirname, "..", "public")));

    app.use((req, res, next) => {
        if (path.extname(req.path).length) {
            const err = new Error("Not found");
            err.status = 404;
            next(err);
        } else {
            next();
        }
    });




    /* REST API */

    // Login
    app.post('/api-login/login', function (req, res) {
        // Retrieve params from POST body
        const user = req.body.user;
        console.log("Logging in | {user}={" + user + "}");

        if (user) { // Correct user-pass
            // Validate session and return OK
            // Value stored in req.session allows us to identify the user in future requests
            console.log("'" + user + "' has logged in");
            req.session.loggedUser = user;
            res.status(200).send();
        } else { // Wrong user-pass
            // Invalidate session and return error
            console.log("'" + user + "' invalid credentials");
            req.session.destroy();
            res.status(401).send('User/Pass incorrect');
        }
    });

    // Logout
    app.post('/api-login/logout', function (req, res) {
        console.log("'" + req.session.loggedUser + "' has logged out");
        req.session.destroy();
        res.status(200).send();
    });

    // Get token (add new user to session)
    app.post('/api-sessions/get-token', function (req, res) {
        if (!isLogged(req.session)) {
            req.session.destroy();
            res.status(401).send('User not logged');
        } else {
            // The video-call to connect
            const sessionName = req.body.sessionName;

            // Role associated to this user
            // const role = users.find(u => (u.user === req.session.loggedUser)).role;
            const role = OpenViduRole.PUBLISHER

            // Optional data to be passed to other users when this user connects to the video-call
            // In this case, a JSON with the value we stored in the req.session object on login
            const serverData = JSON.stringify({serverData: req.session.loggedUser});

            console.log("Getting a token | {roomKey}={" + sessionName + "}");

            const connectionProperties = {
                data: serverData,
                role: role
            };

            if (mapSessions[sessionName]) {
                // Session already exists
                console.log('Existing session ' + sessionName);

                // Get the existing Session from the collection
                const mySession = mapSessions[sessionName];

                // Generate a new token asynchronously with the recently created connectionProperties
                mySession.createConnection(connectionProperties)
                    .then(connection => {

                        // Store the new token in the collection of tokens
                        mapSessionNamesTokens[sessionName].push(connection.token);

                        // Return the token to the client
                        res.status(200).send({
                            0: connection.token
                        });
                    })
                    .catch(error => {
                        console.error(error);
                        createSession(res, sessionName, connectionProperties);
                    });
            } else {
                createSession(res, sessionName, connectionProperties);
            }
        }
    });

    // Remove user from session
    app.post('/api-sessions/remove-user', function (req, res) {
        if (!isLogged(req.session)) {
            req.session.destroy();
            res.status(401).send('User not logged');
        } else {
            // Retrieve params from POST body
            const sessionName = req.body.sessionName;
            const token = req.body.token;
            console.log('Removing user | {sessionName, token}={' + sessionName + ', ' + token + '}');

            // If the session exists
            if (mapSessions[sessionName] && mapSessionNamesTokens[sessionName]) {
                const tokens = mapSessionNamesTokens[sessionName];
                const index = tokens.indexOf(token);

                // If the token exists
                if (index !== -1) {
                    // Token removed
                    tokens.splice(index, 1);
                    console.log(sessionName + ': ' + tokens.toString());
                } else {
                    const msg = 'Problems in the app server: the TOKEN wasn\'t valid';
                    console.log(msg);
                    res.status(500).send(msg);
                }
                if (tokens.length === 0) {
                    // Last user left: session must be removed
                    console.log(sessionName + ' empty!');
                    delete mapSessions[sessionName];
                }
                res.status(200).send();
            } else {
                const msg = 'Problems in the app server: the SESSION does not exist';
                console.log(msg);
                res.status(500).send(msg);
            }
        }
    });

    function isLogged(session) {
        return (session.loggedUser != null);
    }

    app.use("*", (req, res) => {
        res.sendFile(path.join(__dirname, "..", "public/index.html"));
    });

    app.use((err, req, res, next) => {
        console.error(err);
        console.error(err.stack);
        res.status(err.status || 500).send(err.message || "Internal server error.");
    });

};

const startListening = () => {
    const options = {
        key: fs.readFileSync(path.join(__dirname, "certificate.key")),
        cert: fs.readFileSync(path.join(__dirname, "certificate.pem"))
    };
    // console.log(options);
    const server = https.createServer(options, app).listen(PORT, () => {
        console.log(`Server Listen. PORT: ${PORT}`);
    });

    const io = socketio(server);
    require("./socket")(io);
}

async function bootApp() {
    await createApp();
    await startListening();
}

if (require.main === module) {
    bootApp();
} else {
    createApp();
}

module.export = app;