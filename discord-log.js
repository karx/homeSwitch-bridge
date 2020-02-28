const request = require('./await-request');
var config = require("./config.json");

async function post_log_message(title, desc) {
    // let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    // var msg = await request({
    //     method: 'post',
    //     url: config.discord_webhook,
    //     form : JSON.stringify({ 
    //         "content" : "homeSwitch-bridge", 
    //         "embeds" : [{
    //             "title" : title,
    //             "description" : desc,
    //             "url": "https://akriya.co.in"
    //         }]
    //     }),
    //     headers: headers
    //     // json: true
    // });
    console.log(title, desc);
}


module.exports = {
    post_log_message
}

