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
            if (!q) return reply("❌ Please provide a YouTube link.\nExample: .ytmp3 https://youtube.com/watch?v=xxx")

            if (!q.startsWith("http")) return reply("❌ Please provide a valid YouTube link.\nExample: .ytmp3 https://youtube.com/watch?v=xxx")

            let cleanUrl = q.split("&")[0]
            cleanUrl = cleanUrl.replace("https://youtu.be/", "https://www.youtube.com/watch?v=")

            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } })

            const videoId = cleanUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]
            const search = await yts(cleanUrl).catch(() => null)
            const vid = search?.videos?.[0] || null

            const views = vid?.views ? vid.views.toLocaleString() : 'N/A'
            const channel = vid?.author?.name || 'N/A'
            const duration = vid?.timestamp || 'N/A'
            const thumbnail = vid?.thumbnail ||
                (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null)
            const title = vid?.title || 'Audio'

            if (thumbnail) {
                await conn.sendMessage(from, {
                    image: { url: thumbnail },
                    caption: `🎶 *${title}*\n\n👤 *Channel:* ${channel}\n⏳ *Duration:* ${duration}\n👁 *Views:* ${views}\n\n> *⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ ⚡*`
                }, { quoted: mek })
            }

            let audioBuffer = null
            let success = false

            // ── API 1: Elite ──
            if (!success) {
                try {
                    const res = await axios.get(
                        `https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(cleanUrl)}`,
                        { timeout: 30000 }
                    )
                    if (res.data?.status && res.data?.result?.download) {
                        const audioRes = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 60000 })
                        audioBuffer = Buffer.from(audioRes.data)
                        success = true
                    }
                } catch {}
            }

            // ── API 2: Gifted ──
            if (!success) {
                try {
                    const res = await axios.get(
                        `https://api.giftedtech.co.ke/api/download/ytmp3v2?apikey=gifted&url=${encodeURIComponent(cleanUrl)}&quality=128`,
                        { timeout: 30000 }
                    )
                    const result = res.data.result || res.data.results || res.data
                    const url = result?.download_url || result?.downloadUrl || result?.url || result?.audio || result?.link
                    if (url) {
                        const audioRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 })
                        audioBuffer = Buffer.from(audioRes.data)
                        success = true
                    }
                } catch {}
            }

            // ── API 3: Jerry ──
            if (!success) {
                try {
                    const res = await axios.get(
                        `https://jerrycoder.oggyapi.workers.dev/ytmp3?url=${encodeURIComponent(cleanUrl)}`,
                        { timeout: 30000 }
                    )
                    if (res.data?.status === "success" && res.data?.url) {
                        const audioRes = await axios.get(res.data.url, { responseType: 'arraybuffer', timeout: 60000 })
                        audioBuffer = Buffer.from(audioRes.data)
                        success = true
                    }
                } catch {}
            }

            if (!success || !audioBuffer) {
                await conn.sendMessage(from, { react: { text: "❌", key: mek.key } })
                return reply("❌ Audio fetch failed. Please try again.")
            }

            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`
            }, { quoted: mek })

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } })

        } catch (e) {
            console.error(`${command} error:`, e)
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } })
            reply("❌ An error occurred. Please try again.")
        }
    });
});