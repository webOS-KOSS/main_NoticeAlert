// eslint-disable-next-line import/no-unresolved
const pkgInfo = require('./package.json');
const Service = require('webos-service');
const luna = require("./luna_service");
const service = new Service(pkgInfo.name); // Create service by service name on package.json
const logHeader = "[" + pkgInfo.name + "]";
const mosquitto = require("mqtt");
const mqtt = require("./mqtt_lib");

const ip = "3.34.50.139";

var obj = undefined;
var device_func = undefined;

service.register("control", function(message){
    setTimeout(() => luna.toast("예약이 설정되었습니다"), 100);
    luna.tts("예약이 설정되었습니다!");
    device_func = obj.control.device + " " + obj.control.func + "!";
    var url = "luna://com.actest.app.service/reservation";
    luna.createActivity(url, obj.time.start);
});

service.register("reservation", function(message){
    luna.toast(device_func);
    luna.tts(device_func);
    mqtt.connect(ip);
    var level;
    if(obj.control.func == "on"){
        level = "5";
    }
    else if (obj.control.func == "off"){
        level = "1";
    }
    mqtt.publish("control/" + obj.control.device, level);
    console.log("control/" + obj.control.device, level);
});

service.register("child", function(message) {
    luna.init(service);

    mqtt.init(mosquitto);
    client = mqtt.connect(ip);
    mqtt.subscribe(["post/notice"]);
    mqtt.publish("control/led", "start");

    luna.toast("서비스 시작!");
    luna.tts("서비스 시작!");

    client.on("message", (topic, message, packet) =>{
        console.log("[topic] : " + topic);
        console.log("[message] : " + message);

        if (topic == "post/notice"){
            obj = JSON.parse(message);
            console.log(obj.recommend);
            if(obj.recommend){
                control = obj.control;
                control_time = obj.time;
                console.log(control);
                var params = `{ \"message\":\" ${obj.content.title}/${obj.content.body}\",\"buttons\":[{\"label\":\"Yes\",\"onclick\":\"luna://com.actest.app.service/control\"}, {"label":"No"}]}`;
                luna.alert(params);
            }
        }
    });

    //------------------------- heartbeat 구독 -------------------------
    const sub = service.subscribe(`luna://${pkgInfo.name}/heartbeat`, {subscribe: true});
    const max = 10000; //heart beat 횟수 /// heart beat가 꺼지면, 5초 정도 딜레이 생김 --> 따라서 이 녀석도 heart beat를 무한히 돌릴 필요가 있어보임.
    let count = 0;
    sub.addListener("response", function(msg) {
        console.log(JSON.stringify(msg.payload));
        if (++count >= max) {
            sub.cancel();
            setTimeout(function(){
                console.log(max+" responses received, exiting...");
                process.exit(0);
            }, 1000);
        }
    });
    message.respond({
        returnValue:true
    });
});

//----------------------------------------------------------------------heartbeat----------------------------------------------------------------------
// handle subscription requests
const subscriptions = {};
let heartbeatinterval;
let x = 1;
function createHeartBeatInterval() {
    if (heartbeatinterval) {
        return;
    }
    console.log(logHeader, "create_heartbeatinterval");
    heartbeatinterval = setInterval(function() {
        sendResponses();
    }, 1000);
}

// send responses to each subscribed client
function sendResponses() {
    console.log(logHeader, "send_response");
    console.log("Sending responses, subscription count=" + Object.keys(subscriptions).length);
    for (const i in subscriptions) {
        if (Object.prototype.hasOwnProperty.call(subscriptions, i)) {
            const s = subscriptions[i];
            s.respond({
                returnValue: true,
                event: "beat " + x
            });
        }
    }
    x++;
}

var heartbeat = service.register("heartbeat");
heartbeat.on("request", function(message) {
    console.log(logHeader, "SERVICE_METHOD_CALLED:/heartbeat");
    message.respond({event: "beat"}); // initial response 
    if (message.isSubscription) { 
        subscriptions[message.uniqueToken] = message; //add message to "subscriptions" 
        if (!heartbeatinterval) {
            createHeartBeatInterval();
        }
    } 
}); 
heartbeat.on("cancel", function(message) { 
    delete subscriptions[message.uniqueToken]; // remove message from "subscriptions" 
    var keys = Object.keys(subscriptions); 
    if (keys.length === 0) { // count the remaining subscriptions 
        console.log("no more subscriptions, canceling interval"); 
        clearInterval(heartbeatinterval);
        heartbeatinterval = undefined;
    } 
});
