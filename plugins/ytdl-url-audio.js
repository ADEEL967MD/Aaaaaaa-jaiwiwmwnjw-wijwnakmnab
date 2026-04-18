const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");

const commands = ["mp3url", "ytmp3", "audio"];

commands.forEach(command => {
    cmd({
        pattern: command,
        desc: "Download YouTube audio as MP3",
        category: "downloader",
        react: "🎵",
        filename: __filename
    }, async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) return reply("❌ Please provide a YouTube link or song name");

            let cleanUrl = q.trim();
            let vid;

            if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
                cleanUrl = cleanUrl.split("&")[0];
                cleanUrl = cleanUrl.replace("https://youtu.be/", "https://www.youtube.com/watch?v=");

                const videoId = cleanUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
                if (!videoId) return reply("❌ Invalid YouTube link");

                vid = {
                    title: "YouTube Audio",
                    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    views: "N/A",
                    author: { name: "Unknown" },
                    timestamp: "N/A"
                };
            } else {
                const search = await yts(cleanUrl).catch(() => null);
                vid = search?.videos?.[0];
                if (!vid) return reply("❌ Video not found");
                cleanUrl = vid.url;
            }

            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

            const title = vid.title;
            const views = vid.views?.toLocaleString() || "N/A";
            const channel = vid.author?.name || "Unknown";
            const duration = vid.timestamp || "N/A";
            const thumbnail = vid.thumbnail;

            await conn.sendMessage(from, {
                image: { url: thumbnail },
                caption: `🎶 *${title}*\n\n👤 *Channel:* ${channel}\n⏳ *Duration:* ${duration}\n👁 *Views:* ${views}\n\n> *⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
            }, { quoted: mek });

            let audioBuffer = null;

            try {
                const res = await axios.get(`https://jerrycoder.oggyapi.workers.dev/ytmp3?url=${encodeURIComponent(cleanUrl)}`, { timeout: 30000 });
                if (res.data?.status === "success" && res.data?.url) {
                    const audio = await axios.get(res.data.url, { responseType: "arraybuffer", timeout: 60000 });
                    audioBuffer = Buffer.from(audio.data);
                }
            } catch {}

            if (!audioBuffer) {
                try {
                    const res = await axios.get(`https://api.giftedtech.co.ke/api/download/ytmp3v2?apikey=gifted&url=${encodeURIComponent(cleanUrl)}&quality=128`, { timeout: 30000 });
                    const url = res.data?.result?.download_url;
                    if (url) {
                        const audio = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
                        audioBuffer = Buffer.from(audio.data);
                    }
                } catch {}
            }

            if (!audioBuffer) {
                try {
                    const res = await axios.get(`https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(cleanUrl)}`, { timeout: 30000 });
                    if (res.data?.status && res.data?.result?.download) {
                        const audio = await axios.get(res.data.result.download, { responseType: "arraybuffer", timeout: 60000 });
                        audioBuffer = Buffer.from(audio.data);
                    }
                } catch {}
            }

            if (!audioBuffer) {
                await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                return reply("❌ All servers failed. Try again later");
            }

            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (e) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            reply("❌ Error occurred. Try again");
        }
    });
});
