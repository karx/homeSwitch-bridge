const http = require("http");
const admin = require("firebase-admin");
var serviceAccount = require("./firebase-config.json");
var config = require("./config.json");
const { post_log_message } = require("./discord-log");
const kaaroMqtt = require("./kaaro-mqtt");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: config.databaseURL
});

const hostname = "127.0.0.1";
const port = 3197;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello World\n");
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

//firebase things
var firestore = admin.firestore();
var deviceDocRef = firestore.collection("/devices/");

deviceDocRef.where("online_status", "==", true).onSnapshot(
  snapshot => {
    // console.log(snapshot);
    console.log("update detected from firebase");
    snapshot.docChanges().forEach(function(doc) {
      console.log("----------------------------");
      console.log(new Date());
      // console.log(doc.doc.data());
      if (doc.type === "modified") {
        sendSummaryThroughMqtt(doc.doc.data());
      } else {
        post_log_message(
          "Not published on MQTT FirebaseChange",
          doc.doc.data()
        );
      }
      console.log("----------------------------\n");
      let deviceData = doc.doc.data();
      console.log(deviceData.deviceID);
      for (let i = 0; i < 8; i++) {
        // if on or off timer still in future, update the device about it.
        if (
          deviceData[`timer${i + 1}`] &&
          deviceData[`timer${i + 1}Off`] &&
          (deviceData[`timer${i + 1}`].toDate() > Date.now() ||
            deviceData[`timer${i + 1}Off`] > Date.now())
        ) {
          // console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')   ;
          publishRTCtoMQTT(
            deviceData.deviceID,
            deviceData[`timer${i + 1}String`]
          );
        }
      }
    });
  },
  error => {
    console.log(error);
  }
);

function publishRTCtoMQTT(deviceId, value) {
  const topic = `HS/${deviceId}/all`;
  const toSendValue = value;
  post_log_message(
    `updating RTC info to device ${deviceId}`,
    `Value sent: ${value}`
  );
  kaaroMqtt.publish(topic, toSendValue);
  console.log(`Sending ${topic} : ${toSendValue}`);
}

function sendSummaryThroughMqtt(doc, force = false) {
  if (!doc) {
    return;
  }
  var deviceId = doc.deviceID;
  var data = doc.switchTraits.split(".").join("");

  var lastMQTTUpdate = doc.updateFromMQTT;
  var lastMobileUpdate = doc.lastMobileUpdate;
  var lastValueFromFirebase = doc.switchTraits;
  var lastValuesFromDevice = doc.switchTraitsFromMQTT;
  if (!lastMQTTUpdate) {
    const topic = `HS/${deviceId}/status`;
    const toSendValue = data;
    kaaroMqtt.publish(topic, toSendValue);
    console.log(`Sending ${topic} : ${toSendValue}`);
    post_log_message(
        `MQTT update | as Device First connection`,
        ` Sending Update \n Device: ${deviceId} | Data: ${data} \n lastMQTTUpdate > lastMobileUpdate  : ${lastMQTTUpdate >
          lastMobileUpdate} && lastValueFromFirebase != lastValuesFromDevice : ${lastValueFromFirebase != lastValuesFromDevice}
          
          Publishing @${topic}`
      );
  } else if (
    (lastMobileUpdate &&
    lastMQTTUpdate &&
    lastMobileUpdate > lastMQTTUpdate &&
    lastValueFromFirebase != lastValuesFromDevice)
  ) {
    // allSwitchTraits = doc.switchTraits.split(".");
    const topic = `HS/${deviceId}/status`;
    const toSendValue = data;
    kaaroMqtt.publish(topic, toSendValue);
    console.log(`Sending ${topic} : ${toSendValue}`);
    post_log_message(
        `MQTT update | as Mobile Latest`,
        `  \n Device: ${deviceId} | Data: ${data} \n lastMQTTUpdate > lastMobileUpdate  : ${lastMQTTUpdate >
          lastMobileUpdate} && lastValueFromFirebase != lastValuesFromDevice : ${lastValueFromFirebase != lastValuesFromDevice}
          
          Publishing @${topic}`
      );
  } else if (
    (lastMobileUpdate &&
    lastMQTTUpdate &&
    lastMQTTUpdate > lastMobileUpdate &&
    lastValueFromFirebase != lastValuesFromDevice) && force
  ) {
    post_log_message(
        `MQTT update | as force and MQTT was latest`,
        `  \n Device: ${deviceId} | Data: ${data} \n lastMQTTUpdate > lastMobileUpdate  : ${lastMQTTUpdate >
          lastMobileUpdate} && lastValueFromFirebase != lastValuesFromDevice : ${lastValueFromFirebase !=
          lastValuesFromDevice}`
      );
    const topic = `HS/${deviceId}/status`;
    const toSendValue =  doc.switchTraitsFromMQTT.split(".").join("");;
    kaaroMqtt.publish(topic, toSendValue);
    console.log(`Sending ${topic} : ${toSendValue}`);
  } else {
    post_log_message(
        `MQTT No Send update | Not sending`,
        ` device seems to be latest state \n Device: ${deviceId} | Data: ${data} \n lastMQTTUpdate > lastMobileUpdate  : ${lastMQTTUpdate >
          lastMobileUpdate} && lastValueFromFirebase != lastValuesFromDevice : ${lastValueFromFirebase !=
          lastValuesFromDevice}`
      );
  }
}

async function updateStateToFirebase(deviceId, message) {
  if (
    message &&
    message.length &&
    message.length === "0.1.1.1.1.1.1.1".length
  ) {
    var switchTraitsRaw = message;
    post_log_message(`FROM MQTT -> updating to Firebase ${deviceId}`, message);
    return deviceDocRef.doc(deviceId).update({
      switchTraitsFromMQTT: switchTraitsRaw,
      updateFromMQTT: Date.now()
    });
  } else {
    return;
  }
}

kaaroMqtt.onConnectPromise.then(() => {
  var sub = kaaroMqtt.subscribeTopic("homeSwitch/status/+");

  // console.log(sub);
  sub.subscribe(async fromMqtt => {
    var topic = fromMqtt.topic;
    var message = fromMqtt.message;
    console.log(`inCreated|${topic}:${message}`);
    post_log_message(
      "Message from MQTT on homeSwitch/status/+",
      `Topic: ${topic} | Message:${message}`
    );
    var topicSplit = topic.split("/");
    if (topicSplit[2]) {
      var deviceID = topicSplit[2];
      console.log(`inCreated| deviceID = ${deviceID}`);
      var updateFirebasResult = await updateStateToFirebase(deviceID, message);
    }
  });

  var sub2 = kaaroMqtt.subscribeTopic("homeSwitch/ready/+");
  // console.log(sub);
  sub2.subscribe(async fromMqtt => {
    var topic = fromMqtt.topic;
    var message = fromMqtt.message;
    console.log(`inCreated|${topic}:${message}`);
    post_log_message(
      "Message from MQTT on homeSwitch/ready/+",
      `Topic: ${topic} | Message:${message}`
    );
    var topicSplit = topic.split("/");
    if (topicSplit[2]) {
      var deviceID = topicSplit[2];
      deviceDocRef
        .doc(deviceID)
        .get()
        .then(doc => {
          console.log("---------OnReady----------");
          console.log(new Date());
          // console.log(doc.data());
          sendSummaryThroughMqtt(doc.data(), true);
          console.log(`----------${deviceID}-----------\n`);
        });
    }
  });
});
