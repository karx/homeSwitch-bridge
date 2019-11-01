//2761046797
console.log("starting");

var mqtt = require('mqtt');
var config = require("./config.json");

console.log("connecting");
var client = mqtt.connect({
    host: config.mqttURL,
    debug: true});

client.on('connect',async function () {
    console.log("connected");
    await runTest1();
    await runTest2();
    await runTest3();
    client.end();
});

client.on('error', (err) => {
    console.log(err);
})

async function runTest1() {
    //simulate a ready
    client.publish('homeSwitch/ready/2761046797','1.1.1.1.1.1.1.0');
    console.log("published");
    var promiseResoulutionPointer;
    // var promiseToReturn = Promise.
}

async function runTest2() {
    //simulate a button click

}

async function runTest3() {
    //TBD
}
