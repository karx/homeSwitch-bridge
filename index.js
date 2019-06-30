

const http = require('http');
const admin = require('firebase-admin');


var serviceAccount = require("./firebase-config.json");
var config = require("./config.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.databaseURL
});

var mqtt = require('mqtt')
var client = mqtt.connect(config.mqttURL);

const hostname = '127.0.0.1';
const port = 3197;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World\n');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});


//firebase things
var firebase = admin.firestore();
var deviceDocRef = firebase.collection('/devices/');

deviceDocRef.where("online_status", "==", true).onSnapshot((snapshot) => {
    // console.log(snapshot);
    snapshot.docChanges().forEach(function (doc) {
        console.log("----------------------------");
        
        // console.log(doc.doc.data());
        if(doc.type === "modified" || true) {
            sendValuesThroughMqtt(doc.doc.data());
        }
        console.log("----------------------------\n\n");

    });

}, (error) => {
    console.log(error);

});

client.on('connect', function () {
    client.subscribe('presence', function (err) {
        if (!err) {
            client.publish('presence', 'Hello mqtt')
        }
    });
    client.subscribe('homeSwitch/ready/+', (err) => {
        if (!err) {
            console.log("Subbed to homeSwithc/online");
        }
    })
});

client.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic);
    console.log(message.toString())
    // client.end()
});
// xxxxx/deviceId/*
function publishToMqtt(deviceId, data) {
        client.publish(`HS/${deviceId}/all`, data );
}

function sendValuesThroughMqtt(doc) {
    var deviceId = doc.deviceID;
    var data = doc.switchTraits.split(".").join("");
    console.log({
        deviceId, data
    });
    publishToMqtt(deviceId, data);
}
