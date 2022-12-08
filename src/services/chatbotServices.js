import { response } from "express";
import request from "request"
require('dotenv').config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;


let callSendAPI = (sender_psid, response) => {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    return request({
        "uri": "https://graph.facebook.com/v15.0/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}

let getUserName = (sender_psid) => {
    return new Promise((resolve, reject) => {
        try {
            // Send the HTTP request to the Messenger Platform
            let url = `https://graph.facebook.com/${sender_psid}?fields=first_name,last_name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`;
            request({
                "uri": url,
                "method": "GET",
            }, (err, res, body) => {
                if (!err) {
                    //convert string to json object
                    body = JSON.parse(body);
                    let username = `${body.last_name} ${body.first_name}`;
                    resolve(username);
                } else {
                    reject("Unable to send message:" + err);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
};


let handleGetStarted = (sender_psid) => {
    return new Promise(async (resolve, reject) => {
        try {
            let username = await getUserName(sender_psid);
            let response1 = {
                "text": `Xin chào,Cảm ơn ${username} đã liên hệ với ECT. Chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất! Trong thời gian chờ đợi phản hồi, bạn “vui lòng” trả lời một số câu hỏi để giúp ECT có thể hiểu rõ hơn về bạn!`
            }
            let response2 = { "text": 'Để bắt đầu, bạn có thể cho ECT biết:' }

            let response3 = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                            "title": "Bạn là phụ huynh hay học sinh?",

                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Phụ huynh",
                                    "payload": "yes",
                                },
                                {
                                    "type": "postback",
                                    "title": "Học sinh",
                                    "payload": "no",
                                }
                            ],
                        }]
                    }
                }
            };
            await sendMessage(sender_psid, response1);
            await sendMessage(sender_psid, response2);
            await sendMessage(sender_psid, response3);
            resolve("done");
        } catch (e) {
            reject(e);
        }
    })
}

module.exports = {
    handleGetStarted: handleGetStarted
}