require('dotenv').config();
import request from "request";
import "../services/Ten"
import { forwardState, getCurrentState, setState } from "../services/Ten";
import chatbotServices from "../services/chatbotServices"

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

//process.env.NAME_VARIABLES
let getHomePage = (req, res) => {
    return res.render('homepage.ejs');
};

let postWebhook = (req, res) => {
    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);


            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
}

let getWebhook = (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
}

// Handles messages events
function handleMessage(sender_psid, received_message) {

    let response;

    // Checks if the message contains text
    if (received_message.text) {
        // Create the payload for a basic text message, which
        // will be added to the body of our request to the Send API
        if (getCurrentState(sender_psid) === 'PH') {
            response = { "text": 'Ngày tháng năm sinh của bạn' }
            callSendAPI(sender_psid, response)
            setState(sender_psid, 'PH BOD')
        }

        else if (getCurrentState(sender_psid) === 'PH BOD') {
            response = { "text": 'Số điện thoại của phụ huynh (anh/chị)' }
            callSendAPI(sender_psid, response)
            setState(sender_psid, 'PH NUMBER')
        }

        else if (getCurrentState(sender_psid) === 'PH NUMBER') {
            response = { "text": '  Cảm ơn phụ huynh (anh/chị) đã trả lời, ECT sẽ phản hồi trong thời gian sớm nhất' }
            callSendAPI(sender_psid, response)
            setState(sender_psid, 'PH END')
        }

        else if (getCurrentState(sender_psid) === 'HS') {
            response = { "text": 'Ngày tháng năm sinh em' }
            callSendAPI(sender_psid, response)
            setState(sender_psid, 'HS BOD')
        }

        else if (getCurrentState(sender_psid) === 'HS BOD') {
            response = { "text": 'Số điện thoại phụ huynh của em nhé!' }
            callSendAPI(sender_psid, response)
            setState(sender_psid, 'HS NUMBER')
        }

        else if (getCurrentState(sender_psid) === 'HS NUMBER') {
            response = { "text": '   Cảm ơn em đã trả lời, ECT sẽ phản hồi trong ít phút !' }
            callSendAPI(sender_psid, response)
            setState(sender_psid, 'HS END')
        }

    }
}
;



// Handles messaging_postbacks events
async function handlePostback(sender_psid, received_postback) {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    switch (payload) {
        case 'yes':
            response = { "text": "Phụ huynh (anh/chị) có thể cho ECT biết một số thông tin sau:" }
            callSendAPI(sender_psid, response).on('complete', function () {
                response = { "text": "Họ và tên bạn nhà mình;" }
                setState(sender_psid, 'PH')
                callSendAPI(sender_psid, response);
            }
            )
            break;
        case 'no':
            response = { "text": "Em có thể cho ECT biết một vài thông tin sau:" }
            callSendAPI(sender_psid, response).on('complete', function () {
                response = { "text": "Họ và tên của em; " }
                setState(sender_psid, 'HS')
                callSendAPI(sender_psid, response);
            }
            )
            break;

        case 'GET_STARTED':
            await chatbotServices.handleGetStarted(sender_psid);

        default:
            response = { "text": `Cảm ơn bạn đã liên hệ với ECT. Chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất! Trong thời gian chờ đợi phản hồi, bạn “vui lòng” trả lời một số câu hỏi để giúp ECT có thể hiểu rõ hơn về bạn!${payload}` }
    }
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    return request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
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

let setupProfile = async (req, res) => {
    //call profile FB API
    // Construct the message body
    let request_body = {
        "get_started": { "payload": "GET_STARTED" },
        "whitelisted_domains": ["https://chating-bot-bdev.herokuapp.com/"]
    }


    //template String
    // Send the HTTP request to the Messenger Platform
    await request({
        "uri": `https://graph.facebook.com/v15.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
        "qs": { PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        console.log(body)
        if (!err) {
            console.log('Setup user profile succeeds!')
        } else {
            console.error("Unable to Setup user profile succeeds!:" + err);
        }
    });

    return res.send("Setup user profile succeeds!")

}
module.exports = {
    getHomePage: getHomePage,
    postWebhook: postWebhook,
    getWebhook: getWebhook,
    setupProfile: setupProfile

}