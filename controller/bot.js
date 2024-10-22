const { default: axios } = require("axios");
const schedule = require('node-schedule')
const TelegramBot = require("node-telegram-bot-api")
const Bot_Token = process.env.BOT_KEY

const bot = new TelegramBot(Bot_Token, {polling: true});

const userSessions = {}
const userChatIds = {}

const sendExpiringLicenses = async (chatId) => {
    if (!userSessions[chatId] || !userSessions[chatId].userToken) {
        return
    }
    try {
        const today = new Date();

        const response = await axios.get(`http://localhost:4000/license/expiring?date=${today.toISOString()}`, {
            headers: { Authorization: `Bearer ${userSessions[chatId].userToken}` }
        });
        const licenses1 = response.data.licenses1;
        const licenses10 = response.data.licenses10;

        if (licenses1.length > 0) {
            let message = 'The following licenses will expire in 1 day:\n';
            licenses1.forEach(license => {
                const expireDate = new Date(license.expireDate)
                message += `- ${license.name} (expires on ${expireDate.toISOString().slice(0, 10)})\n\n`;
            });
            bot.sendMessage(chatId, message);
        }
        if (licenses10.length > 0) {
            let message = 'The following licenses will expire in 10 days:\n';
            licenses10.forEach(license => {
                const expireDate = new Date(license.expireDate)
                message += `- ${license.name} (expires on ${expireDate.toISOString().slice(0, 10)})\n\n`;
            });
            bot.sendMessage(chatId, message);
        }
    } catch (error) {
        bot.sendMessage(chatId, error);
    }
};

const createInlineButtons = buttons => buttons.map(button => ({
    text: button.text,
    callback_data: button.callback_data
}))

const createBackButton = () => [{ text: 'goBack' ,callback_data: 'back' }]

const sendMessageWithOptions = (chatId ,text ,options) => {
    const defaultOptions = { parse_mode: 'markdown' }
    bot.sendMessage(chatId ,text ,{ ...defaultOptions ,...options })
}

const editMessageWithOptions = (chatId ,messageId ,text ,options) => {
    const defaultOptions = { parse_mode: 'markdown'}
    bot.editMessageText(text ,{ chat_id: chatId ,message_id: messageId, ...defaultOptions ,...options})
}

bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id
    const userId = msg.from.id
    const userName = msg.from.first_name
    const userLastName = msg.from.last_name || ''
    const welcomeMessage = `${userName} ${userLastName} \n Welcome to License Manager`

    userChatIds[userId] = chatId

    const startOptions = {
        reply_markup: {
            inline_keyboard: [
                createInlineButtons([
                    { text: 'About Me', callback_data: 'about_me' },
                    { text: 'Licenses', callback_data: 'License' },
                    { text: 'Login', callback_data: 'Login' }
                ]),
            ],
        },
    }
    
    sendMessageWithOptions(chatId, welcomeMessage, startOptions)
})

bot.on('callback_query', async callbackQuery => {
    const chatId = callbackQuery.message.chat.id 
    const messageId = callbackQuery.message.message_id
    const data = callbackQuery.data

    switch (data) {
        case 'about_me':
            const kooroushInfo =
            `Hi my name is Kooroush Pasandideh \nIt would be a pleasure to collaborate with you in business \nThanks for using my Telegram Bot`
            const inlineKeyboard = [
                [
                    { text: 'My GitHub', url: "https://github.com/kooroushpsnd" },
                    { text: 'My Telegram', url: "https://t.me/kpthemighty" },
                ],
                createBackButton(),
            ]
            const aboutMeOptions = { reply_markup: { inline_keyboard: inlineKeyboard } }
            editMessageWithOptions(chatId, messageId, kooroushInfo, aboutMeOptions)
            break

        case 'License':
            if (!userSessions[chatId] || !userSessions[chatId].userToken) {
                return editMessageWithOptions(chatId, messageId, 'You need to log in first!', {});
            }

            try{
                const response = await axios.get(`http://localhost:4000/license`, {
                    headers: { Authorization: `Bearer ${userSessions[chatId].userToken}` }
                });
                const licenses = response.data.licenses;
                let licenseInfo = 'Your Licenses:\n';
                licenses.forEach(license => {
                    const issueDate = new Date(license.issueDate)
                    const expireDate = new Date(license.expireDate)
                    licenseInfo += `- ${license.name}: \nissueDate ${issueDate.toISOString().slice(0, 10)}\nexpireDate ${expireDate.toISOString().slice(0, 10)}\nstatus: ${license.active}\n\n`;
                });

                const licenseOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            createBackButton(), 
                        ],
                    },
                };

                editMessageWithOptions(chatId, messageId, licenseInfo, licenseOptions);
            }catch(err){
                editMessageWithOptions(chatId, messageId, err, {}); 
            }
            break
        
        case 'Login':
            if (userSessions[chatId] && userSessions[chatId].userToken) {
                return editMessageWithOptions(chatId, messageId, 'You are Loged in', {});
            }
            bot.sendMessage(chatId, 'Please enter your login details in this format: email password');
            bot.once('message', async (msg) => {
                const [email, password] = msg.text.split(' ');

                try {
                    const response = await axios.post('http://localhost:4000/users/login', { email, password });
                    const jwtToken = response.data.token;

                    userSessions[chatId] = { userToken: jwtToken };

                    bot.sendMessage(chatId, 'You are now logged in!');

                    sendExpiringLicenses(chatId)
                    if (!userSessions[chatId].job) {
                        userSessions[chatId].job = schedule.scheduleJob('0 1 * * *', () => {
                            sendExpiringLicenses(chatId);
                        });
                    }
                } catch (error) {
                    bot.sendMessage(chatId, 'Login failed. Please check your credentials.');
                }
            });
            break

        case 'back':
            const startOptions = {
                reply_markup: {
                    inline_keyboard: [
                        createInlineButtons(
                            [
                                { text: 'About Me', callback_data: 'about_me' },
                                { text: 'License', callback_data: 'License' }
                            ]),
                    ],
                },
            }
            editMessageWithOptions(chatId, messageId, 'Welcome to License Manager', startOptions)
            break
    }

    bot.answerCallbackQuery(callbackQuery.id)
})

module.exports = bot