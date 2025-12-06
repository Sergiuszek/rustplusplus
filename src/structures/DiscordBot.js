const Discord = require('discord.js');
const Fs = require('fs');
const Path = require('path');

const Config = require('../../config');
const DiscordEmbeds = require('../discordTools/discordEmbeds.js');
const DiscordTools = require('../discordTools/discordTools.js');
const InstanceUtils = require('../util/instanceUtils.js');
const PermissionHandler = require('../handlers/permissionHandler.js');
const RustPlus = require('../structures/RustPlus.js');
const Battlemetrics = require('../structures/Battlemetrics.js');

class DiscordBot extends Discord.Client {
    constructor(props) {
        super(props);

        this.commands = new Discord.Collection();
        this.instances = {};
        this.guildIntl = {};
        this.rustplusInstances = {};
        this.activeRustplusInstances = {};
        this.battlemetricsInstances = {};
        this.uptimeBot = null;

        this.loadDiscordCommands();
        this.loadDiscordEvents();
    }

    loadDiscordCommands() {
        const commandFiles = Fs.readdirSync(Path.join(__dirname, '..', 'commands')).filter(f => f.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            this.commands.set(command.name, command);
        }
    }

    loadDiscordEvents() {
        const eventFiles = Fs.readdirSync(Path.join(__dirname, '..', 'discordEvents')).filter(f => f.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(`../discordEvents/${file}`);
            if (event.once) {
                this.once(event.name, (...args) => event.execute(this, ...args));
            } else {
                this.on(event.name, (...args) => event.execute(this, ...args));
            }
        }
    }

    log(title, text, level = 'info') {
        console.log(`[${level.toUpperCase()}] ${title}: ${text}`);
    }

    async setupGuild(guild) {
        const instance = InstanceUtils.readInstanceFile(guild.id);
        this.instances[guild.id] = instance;

        // Tworzymy verify-here kanał jeśli nie istnieje
        const verifyChannelName = 'verify-here';
        let verifyChannel = guild.channels.cache.find(c => c.name === verifyChannelName && c.type === 0); // 0 = text
        if (!verifyChannel) {
            verifyChannel = await guild.channels.create({
                name: verifyChannelName,
                type: 0,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [Discord.PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });
            this.log('Setup', `Stworzono kanał ${verifyChannelName} w guild ${guild.name}`);
        }

        // Panel AI – na razie pomijamy

        // Reset RustPlus variables
        this.activeRustplusInstances[guild.id] = false;
    }

    createRustplusInstance(guildId, serverIp, appPort, steamId, playerToken) {
        const rustplus = new RustPlus(guildId, serverIp, appPort, steamId, playerToken);
        this.rustplusInstances[guildId] = rustplus;
        this.activeRustplusInstances[guildId] = true;
        rustplus.build();
        return rustplus;
    }

    async updateBattlemetricsInstances() {
        for (const guild of this.guilds.cache.values()) {
            const instance = this.instances[guild.id];
            if (!instance) continue;
            const activeServer = instance.activeServer;
            if (!activeServer || !instance.serverList[activeServer]) continue;
            const bmId = instance.serverList[activeServer].battlemetricsId;
            if (!bmId) continue;

            if (!this.battlemetricsInstances[bmId]) {
                const bmInstance = new Battlemetrics(bmId);
                await bmInstance.setup();
                this.battlemetricsInstances[bmId] = bmInstance;
            } else {
                await this.battlemetricsInstances[bmId].evaluation();
            }
        }
    }

    build() {
        this.login(Config.discord.token)
            .then(() => this.log('Bot', 'Zalogowano poprawnie!'))
            .catch(err => this.log('Error', JSON.stringify(err), 'error'));
    }
}

module.exports = DiscordBot;
