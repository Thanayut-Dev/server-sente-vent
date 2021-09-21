const request = require('request')

const VERIFY_TOKEN = 'chatbot001'
let clients = [];
let nests = [];

exports.status = (req, res) => res.json({ clients: clients.length })

exports.eventsHandler = (req, res, next) => {
    // Mandatory headers and http status to keep connection open
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    // After client opens connection send all nests as string
    const data = `data: ${JSON.stringify(nests)}\n\n`;
    res.write(data);
    // Generate an id based on timestamp and save res
    // object of client connection on clients list
    // Later we'll iterate it and send updates to each client
    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);
    // When client closes connection we update the clients list
    // avoiding the disconnected one
    req.on('close', () => {
        console.log(`${clientId} Connection closed`);
        clients = clients.filter(c => c.id !== clientId);
    });
}

const sendEventsToAll = (newNest) => {
    clients.forEach(c => c.res.write(`data: ${JSON.stringify(newNest)}\n\n`))
}

exports.getWebhook = async (req, res) => {
    // Parse the query params
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.send(challenge)
    }
    else {
        // Responds with '403 Forbidden' if verify tokens do not match
        console.log('WEBHOOK_VERIFIED');
        res.sendStatus(403);
    }
}

exports.postWebhook = async (req, res) => {
    const { body } = req;
    if (body.object === 'page') {
        const events = body && body.entry && body.entry[0]
        console.log(events);
        const newNest = events;

        let response = {
            message_type: "contact",
            from: {
                email: newNest.messaging[0].sender.id + "@facebook.com",
                id: newNest.messaging[0].sender.id,
            },
            message: newNest.messaging[0].message.text
        }

        nests.push(response);
        // Send recently added nest as POST result
        res.json(response)
        // Invoke iterate and send function
        return sendEventsToAll(response);
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
    return res.sendStatus(200)
}

exports.sentEventMessages = async (req, res) => {
    const { body } = req;
    const newNest = body;
    console.log(newNest);
    await handleEvents(newNest)

    let response = {
        from: {
            email: newNest.recipient.id + "@facebook.com",
            id: newNest.recipient.id,
        },
        message: newNest.message.text
    }
    nests.push(response);
    //   // Send recently added nest as POST result
    res.json(response)
    //   // Invoke iterate and send function
    return sendEventsToAll(response);
}

const handleEvents = (requestBody) => {
    const PAGE_ACCESS_TOKEN = "EAAEAfvrHBV4BAJCbW6JEBAjZA9guZAdZCRZAXp1An4EQI9xid4s8Q9rKFzEa6s2dN1DrKc2fH0IF8rT9rjcH0lvV9ZA1U7rf3l8Htg3egP5VwAIspmIZCwCHoZCVmQ6dix3tI1KVJ4dKyc0GMeOJTUYRnQnnJlksu5f6aUgH1ISKnWMU3rXvZCTW"

    const config = {
        method: 'post',
        uri: "https://graph.facebook.com/v9.0/me/messages",
        json: requestBody,
        qs: {
            access_token: `${PAGE_ACCESS_TOKEN}`,
        },
    };
    return request(config, (err, res, body) => {
        if (!body.error) {
            console.log('message sent!', body)
            return body
        } else {
            return new Error("Unable to send message:" + body.error);
        }
    });
}

exports.sentEventMessagesInbox = async (req, respond) => {

    const PAGE_ACCESS_TOKEN = "EAAEAfvrHBV4BAJCbW6JEBAjZA9guZAdZCRZAXp1An4EQI9xid4s8Q9rKFzEa6s2dN1DrKc2fH0IF8rT9rjcH0lvV9ZA1U7rf3l8Htg3egP5VwAIspmIZCwCHoZCVmQ6dix3tI1KVJ4dKyc0GMeOJTUYRnQnnJlksu5f6aUgH1ISKnWMU3rXvZCTW"

    const config = {
        method: 'get',
        uri: "https://graph.facebook.com/v9.0/me/conversations?fields=snippet,updated_time,senders",
        qs: {
            access_token: `${PAGE_ACCESS_TOKEN}`,
        },
    };
    request(config, (err, res, body) => {

        const data = JSON.parse(body);
        respond.jsonp(data)
    });
}


