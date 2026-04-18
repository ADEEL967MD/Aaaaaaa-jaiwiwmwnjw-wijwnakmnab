const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const commands2 = ["mp3url", "ytmp3", "audio"];
commands2.forEach(command => {
    cmd({
        pattern: command,
        desc: "Download YouTube audio as MP3",
        category: "downloader",
        react: "🎵",
        filename: __filename
    }, async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) return reply("❌ Please provide a YouTube link.\nExample: .ytmp3 https://youtube.com/watch?v=xxx");
            if (!q.startsWith("http")) return reply("❌ Please provide a valid YouTube link.\nExample: .ytmp3 https://youtube.com/watch?v=xxx");

            let cleanUrl = q.split("&")[0];
            cleanUrl = cleanUrl.replace("https://youtu.be/", "https://www.youtube.com/watch?v=");

            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

            const videoId = cleanUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
            const search = await yts(cleanUrl).catch(() => null);
            const vid = search?.videos?.[0] || null;

            const title     = vid?.title || 'Audio';
            const channel   = vid?.author?.name || 'N/A';
            const duration  = vid?.timestamp || 'N/A';
            const views     = vid?.views ? vid.views.toLocaleString() : 'N/A';
            const thumbnail = vid?.thumbnail ||
                (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

            if (thumbnail) {
                await conn.sendMessage(from, {
                    image: { url: thumbnail },
                    caption: `🎶 *${title}*\n\n👤 *Channel:* ${channel}\n⏳ *Duration:* ${duration}\n👁 *Views:* ${views}\n\n> *⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
                }, { quoted: mek });
            }

            const audioUrl = await getAudioUrl(cleanUrl);

            if (!audioUrl) {
                await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                return reply("❌ Audio fetch failed. Please try again.");
            }

            const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 60000 });
            const audioBuffer = Buffer.from(audioRes.data);

            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (e) {
            console.error(`${command} error:`, e);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            reply("❌ An error occurred. Please try again.");
        }
    });
});

// ══════════════════════════════════
// SHARED: getAudioUrl — 3 API fallback
// exact response fields from tested responses
// ══════════════════════════════════
async function getAudioUrl(url) {

    // API 1: Elite
    // response: { status: true, result: { download: "url" } }
    try {
        const res = await axios.get(
            `https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(url)}`,
            { timeout: 25000 }
        );
        if (res.data?.status === true && res.data?.result?.download) {
            return res.data.result.download;
        }
    } catch {}

    // API 2: Gifted
    // response: { success: true, result: { download_url: "url" } }
    try {
        const res = await axios.get(
            `https://api.giftedtech.co.ke/api/download/ytmp3v2?apikey=gifted&url=${encodeURIComponent(url)}&quality=128`,
            { timeout: 25000 }
        );
        if (res.data?.success === true && res.data?.result?.download_url) {
            return res.data.result.download_url;
        }
    } catch {}

    // API 3: Jerry
    // response: { status: "success", url: "url" }
    try {
        const res = await axios.get(
            `https://jerrycoder.oggyapi.workers.dev/ytmp3?url=${encodeURIComponent(url)}`,
            { timeout: 25000 }
        );
        if (res.data?.status === "success" && res.data?.url) {
            return res.data.url;
        }
    } catch {}

    return null;
}
