const axios = require("axios");
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require("path");
const { cmd } = require("../command");

const WORKER_URL = "https://jerrycoder.oggyapi.workers.dev/rembg";

cmd({
  pattern: "rmbg",
  alias: ["removebg", "rbg"],
  react: '📸',
  desc: "Remove background from image",
  category: "editing",
  filename: __filename
}, async (client, message, match, { reply }) => {
  try {

    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

    if (!mimeType.startsWith("image/")) {
      return reply("❌ Please reply to an image");
    }

    const mediaBuffer = await quotedMsg.download();

    if (!mediaBuffer || mediaBuffer.length === 0) {
      throw "Failed to download image";
    }

    let extension = mimeType.includes('png') ? '.png' : '.jpg';

    const tempFilePath = path.join(os.tmpdir(), `rmbg_${Date.now()}${extension}`);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    // ✅ Step 1: Upload to Uguu
    const uguuForm = new FormData();
    uguuForm.append('files[]', fs.createReadStream(tempFilePath), `file${extension}`);

    const uguuResponse = await axios.post('https://uguu.se/upload.php', uguuForm, {
      headers: {
        ...uguuForm.getHeaders(),
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!uguuResponse.data?.files?.[0]?.url) {
      throw "Uguu upload failed";
    }

    const uguuUrl = uguuResponse.data.files[0].url;

    // ✅ Step 2: Upload to Catbox
    const catboxForm = new FormData();
    catboxForm.append('reqtype', 'urlupload');
    catboxForm.append('url', uguuUrl);

    const catboxResponse = await axios.post('https://catbox.moe/user/api.php', catboxForm, {
      headers: {
        ...catboxForm.getHeaders(),
        'User-Agent': 'Mozilla/5.0'
      }
    });

    fs.unlinkSync(tempFilePath);

    let imageUrl = catboxResponse.data.trim();

    if (!imageUrl || imageUrl.toLowerCase().includes('error')) {
      throw "Catbox upload failed";
    }

    // ✅ Step 3: Call RMBG API
    const apiRes = await axios.get(`${WORKER_URL}?url=${encodeURIComponent(imageUrl)}`);

    const data = apiRes.data;

    if (data.status !== "success" || !data.result?.url) {
      throw "RMBG API failed";
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

    await client.sendMessage(message.chat, {
      image: Buffer.from(resultBuffer.data),
      caption: `\`REMOVE BACKGROUND\`

📦 SIZE: ${size}

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ 🍸`
    }, { quoted: message });

  } catch (error) {
    console.error(error);
    await reply(`❌ Error: ${error.message || error}`);
  }
});
