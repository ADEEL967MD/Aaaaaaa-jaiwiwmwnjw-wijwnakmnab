const axios = require("axios");
const { cmd } = require("../command");

const WORKER_URL = "https://jerrycoder.oggyapi.workers.dev/rembg";

cmd({
    pattern: "rmbg",
    alias: ["removebg", "rbg"],
    react: '📸',
    desc: "Remove background from image",
    category: "editing",
    filename: __filename
}, async (conn, message, m, { reply }) => {
    try {
        const quoted = message.quoted || message;
        const mime = quoted.mimetype || quoted.msg?.mimetype || "";

        if (!mime.startsWith("image/")) {
            return reply("❌ Please reply to an image");
        }

        await conn.sendMessage(m.chat, { react: { text: "⏳", key: message.key } });

        const buffer = await quoted.download();
        if (!buffer) throw new Error("Image download failed");

        // 👉 Upload image to temp URL (important step)
        const upload = await axios.post("https://api.anonfiles.com/upload", {
            file: buffer
        });

        const imageUrl = upload.data?.data?.file?.url?.full;
        if (!imageUrl) throw new Error("Upload failed");

        // 👉 Call your worker with URL
        const response = await axios.get(`${WORKER_URL}?url=${encodeURIComponent(imageUrl)}`, {
            timeout: 60000
        });

        const data = response.data;

        if (data.status !== "success" || !data.result?.url) {
            throw new Error("Worker error");
        }

        const resultUrl = data.result.url;

        const resultBuffer = await axios.get(resultUrl, {
            responseType: "arraybuffer",
            timeout: 30000
        });

        // Size function
        const formatBytes = (bytes) => {
            if (bytes === 0) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
        };

        const size = formatBytes(resultBuffer.data.length);

        await conn.sendMessage(m.chat, { react: { text: "✅", key: message.key } });

        await conn.sendMessage(
            m.chat,
            {
                image: Buffer.from(resultBuffer.data),
                caption: `\`REMOVE BACKGROUND\`

📦 SIZE: ${size}

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ 🍸`
            },
            { quoted: m }
        );

    } catch (err) {
        console.error("RMBG Error:", err.message);
        await conn.sendMessage(m.chat, { react: { text: "❌", key: message.key } });
        reply("❌ Background remove error, try again");
    }
});
