
var mqtt = require('mqtt')
var config = require("./config.json");
var client = mqtt.connect(config.mqttURL);
var sub_callback = {
    "admin/log/trigger" : () => {
        console.log("Admin log has been triggered")
    },

    "admin/presence": () => { 
        console.log("Presence requested from") 
    }

}
var onConnectToResolve;
var onConnectToReject;
var onConnectPromise = new Promise( function(resolve, reject) {
    onConnectToResolve = resolve;
    onConnectToReject = reject;
});

client.on('connect', function () {
    subscribeTopic('presence', null, (err) => {
        if (!err) {
            client.publish('presence', 'Hello mqtt')
        }
    });
    subscribeTopic('homeSwitch/ready/+', null, (err) => {
        if (!err) {
            console.log("Subbed to homeSwithc/online");
        }
    });
    onConnectToResolve();
});

client.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic);
    console.log(message.toString());

    var allTopicSubbed = Object.keys(sub_callback);
    allTopicSubbed.forEach( (aSubTopic) => {
        if (topic === aSubTopic) {
            if (sub_callback[topic].promise || sub_callback[topic].resolve) {
                sub_callback[topic].resolve(message);
            } else {
                // in-case of callback
                if (sub_callback[topic]) {
                    console.log(sub_callback[topic]);
                    sub_callback[topic](message);
                }
            }
            
        }
    });
    // client.end()
});

function publish(topic, message) {
    client.publish(topic, message);
}

function subscribeTopic(topic , callback = null, onSuccess = null) {
    // TODO: kaaro
    // Check and wait if we have to that mqtt is connected. 
    // Workaround using a fargi promise in-place

    return subscribeTopicSafe(topic, callback, onSuccess);
}

function subscribeTopicSafe(topic , callback = null, onSuccess = null) {
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
            if(sub_callback[topic].promise) {
                console.warn("Overwriting a Promise with callback");
            } 
            sub_callback[topic] = callback;
            console.log("returning Null");
            return;
        } else {
            //we return the promise linked
            console.log("returning Old Promise", sub_callback[topic].promise);
            return sub_callback[topic].promise;
        }     
    } else {
        // we return and create a new Promise
        var promise_to_return = new Promise( (resolve, reject) => {
             sub_callback[topic] = {
                resolve: resolve,
                reject: reject
                }
             });
            sub_callback[topic].promise = promise_to_return;
            console.log("Promise To Return: "+ promise_to_return);
            return promise_to_return
                .then((message) => {
                    console.log(`kaaroMqtt|${topic}:${message}`);
                });
                
    }
}




module.exports = {
    publish,
    subscribeTopic,
    onConnectPromise
}