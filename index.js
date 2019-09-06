
const http = require('http');
const admin = require('firebase-admin');
var serviceAccount = require("./firebase-config.json");
var config = require("./config.json");
const { post_log_message } = require("./discord-log");
const kaaroMqtt = require("./kaaro-mqtt");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.databaseURL
});


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
var firestore = admin.firestore();
var deviceDocRef = firestore.collection('/devices/');

deviceDocRef.where("online_status", "==", true).onSnapshot((snapshot) => {
    // console.log(snapshot);
    snapshot.docChanges().forEach(function (doc) {
        console.log("----------------------------");
        console.log(new Date());
        // console.log(doc.doc.data());
        if(doc.type === "modified") {
            sendValuesThroughMqtt(doc.doc.data());
        }
        console.log("----------------------------\n");

    });

}, (error) => {
    console.log(error);

});

function publishSwitchToMqtt(deviceId, switchId, value) {
    const topic = `HS/${deviceId}/all`;
    const toSendValue = `12345/${deviceId}/${switchId}/${value}`;
    kaaroMqtt.publish(topic, toSendValue);
    console.log(`Sending ${topic} : ${toSendValue}`);
}

function sendValuesThroughMqtt(doc) {
    if (!doc) {
        return;
    }
    var deviceId = doc.deviceID;
    var data = doc.switchTraits.split(".").join("");
    allSwitchTraits = doc.switchTraits.split(".");
    console.log({
        deviceId, data
    });
    post_log_message(deviceId, data);
    var switchId = doc.lastUpdated; // Index starting from 1
    var valueToPrint = allSwitchTraits[switchId-1];
    publishSwitchToMqtt(deviceId, switchId, valueToPrint);
}
function sendSummaryThroughMqtt(doc) {
    if (!doc) {
        return
    }
    var deviceId = doc.deviceID;
    var data = doc.switchTraits.split(".").join("");
    // allSwitchTraits = doc.switchTraits.split(".");
    const topic = `HS/${deviceId}/status`;
    const toSendValue = data;
    kaaroMqtt.publish(topic, toSendValue);
    console.log(`Sending ${topic} : ${toSendValue}`);
}


kaaroMqtt.onConnectPromise.then(() => {
    var sub = kaaroMqtt.subscribeTopic('homeSwitch/ready/+');
    // console.log(sub);
    sub.subscribe((fromMqtt) => {
        var topic = fromMqtt.topic;
        var message = fromMqtt.message;
        console.log(`inCreated|${topic}:${message}`);
        
        var topicSplit = topic.split('/');
        if(topicSplit[2]) {
            var deviceID = topicSplit[2];
            console.log(`inCreated| deviceID = ${deviceID}`);
            deviceDocRef.doc(deviceID).get()
                .then((doc) => {
                    console.log("---------OnReady----------");
                    console.log(new Date());
                    // console.log(doc.data());
                    sendSummaryThroughMqtt(doc.data());
                    console.log(`----------${deviceID}-----------\n`);
                });
        }
    });
});

