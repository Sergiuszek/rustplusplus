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

import express, { Request, Response } from 'express';
import { config } from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';

// Wczytanie zmiennych środowiskowych z .env
config();

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    throw new Error('Brak tokenu Discorda w .env!');
}

// ==================== Serwer HTTP ====================
const app = express();

// Strona główna
app.get('/', (req: Request, res: Response) => {
    res.send('Bot działa! ✅');
});

// Endpoint do pingowania (np. UptimeRobot)
app.get('/ping', (req: Request, res: Response) => {
    res.send('pong');
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer HTTP nasłuchuje na porcie ${PORT}`);
});

// ==================== Discord Bot ====================
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
    console.log(`Zalogowano jako ${client.user?.tag}`);
});

// Tu możesz dodać eventy bota, np. messageCreate
client.on('messageCreate', (message) => {
    if (message.content === '!ping') {
        message.reply('Pong!');
    }
});

// Logowanie bota
client.login(TOKEN);
