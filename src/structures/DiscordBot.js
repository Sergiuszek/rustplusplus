const FormatJS = require('@formatjs/intl');
const Discord = require('discord.js');
const Fs = require('fs');
const Path = require('path');

const Battlemetrics = require('../structures/Battlemetrics');
const Cctv = require('./Cctv');
const Config = require('../../config');
const DiscordEmbeds = require('../discordTools/discordEmbeds.js');
const DiscordTools = require('../discordTools/discordTools');
const InstanceUtils = require('../util/instanceUtils.js');
const Items = require('./Items');
const Logger = require('./Logger.js');
const PermissionHandler = require('../handlers/permissionHandler.js');
const RustLabs = require('../structures/RustLabs');
const RustPlus = require('../structures/RustPlus');

class DiscordBot extends Discord.Client {
    constructor(props) {
        super({ intents: [
            Discord.GatewayIntentBits.Guilds,
            Discord.GatewayIntentBits.GuildMessages,
            Discord.GatewayIntentBits.GuildMembers,
            Discord.GatewayIntentBits.MessageContent
        ]});

        this.logger = new Logger(Path.join(__dirname, '..', '..', 'logs/discordBot.log'), 'default');

        this.commands = new Discord.Collection();
        this.fcmListeners = {};
        this.fcmListenersLite = {};
        this.instances = {};
        this.guildIntl = {};
        this.botIntl = null;
        this.enIntl = null;
        this.enMessages = JSON.parse(Fs.readFileSync(Path.join(__dirname, '..', 'languages', 'en.json'), 'utf8'));

        this.rustplusInstances = {};
        this.activeRustplusInstances = {};
        this.rustplusReconnectTimers = {};
        this.rustplusLiteReconnectTimers = {};
        this.rustplusReconnecting = {};
        this.rustplusMaps = {};

        this.uptimeBot = null;

        this.items = new Items();
        this.rustlabs = new RustLabs();
        this.cctv = new Cctv();

        this.pollingIntervalMs = Config.general.pollingIntervalMs;

        this.battlemetricsInstances = {};

        this.battlemetricsIntervalId = null;
        this.battlemetricsIntervalCounter = 0;

        this.voiceLeaveTimeouts = {};

        this.loadDiscordCommands();
        this.loadDiscordEvents();
        this.loadEnIntl();
        this.loadBotIntl();
    }

    loadDiscordCommands() {
        const commandFiles = Fs.readdirSync(Path.join(__dirname, '..', 'commands'))
            .filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            this.commands.set(command.name, command);
        }
    }

    loadDiscordEvents() {
        const eventFiles = Fs.readdirSync(Path.join(__dirname, '..', 'discordEvents'))
            .filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(`../discordEvents/${file}`);

            if (event.name === 'rateLimited') {
                this.rest.on(event.name, (...args) => event.execute(this, ...args));
            } else if (event.once) {
                this.once(event.name, (...args) => event.execute(this, ...args));
            } else {
                this.on(event.name, (...args) => event.execute(this, ...args));
            }
        }
    }

    loadEnIntl() {
        const language = 'en';
        const path = Path.join(__dirname, '..', 'languages', `${language}.json`);
        const messages = JSON.parse(Fs.readFileSync(path, 'utf8'));
        const cache = FormatJS.createIntlCache();
        this.enIntl = FormatJS.createIntl({ locale: language, defaultLocale: 'en', messages }, cache);
    }

    loadBotIntl() {
        const language = Config.general.language;
        const path = Path.join(__dirname, '..', 'languages', `${language}.json`);
        const messages = JSON.parse(Fs.readFileSync(path, 'utf8'));
        const cache = FormatJS.createIntlCache();
        this.botIntl = FormatJS.createIntl({ locale: language, defaultLocale: 'en', messages }, cache);
    }

    loadGuildIntl(guildId) {
        const instance = InstanceUtils.readInstanceFile(guildId);
        const language = instance.generalSettings.language;
        const path = Path.join(__dirname, '..', 'languages', `${language}.json`);
        const messages = JSON.parse(Fs.readFileSync(path, 'utf8'));
        const cache = FormatJS.createIntlCache();
        this.guildIntl[guildId] = FormatJS.createIntl({ locale: language, defaultLocale: 'en', messages }, cache);
    }

    intlGet(guildId, id, variables = {}) {
        let intl = guildId && guildId !== 'en' ? this.guildIntl[guildId] :
            (guildId === 'en' ? this.enIntl : this.botIntl);
        return intl.formatMessage({ id, defaultMessage: this.enMessages[id] }, variables);
    }

    build() {
        this.login(Config.discord.token).catch(error => {
            switch (error.code) {
                case 502:
                    this.log(this.intlGet(null, 'errorCap'), this.intlGet(null, 'badGateway', { error: JSON.stringify(error) }), 'error');
                    break;
                case 503:
                    this.log(this.intlGet(null, 'errorCap'), this.intlGet(null, 'serviceUnavailable', { error: JSON.stringify(error) }), 'error');
                    break;
                default:
                    this.log(this.intlGet(null, 'errorCap'), `${JSON.stringify(error)}`, 'error');
                    break;
            }
        });
    }

    log(title, text, level = 'info') {
        this.logger.log(title, text, level);
    }

    getInstance(guildId) {
        return this.instances[guildId];
    }

    setInstance(guildId, instance) {
        this.instances[guildId] = instance;
        InstanceUtils.writeInstanceFile(guildId, instance);
    }

    async setupGuild(guild) {
        const instance = this.getInstance(guild.id);

        await require('../discordTools/RegisterSlashCommands')(this, guild);
        let category = await require('../discordTools/SetupGuildCategory')(this, guild);
        await require('../discordTools/SetupGuildChannels')(this, guild, category);

        if (instance.firstTime) {
            const perms = PermissionHandler.getPermissionsRemoved(this, guild);
            try { await category.permissionOverwrites.set(perms); } catch(e) {}
        } else {
            await PermissionHandler.resetPermissionsAllChannels(this, guild);
        }

        require('../util/FcmListener')(this, guild);
        const credentials = InstanceUtils.readCredentialsFile(guild.id);
        for (const steamId of Object.keys(credentials)) {
            if (steamId !== credentials.hoster && steamId !== 'hoster') {
                require('../util/FcmListenerLite')(this, guild, steamId);
            }
        }

        await require('../discordTools/SetupSettingsMenu')(this, guild);

        if (instance.firstTime) await PermissionHandler.resetPermissionsAllChannels(this, guild);

        this.resetRustplusVariables(guild.id);
    }

    resetRustplusVariables(guildId) {
        this.activeRustplusInstances[guildId] = false;
        this.rustplusReconnecting[guildId] = false;
        delete this.rustplusMaps[guildId];

        if (this.rustplusReconnectTimers[guildId]) {
            clearTimeout(this.rustplusReconnectTimers[guildId]);
            this.rustplusReconnectTimers[guildId] = null;
        }
        if (this.rustplusLiteReconnectTimers[guildId]) {
            clearTimeout(this.rustplusLiteReconnectTimers[guildId]);
            this.rustplusLiteReconnectTimers[guildId] = null;
        }
    }
}

module.exports = DiscordBot;
