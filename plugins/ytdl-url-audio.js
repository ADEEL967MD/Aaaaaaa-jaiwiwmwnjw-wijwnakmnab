const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");

const commands = ["mp3url", "ytmp3", "audio"];

commands.forEach(command => {
    cmd({
        pattern: command,
        desc: "Download YouTube audio as MP3 using multiple APIs",
        category: "downloader",
        react: "🎵",
        filename: __filename
    }, async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) return reply("*❌ Please provide a YouTube link.*")
            if (!q.startsWith("http")) return reply("*❌ Please provide a valid YouTube link.*")

            let cleanUrl = q.split("&")[0];
            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

            let downloadUrl = null;
            let title = "YouTube Audio";

            // --- API 1 (JerryCoder) ---
            try {
                let res1 = await axios.get(`https://jerrycoder.oggyapi.workers.dev/ytmp3?url=${encodeURIComponent(cleanUrl)}`);
                if (res1.data && res1.data.status === "success") {
                    downloadUrl = res1.data.url;
                    title = res1.data.title;
                }
            } catch (e) { console.log("API 1 Failed"); }

            // --- API 2 (GiftedTech) if API 1 Fails ---
            if (!downloadUrl) {
                try {
                    let res2 = await axios.get(`https://api.giftedtech.co.ke/api/download/ytmp3v2?apikey=gifted&url=${encodeURIComponent(cleanUrl)}`);
                    if (res2.data && res2.data.success) {
                        downloadUrl = res2.data.result.download_url;
                        title = res2.data.result.title;
                    }
                } catch (e) { console.log("API 2 Failed"); }
            }

            // --- API 3 (EliteProTech) if others Fail ---
            if (!downloadUrl) {
                try {
                    let res3 = await axios.get(`https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(cleanUrl)}`);
                    if (res3.data && res3.data.status) {
                        downloadUrl = res3.data.result.download;
                        title = res3.data.result.title;
                    }
                } catch (e) { console.log("API 3 Failed"); }
            }

            // Final Check
            if (!downloadUrl) {
                await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                return reply("*❌ All APIs are currently down. Please try again later.*");
            }

            // Search Metadata
            const search = await yts(cleanUrl).catch(() => null);
            const vid = search?.videos?.[0] || null;
            const views = vid?.views ? vid.views.toLocaleString() : 'N/A';
            const channel = vid?.author?.name || 'N/A';
            const duration = vid?.timestamp || 'N/A';
            const thumbnail = vid?.thumbnail || `https://i.ytimg.com/vi/${cleanUrl.split('v=')[1]}/hqdefault.jpg`;

            const caption = `🎶 *${title}*

👤 *Channel:* ${channel}
⏳ *Duration:* ${duration}
👁 *Views:* ${views}

> *⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`;

            if (thumbnail) {
                await conn.sendMessage(from, {
                    image: { url: thumbnail },
                    caption: caption
                }, { quoted: mek });
            }

            await conn.sendMessage(from, {
                audio: { url: downloadUrl },
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (e) {
            console.error(`${command} error:`, e);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            reply("*❌ An unexpected error occurred.*");
        }
    });
});
