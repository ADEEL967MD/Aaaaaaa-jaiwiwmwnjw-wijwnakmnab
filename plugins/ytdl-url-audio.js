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
            if (!q) return reply("❌ Please provide a YouTube link.");

            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

            let cleanUrl = q.split("&")[0].replace("https://youtu.be/", "https://www.youtube.com/watch?v=");

            // ✅ SAFE YTS FETCH
            let vid = null;
            try {
                const { videos } = await yts(cleanUrl);
                if (videos.length) vid = videos[0];
            } catch {}

            const title = vid?.title || "Audio";
            const channel = vid?.author?.name || "N/A";
            const duration = vid?.timestamp || "N/A";
            const views = vid?.views ? vid.views.toLocaleString() : "N/A";
            const thumbnail = vid?.thumbnail || `https://img.youtube.com/vi/${cleanUrl.split("v=")[1]}/hqdefault.jpg`;

            // ✅ Thumbnail + Info
            await conn.sendMessage(from, {
                image: { url: thumbnail },
                caption: `🎶 *${title}*

👤 *Channel:* ${channel}
⏳ *Duration:* ${duration}
👁 *Views:* ${views}

> *⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
            }, { quoted: mek });

            let audioBuffer = null;

            // 🔥 API LIST (PLAY COMMAND STYLE)
            const apis = [
                async () => {
                    const res = await axios.get(`https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(cleanUrl)}`);
                    if (res.data?.status && res.data?.result?.download) {
                        const r = await axios.get(res.data.result.download, { responseType: "arraybuffer" });
                        return Buffer.from(r.data);
                    }
                },
                async () => {
                    const res = await axios.get(`https://api.giftedtech.co.ke/api/download/ytmp3v2?apikey=gifted&url=${encodeURIComponent(cleanUrl)}&quality=128`);
                    const result = res.data.result || res.data.results || res.data;
                    const url = result?.download_url || result?.downloadUrl || result?.url || result?.audio || result?.link;
                    if (url) {
                        const r = await axios.get(url, { responseType: "arraybuffer" });
                        return Buffer.from(r.data);
                    }
                },
                async () => {
                    const res = await axios.get(`https://jerrycoder.oggyapi.workers.dev/ytmp3?url=${encodeURIComponent(cleanUrl)}`);
                    if (res.data?.status === "success" && res.data?.url) {
                        const r = await axios.get(res.data.url, { responseType: "arraybuffer" });
                        return Buffer.from(r.data);
                    }
                }
            ];

            // ✅ LOOP (NO CRASH SYSTEM)
            for (const api of apis) {
                try {
                    const result = await api();
                    if (result) {
                        audioBuffer = result;
                        break;
                    }
                } catch {}
            }

            // ❌ FINAL ERROR (ONLY AFTER ALL FAIL)
            if (!audioBuffer) {
                await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                return reply("❌ Audio fetch failed. Try again.");
            }

            // ✅ SEND AUDIO
            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (e) {
            console.error("Final Error:", e);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            reply("❌ Error occurred. Try again.");
        }
    });
});
