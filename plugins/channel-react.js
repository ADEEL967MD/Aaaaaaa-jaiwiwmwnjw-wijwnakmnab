const config = require('../config');
const { cmd } = require('../command');

const stylizedChars = {
    a: '🅐', b: '🅑', c: '🅒', d: '🅓', e: '🅔', f: '🅕', g: '🅖',
    h: '🅗', i: '🅘', j: '🅙', k: '🅚', l: '🅛', m: '🅜', n: '🅝',
    o: '🅞', p: '🅟', q: '🅠', r: '🅡', s: '🅢', t: '🅣', u: '🅤',
    v: '🅥', w: '🅦', x: '🅧', y: '🅨', z: '🅩',
    '0': '⓿', '1': '➊', '2': '➋', '3': '➌', '4': '➍',
    '5': '➎', '6': '➏', '7': '➐', '8': '➑', '9': '➒'
};

cmd({
    pattern: "ch",
    alias: ["chreact"],
    react: "❤️",
    desc: "Send ❤️ react to Adeel’s channel automatically",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("❌ Only owner can use this command.");
        if (!q) return reply(`Usage:\n${command} <text>`);

        const inputText = q;
        const emojiText = inputText
            .split('')
            .map(char => (char === ' ' ? '―' : stylizedChars[char.toLowerCase()] || char))
            .join('');

        // تمہارا چینل JID
        const channelId = "120363403380688821@newsletter";

        // چینل پر ❤️ ری ایکٹ بھیجے گا
        await conn.sendMessage(channelId, { react: { text: '❤️', key: m.key } });

        return reply(`╭━━━〔 *ᴀᴅᴇᴇʟ-ᴍᴅ* 〕━━━┈⊷
┃▸ *Success!* ❤️ reaction sent to your channel
┃▸ *Stylized Text:* ${emojiText}
╰────────────────┈⊷
╭───────────────━┈⍟
‎┋ *_𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 ᴀᴅᴇᴇʟ-ᴍᴅ_* 
‎╰───────────────━┈⍟`);

    } catch (e) {
        console.error("CHANNEL REACT ERROR:", e);
        reply(`❎ Error: ${e.message || "Failed to send reaction. Possibly invalid JID or missing permission."}`);
    }
});