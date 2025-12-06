const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const Path = require('path');
const Fs = require('fs');
const InstanceUtils = require('../utils/InstanceUtils');

class DiscordBot {
    constructor(botToken) {
        this.botToken = botToken;
        this.instances = {};
        this.client = null;

        this.memoryFile = Path.join(__dirname, '..', '..', 'memory.json');

        // Load memory at startup
        if (Fs.existsSync(this.memoryFile)) {
            try {
                this.instances = JSON.parse(Fs.readFileSync(this.memoryFile, 'utf8'));
                console.log("🔵 Memory loaded successfully.");
            } catch (e) {
                console.log("❌ Failed to load memory:", e);
            }
        }

        // Auto-save memory every 5 seconds
        setInterval(() => {
            Fs.writeFileSync(this.memoryFile, JSON.stringify(this.instances, null, 2));
        }, 5000);
    }

    async start() {
        try {
            console.log("🚀 Starting Discord bot…");

            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent
                ],
                partials: [Partials.Channel, Partials.Message]
            });

            this.client.once("ready", async () => {
                console.log(`🤖 Bot logged in as ${this.client.user.tag}`);

                const guilds = this.client.guilds.cache.map(g => g);
                for (const guild of guilds) {
                    await this.initGuild(guild);
                }
            });

            this.client.on("guildCreate", async (guild) => {
                console.log(`➕ Joined new guild: ${guild.id}`);
                await this.initGuild(guild);
            });

            this.client.login(this.botToken);

        } catch (err) {
            console.error("❌ Failed to start bot:", err);
        }
    }

    async initGuild(guild) {
        try {
            console.log(`🔧 Initializing guild: ${guild.id}`);

            let instance = InstanceUtils.loadInstanceFile(guild.id);

            if (!instance) {
                instance = {
                    firstTime: true,
                    serverId: guild.id,
                    panelChannelId: null,
                    confirmChannelId: null
                };

                this.setInstance(guild.id, instance);
            }

            await this.setupGuild(guild, instance);

        } catch (err) {
            console.error(`❌ Failed to initialize guild ${guild.id}:`, err);
        }
    }

    // *** FIXED — now instantly saving memory.json ***
    setInstance(guildId, instance) {
        this.instances[guildId] = instance;

        Fs.writeFileSync(this.memoryFile, JSON.stringify(this.instances, null, 2));
        InstanceUtils.writeInstanceFile(guildId, instance);
    }

    async setupGuild(guild, instance) {
        // BLOCK DUPLICATE SETUP
        if (!instance.firstTime) {
            console.log("⚠️ Guild already configured — skipping channel creation.");
            return;
        }

        console.log(`🛠 Setting up guild for the first time: ${guild.id}`);

        try {
            // Create category
            const category = await guild.channels.create({
                name: "🤖 AI Verification",
                type: 4
            });

            // Create panel channel
            const panelChannel = await guild.channels.create({
                name: "panel-ai",
                type: 0,
                parent: category.id
            });

            // Create confirm channel
            const confirmChannel = await guild.channels.create({
                name: "verify-here",
                type: 0,
                parent: category.id
            });

            instance.panelChannelId = panelChannel.id;
            instance.confirmChannelId = confirmChannel.id;
            instance.firstTime = false;

            this.setInstance(guild.id, instance);

            await panelChannel.send("Witamy! Kliknij, aby rozpocząć weryfikację.");
            await confirmChannel.send("Wpisz kod, aby potwierdzić.");

        } catch (err) {
            console.error(`❌ Error setting up guild ${guild.id}:`, err);
        }
    }
}

module.exports = DiscordBot;
