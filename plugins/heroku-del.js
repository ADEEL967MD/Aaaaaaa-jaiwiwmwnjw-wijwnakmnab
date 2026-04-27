const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");

let HEROKU_API_KEY = "HRKU-AAM9xlMMHemaQzRA_2lz02fsSMe7YEQjO59PJKcUYEfQ_____w1HKzdkhEo1";

let sudoList = [];
if (fs.existsSync("./lib/sudo.json")) {
    sudoList = JSON.parse(fs.readFileSync("./lib/sudo.json"));
}

// ─── HEROKU DELETE ───
cmd({
    pattern: "herokudel",
    desc: "Delete all Heroku apps",
    use: ".herokudel",
    filename: __filename
}, async (conn, mek, m, { sender, reply }) => {

    if (!sudoList.includes(sender))
        return reply("❌ Only sudo users can use this.");

    try {
        const teamRes = await axios.get("https://api.heroku.com/teams", {
            headers: {
                Authorization: `Bearer ${HEROKU_API_KEY}`,
                Accept: "application/vnd.heroku+json; version=3"
            }
        });

        const teams = teamRes.data;
        let options = [{ id: "personal", display: "Personal Account" }];
        teams.forEach(t => options.push({ id: t.name, display: `Team: ${t.name}` }));

        let menu = `*🔧 HEROKU MANAGER*\n`;
        menu += `━━━━━━━━━━━━━━━\n`;
        menu += `Select account to delete from:\n\n`;
        options.forEach((opt, i) => {
            menu += `*${i + 1}.* ${opt.display}\n`;
        });
        menu += `\n💬 Reply with number (1-${options.length})`;

        await conn.sendMessage(m.key.remoteJid, { text: menu }, { quoted: m });

        const listener = async (msgUpdate) => {
            const msg = msgUpdate.messages[0];
            if (!msg?.message || msg.key.remoteJid !== m.key.remoteJid || msg.key.fromMe) return;

            const input = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const sel = parseInt(input?.trim());
            if (isNaN(sel) || sel < 1 || sel > options.length) return;

            conn.ev.off('messages.upsert', listener);
            const selected = options[sel - 1];

            const apiUrl = selected.id === "personal"
                ? "https://api.heroku.com/apps"
                : `https://api.heroku.com/teams/${selected.id}/apps`;

            let apps;
            try {
                const appsRes = await axios.get(apiUrl, {
                    headers: {
                        Authorization: `Bearer ${HEROKU_API_KEY}`,
                        Accept: "application/vnd.heroku+json; version=3"
                    }
                });
                apps = appsRes.data;
            } catch (e) {
                return reply(`❌ Failed to fetch apps.\n${e?.response?.data?.message || e.message}`);
            }

            if (!apps.length)
                return reply(`⚠️ No apps found in *${selected.display}*.`);

            let deleted = [], failed = [];
            for (const app of apps) {
                try {
                    await axios.delete(`https://api.heroku.com/apps/${app.id}`, {
                        headers: {
                            Authorization: `Bearer ${HEROKU_API_KEY}`,
                            Accept: "application/vnd.heroku+json; version=3"
                        }
                    });
                    deleted.push(app.name);
                } catch (e) {
                    failed.push(app.name);
                }
            }

            let result = `*💥 DELETION REPORT*\n`;
            result += `━━━━━━━━━━━━━━━\n`;
            result += `📍 Source: ${selected.display}\n`;
            result += `✅ Deleted: ${deleted.length}\n`;
            if (failed.length) result += `❌ Failed: ${failed.length}\n`;
            result += `━━━━━━━━━━━━━━━\n`;
            if (deleted.length) {
                result += `*Deleted:*\n`;
                deleted.forEach(n => result += `• ${n}\n`);
            }
            if (failed.length) {
                result += `\n*Failed:*\n`;
                failed.forEach(n => result += `• ${n}\n`);
            }
            result += `\n> 𝗔𝗗𝗘𝗘𝗟-𝗠𝗗 💜`;

            await reply(result);
        };

        conn.ev.on('messages.upsert', listener);

    } catch (error) {
        reply(`❌ Error: ${error?.response?.data?.message || error.message || "Check API Key."}`);
    }
});

// ─── SET API KEY ───
cmd({
    pattern: "setapikey",
    desc: "Update Heroku API Key",
    category: "owner",
    use: ".setapikey <key>",
    filename: __filename
}, async (conn, mek, m, { sender, args, reply }) => {

    if (!sudoList.includes(sender))
        return reply("❌ Only sudo users can use this.");

    const newKey = args[0];
    if (!newKey) return reply("📝 Usage: `.setapikey YOUR_KEY`");

    try {
        const filePath = __filename;
        let content = fs.readFileSync(filePath, "utf8");

        // ✅ Flexible regex - matches any quote style, any value
        const keyRegex = /(let|const|var)\s+HEROKU_API_KEY\s*=\s*["'`][^"'`]*["'`]\s*;/;

        if (!keyRegex.test(content))
            return reply("⚠️ HEROKU_API_KEY variable not found in file.");

        const updated = content.replace(keyRegex, `let HEROKU_API_KEY = "${newKey}";`);
        fs.writeFileSync(filePath, updated, "utf8");
        HEROKU_API_KEY = newKey;

        let msg = `*⚙️ API KEY UPDATED*\n`;
        msg += `━━━━━━━━━━━━━━━\n`;
        msg += `✅ Saved & applied!\n`;
        msg += `🔑 Key: \`${newKey.substring(0, 12)}...\`\n`;
        msg += `🚀 Active — no restart needed.\n\n`;
        msg += `> 𝗔𝗗𝗘𝗘𝗟-𝗠𝗗 💜`;

        await reply(msg);

    } catch (error) {
        reply(`❌ Failed: ${error.message}`);
    }
});
