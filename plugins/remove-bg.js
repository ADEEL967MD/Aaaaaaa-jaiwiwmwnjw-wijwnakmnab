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
            return reply("❌ Reply to an image");
        }

        await conn.sendMessage(m.chat, { react: { text: "⏳", key: message.key } });

        const buffer = await quoted.download();
        if (!buffer) throw new Error("Download failed");

        // ✅ Upload to Catbox (BEST & stable)
        const FormData = require("form-data");
        const form = new FormData();
        form.append("fileToUpload", buffer);
        form.append("reqtype", "fileupload");

        const uploadRes = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: form.getHeaders()
        });

        const imageUrl = uploadRes.data;
        if (!imageUrl) throw new Error("Upload failed");

        // ✅ Call new API (URL method)
        const apiRes = await axios.get(`${WORKER_URL}?url=${encodeURIComponent(imageUrl)}`);

        const data = apiRes.data;

        if (data.status !== "success" || !data.result?.url) {
            throw new Error("API failed");
        }

        const resultUrl = data.result.url;

        const resultBuffer = await axios.get(resultUrl, {
            responseType: "arraybuffer"
        });

        // Size function
        const formatBytes = (bytes) => {
            if (bytes === 0) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
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
        console.error("ERROR:", err.message);
        await conn.sendMessage(m.chat, { react: { text: "❌", key: message.key } });
        reply("❌ Error removing background");
    }
});
