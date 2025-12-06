const fs = require("fs");
const path = "./memory.json";

// --- [1] Wczytywanie pamięci --- //
function loadMemory() {
    try {
        return JSON.parse(fs.readFileSync(path, "utf8"));
    } catch (err) {
        return {}; // brak pliku – start od zera
    }
}

// --- [2] Funkcja zapisu --- //
function saveMemory(data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// --- [3] Załadowana pamięć --- //
let memory = loadMemory();

// --- [4] Ustawienia z pamięci lub ENV jako fallback --- //
const config = {
    general: {
        language: memory.language || process.env.RPP_LANGUAGE || 'en',
        pollingIntervalMs: memory.pollingIntervalMs || process.env.RPP_POLLING_INTERVAL || 10000,
        showCallStackError: memory.showCallStackError || process.env.RPP_LOG_CALL_STACK || false,
        reconnectIntervalMs: memory.reconnectIntervalMs || process.env.RPP_RECONNECT_INTERVAL || 15000,
    },
    discord: {
        username: memory.discordUsername || process.env.RPP_DISCORD_USERNAME || 'rustplusplus',
        clientId: memory.discordClientId || process.env.RPP_DISCORD_CLIENT_ID || '',
        token: memory.discordToken || process.env.RPP_DISCORD_TOKEN || '',
        needAdminPrivileges:
            memory.needAdminPrivileges !== undefined
                ? memory.needAdminPrivileges
                : process.env.RPP_NEED_ADMIN_PRIVILEGES || true,

        // tu jest najważniejsze – trwałe ID kanału:
        channelId: memory.channelId || null  
    }
};

// --- [5] Funkcja do zapisywania zmian --- //
function updateMemory(key, value) {
    memory[key] = value;
    saveMemory(memory);
}

module.exports = { config, updateMemory };
