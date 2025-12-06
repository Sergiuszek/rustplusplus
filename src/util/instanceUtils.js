const Fs = require('fs');
const Path = require('path');

// No direct reference to index.ts – it caused issues.
// Your DiscordBot already loads instances itself.

module.exports = {
    getSmartDevice: function (guildId, entityId, instance) {
        if (!instance || !instance.serverList) return null;

        for (const serverId in instance.serverList) {
            const server = instance.serverList[serverId];

            if (!server) continue;

            // Switch
            if (server.switches && server.switches[entityId]) {
                return { type: 'switch', serverId };
            }

            // Alarm
            if (server.alarms && server.alarms[entityId]) {
                return { type: 'alarm', serverId };
            }

            // Storage Monitor
            if (server.storageMonitors && server.storageMonitors[entityId]) {
                return { type: 'storageMonitor', serverId };
            }
        }

        return null;
    },

    loadInstanceFile: function (guildId) {
        const path = Path.join(__dirname, '..', '..', 'instances', `${guildId}.json`);

        if (!Fs.existsSync(path)) {
            // No file? return null (bot will then create a new instance)
            return null;
        }

        try {
            return JSON.parse(Fs.readFileSync(path, 'utf8'));
        } catch (err) {
            console.log(`❌ Failed to read instance file for guild ${guildId}:`, err);
            return null;
        }
    },

    writeInstanceFile: function (guildId, instance) {
        const path = Path.join(__dirname, '..', '..', 'instances', `${guildId}.json`);

        try {
            Fs.writeFileSync(path, JSON.stringify(instance, null, 2));
        } catch (err) {
            console.log(`❌ Failed to write instance file for guild ${guildId}:`, err);
        }
    },

    readCredentialsFile: function (guildId) {
        const path = Path.join(__dirname, '..', '..', 'credentials', `${guildId}.json`);

        if (!Fs.existsSync(path)) return null;

        try {
            return JSON.parse(Fs.readFileSync(path, 'utf8'));
        } catch (err) {
            console.log(`❌ Failed to read credentials for guild ${guildId}:`, err);
            return null;
        }
    },

    writeCredentialsFile: function (guildId, credentials) {
        const path = Path.join(__dirname, '..', '..', 'credentials', `${guildId}.json`);

        try {
            Fs.writeFileSync(path, JSON.stringify(credentials, null, 2));
        } catch (err) {
            console.log(`❌ Failed to write credentials file for guild ${guildId}:`, err);
        }
    },
};
