const controller = require('./controller');

module.exports = (app) => {
    app.route('/events')
        .get(controller.eventsHandler)

    app.route('/status')
        .get(controller.status)

    app.route('/webhook')
        .get(controller.getWebhook)
        .post(controller.postWebhook)

    app.route('/sentevents')
        .post(controller.sentEventMessages)
        
    app.route('/getprofile')
        .get(controller.sentEventMessagesInbox)
}