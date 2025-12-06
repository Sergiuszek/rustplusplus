const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const Path = require('path');
const Fs = require('fs');
const InstanceUtils = require('../util/instanceUtils.js');
const Config = require('../../config');
const Logger = require('./Logger.js');

class DiscordBot extends Client {
    constructor(props) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Channel, Partials.Message]
        });

        this.logger = new Logger(Path.join(__dirname, '..', '..', 'logs/discordBot.log'), 'default');
        this.instances = {};
        this.memoryFile = Path.join('/tmp', 'memory.json'); // zapis pod Render
        this.commands = new Map();

        // Load memory at startup
        if (Fs.existsSync(this.memoryFile)) {
            try {
                this.instances = JSON.parse(Fs.readFileSync(this.memoryFile, 'utf8'));
                console.log("🔵 Memory loaded successfully.");
            } catch (e) {
                console.log("❌ Failed to load memory:", e);
            }
        }

        // Auto-save memory every 5 sek
        setInterval(() => {
            Fs.writeFileSync(this.memoryFile, JSON.stringify(this.instances, null, 2));
        }, 5000);

        this.loadDiscordCommands();
        this.loadDiscordEvents();
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
            if (event.once) {
                this.once(event.name, (...args) => event.execute(this, ...args));
            } else {
                this.on(event.name, (...args) => event.execute(this, ...args));
            }
        }
    }

    async start() {
        try {
            await this.login(Config.discord.token);
            console.log(`🤖 Bot logged in as ${this.user.tag}`);

            for (const [guildId, guild] of this.guilds.cache) {
                await this.initGuild(guild);
            }

        } catch (err) {
            console.error("❌ Failed to start bot:", err);
        }
    }

    async initGuild(guild) {
        try {
            let instance = InstanceUtils.loadInstanceFile(guild.id);

            if (!instance) {
                instance = { firstTime: true, serverId: guild.id };
                this.setInstance(guild.id, instance);
            }

            // Tutaj odpal setup (tworzenie kanałów itd.)
            await require('../discordTools/RegisterSlashCommands')(this, guild);
            const category = await require('../discordTools/SetupGuildCategory')(this, guild);
            await require('../discordTools/SetupGuildChannels')(this, guild, category);

        } catch (err) {
            console.error(`❌ Failed to init guild ${guild.id}:`, err);
        }
    }

    getInstance(guildId) {
        return this.instances[guildId];
    }

    setInstance(guildId, instance) {
        this.instances[guildId] = instance;
        Fs.writeFileSync(this.memoryFile, JSON.stringify(this.instances, null, 2));
        InstanceUtils.writeInstanceFile(guildId, instance);
    }
}

module.exports = DiscordBot;
