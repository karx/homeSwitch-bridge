
var mqtt = require('mqtt');
var mqtt_match = require('mqtt-match');
var config = require("./config.json");
var client;
var { Observable } = require('rxjs');

var sub_callback = {
    "admin/log/trigger": () => {
        console.log("Admin log has been triggered")
    },

    "admin/presence": () => {
        console.log("Presence requested from")
    }

}
var onConnectToResolve;
var onConnectToReject;
var onConnectPromise = new Promise(function (resolve, reject) {
    onConnectToResolve = resolve;
    onConnectToReject = reject;
});


function init() {
    console.log('mqtt init fn');
    client = mqtt.connect({
        host: config.mqttURL
    });
    console.log(client);
    client.on('connect', function () {
        console.log('mqtt client connected');
        subscribeTopic('homeSwitch/presence', null, (err) => {
            if (!err) {
                console.log("On success of sub to presence");
                client.publish('homeSwitch/presenceResponse', 'Hello mqtt')
            }
        });
        subscribeTopic('homeSwitch/ready/+', null, (err) => {
            if (!err) {
                console.log("On success of sub to homeSwitch/ready/+");
                console.log("Subbed to homeSwithc/online");
            }
        });
        console.log("Connected to MQTT");
        onConnectToResolve();
    });
    client.on('error', (error) => {
        console.log(error);
    });
    client.on('end', () => {
        console.log('end');
    });
    client.on('offline', () => {
        console.log('offline');
    });
    client.on('message', function (topic, message) {
        // message is Buffer
        console.log(topic);
        console.log(message.toString());

        var allTopicSubbed = Object.keys(sub_callback);
        console.log(allTopicSubbed);
        console.log(sub_callback);
        allTopicSubbed.forEach((aSubTopic) => {
            if (mqtt_match(aSubTopic, topic)) {

                if (sub_callback[aSubTopic]) {
                    console.log(sub_callback[aSubTopic]);
                    console.log(aSubTopic);
                    if (sub_callback[aSubTopic].subscriber) {
                        console.log('resolveing now');
                        sub_callback[aSubTopic].subscriber.next(
                            {
                                topic: topic,
                                message: message.toString()
                            }
                        );
                    } else if (typeof sub_callback[aSubTopic] === "function") {
                        // in-case of callback
                        sub_callback[aSubTopic](message);
                    } else {
                        console.warn("[Ignored Value Warning] No subscribed found for topic: " + topic);
                    }

                } else {
                    console.warn("[Ignored Value Warning]No specific callback for subscribed topic: " + topic);
                }

            }
        });
        // client.end()
    });
}
function publish(topic, message) {
    client.publish(topic, message);
}

function subscribeTopic(topic, callback = null, onSuccess = null) {
    // TODO: kaaro
    // Check and wait if we have to that mqtt is connected. 
    // Workaround using a fargi promise in-place

    return subscribeTopicSafe(topic, callback, onSuccess);
}

function subscribeTopicSafe(topic, callback = null, onSuccess = null) {
    if (onSuccess) {
        client.subscribe(topic, onSuccess);
    } else {
        client.subscribe(topic, () => {
            console.log(`subscribed to ${topic} `);
        });
    }
    // if we have already a record for this topic

    if (sub_callback[topic]) {
        if (callback) {
            //if we have explicit overwrite callback function
            if (sub_callback[topic].observable) {
                console.warn("Overwriting a Promise with callback");
            }
            sub_callback[topic] = callback;
            console.log("returning Null");
            return;
        } else {
            //we return the promise linked
            console.log("returning Old Promise", sub_callback[topic]);
            return sub_callback[topic].observable;
        }
    } else {
        // we return and create a new Promise
        sub_callback[topic] = {

        }
        console.log("Starting New Observable for " + topic);
        var observable_to_return = new Observable((subscriber) => {
            console.log("Setting subscriber for topic " + topic);
            sub_callback[topic].subscriber = subscriber;
            console.log("Set subscriber");
            console.log(sub_callback[topic]);

        });
        // setTimeout( () => {console.log("Kartik")}, 0);
        sub_callback[topic].observable = observable_to_return;
        console.log("Promise To Return: ");
        console.log(observable_to_return);
        return observable_to_return;
        // .((message) => {
        //     console.log(`kaaroMqtt|${topic}:${message}`);
        // });

    }
}


module.exports = {
    publish,
    subscribeTopic,
    onConnectPromise,
    init
}