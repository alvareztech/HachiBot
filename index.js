var Botkit = require("botkit");
var request = require('request');

var controller = Botkit.facebookbot({
    debug: false,
    access_token: "AQUI_ACCESS_TOKEN",
    verify_token: "AQUI_VERIFY_TOKEN"
});

var bot = controller.spawn({});

controller.setupWebserver(process.env.port || 3000, function (err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function () {
        console.log('Estamos Online :)');
    });
});

controller.hears(['hola', 'buenas'], 'message_received', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.nombre) {
            bot.reply(message, '¡Hola ' + user.nombre + '!');
        } else {
            bot.reply(message, 'Hola.');
        }
    });
});

controller.hears(['llámame (.*)', 'mi nombre es (.*)', 'llamame (.*)', 'dime (.*)'], 'message_received', function (bot, message) {
    var nombre = message.match[1];
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            user = {
                id: message.user
            };
        }
        user.nombre = nombre;
        controller.storage.users.save(user, function (err, id) {
            bot.reply(message, 'Esta bien, te llamaré ' + user.nombre + ' desde ahora.');
        });
    });
});


controller.hears(['cual es mi nombre', 'quien soy'], 'message_received', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.nombre) {
            bot.reply(message, 'Tu nombre es ' + user.nombre);
        } else {
            bot.startConversation(message, function (err, conversacion) {
                if (!err) {
                    conversacion.say('Aún no te conozco');
                    conversacion.ask('¿Como debería llamarte?', function (response, conversacion) {
                        conversacion.ask('¿Quieres que te llame ' + response.text + '?', [{
                            pattern: 'si',
                            callback: function (response, conversacion) {
                                conversacion.next();
                            }
                        }, {
                            pattern: 'no',
                            callback: function (response, conversacion) {
                                conversacion.stop();
                            }
                        }, {
                            default: true,
                            callback: function (response, conversacion) {
                                conversacion.repeat();
                                conversacion.next();
                            }
                        }]);
                        conversacion.next();

                    }, {'key': 'nombre'});

                    conversacion.on('end', function (conversacion) {
                        if (conversacion.status == 'completed') {
                            bot.reply(message, 'OK! Estoy actulizando mi memoria...');

                            controller.storage.users.get(message.user, function (err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user
                                    };
                                }
                                user.nombre = conversacion.extractResponse('nombre');

                                controller.storage.users.save(user, function (err, id) {
                                    bot.reply(message, 'Ya lo memorize, te llamaré ' + user.nombre + ' desde ahora.');
                                });
                            });
                        } else {
                            bot.reply(message, 'No lo olvidaré.');
                        }
                    });
                }
            });
        }
    });
});