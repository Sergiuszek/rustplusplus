const Fs = require('fs');
const Path = require('path');

// Foldery zapisywalne na Renderze
const instancesDir = Path.join('/tmp', 'instances');
const credentialsDir = Path.join('/tmp', 'credentials');

// Upewniamy się, że foldery istnieją
if (!Fs.existsSync(instancesDir)) {
    Fs.mkdirSync(instancesDir, { recursive: true });
}

if (!Fs.existsSync(credentialsDir)) {
    Fs.mkdirSync(credentialsDir, { recursive: true });
}

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
        const filePath = Path.join(instancesDir, `${guildId}.json`);

        if (!Fs.existsSync(filePath)) return null;

        try {
            return JSON.parse(Fs.readFileSync(filePath, 'utf8'));
        } catch (err) {
            console.log(`❌ Failed to read instance file for guild ${guildId}:`, err);
            return null;
        }
    },

    writeInstanceFile: function (guildId, instance) {
        const filePath = Path.join(instancesDir, `${guildId}.json`);

        try {
            Fs.writeFileSync(filePath, JSON.stringify(instance, null, 2));
        } catch (err) {
            console.log(`❌ Failed to write instance file for guild ${guildId}:`, err);
        }
    },

    readCredentialsFile: function (guildId) {
        const filePath = Path.join(credentialsDir, `${guildId}.json`);

        if (!Fs.existsSync(filePath)) return null;

        try {
            return JSON.parse(Fs.readFileSync(filePath, 'utf8'));
        } catch (err) {
            console.log(`❌ Failed to read credentials for guild ${guildId}:`, err);
            return null;
        }
    },

    writeCredentialsFile: function (guildId, credentials) {
        const filePath = Path.join(credentialsDir, `${guildId}.json`);

        try {
            Fs.writeFileSync(filePath, JSON.stringify(credentials, null, 2));
        } catch (err) {
            console.log(`❌ Failed to write credentials file for guild ${guildId}:`, err);
        }
    },
};
