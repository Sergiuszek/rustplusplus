/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/
const Discord = require('discord.js');
const Fs = require('fs');
const Path = require('path');
const express = require('express'); // 🔹 import Express
const DiscordBot = require('./src/structures/DiscordBot');

createMissingDirectories();

const client = new DiscordBot({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildVoiceStates
    ],
    retryLimit: 2,
    restRequestTimeout: 60000,
    disableEveryone: false
});

client.build();

// ==================== Serwer HTTP ====================
const app = express();
const PORT = process.env.PORT || 3000;

// Strona główna
app.get('/', (req, res) => {
    res.send('Bot działa! ✅');
});

// 🔹 Endpoint ping do UptimeRobot
app.get('/ping', (req, res) => {
    res.send('pong');
});

app.listen(PORT, () => console.log(`Serwer HTTP nasłuchuje na porcie ${PORT}`));

// ==================== Funkcja tworząca brakujące katalogi ====================
function createMissingDirectories() {
    const folders = ['logs', 'instances', 'credentials', 'maps'];
    folders.forEach(folder => {
        const dir = Path.join(__dirname, folder);
        if (!Fs.existsSync(dir)) {
            Fs.mkdirSync(dir);
            console.log(`Utworzono folder: ${folder}`);
        }
    });
}

// ==================== Obsługa nieprzewidzianych błędów ====================
process.on('unhandledRejection', error => {
    client.log(client.intlGet(null, 'errorCap'), client.intlGet(null, 'unhandledRejection', {
        error: error
    }), 'error');
    console.log(error);
});

exports.client = client;
