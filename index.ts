const Fs = require('fs');
const Path = require('path');
const express = require('express');
const config = require('./config/index.js'); // <-- twoje ustawienia
const DiscordBot = require('./structures/DiscordBot');
 // <-- MÓJ poprawiony DiscordBot

createMissingDirectories();

// 🔥 najważniejsze: przekazujemy TYLKO TOKEN
const client = new DiscordBot(config.discord.token);

client.start();


// ==================== Serwer HTTP ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot działa! ✅');
});

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

process.on('unhandledRejection', error => {
    console.log("Unhandled rejection:", error);
});

exports.client = client;
