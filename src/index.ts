import Fs from 'fs';
import Path from 'path';
import express, { Request, Response } from 'express';
import config from './config/index.js';
const DiscordBot = require('./src/structures/DiscordBot.js'); // <- poprawiona ścieżka

createMissingDirectories();

const client = new DiscordBot(config.discord.token);
client.start();

// Serwer HTTP
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Bot działa! ✅');
});

app.get('/ping', (req: Request, res: Response) => {
    res.send('pong');
});

app.listen(PORT, () => console.log(`Serwer HTTP nasłuchuje na porcie ${PORT}`));

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
