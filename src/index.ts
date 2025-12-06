/*
  index.ts – główny plik startowy Rust++ dla Render.com
*/

import * as Fs from 'fs';
import * as Path from 'path';
import express, { Request, Response } from 'express';
import config from '../config/index.js';
const DiscordBot = require('./structures/DiscordBot.js'); // <- dodajemy .js

// Tworzenie brakujących folderów
createMissingDirectories();

// 🔥 Najważniejsze: przekazujemy TYLKO token
const client = new DiscordBot(config.discord.token);

client.start();

// ==================== Serwer HTTP ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Bot działa! ✅');
});

app.get('/ping', (req: Request, res: Response) => {
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

// Obsługa nieprzewidzianych błędów
process.on('unhandledRejection', (error) => {
    console.log("Unhandled rejection:", error);
});

export { client };
