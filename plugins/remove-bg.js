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

    if (!mimeType || !mimeType.startsWith("image/")) {
      return reply("❌ Please reply to an image");
    }

    await client.sendMessage(message.key.remoteJid, { react: { text: "⏳", key: message.key } });

    const mediaBuffer = await quotedMsg.download();
    if (!mediaBuffer || mediaBuffer.length === 0) {
      throw "Failed to download media";
    }

    let extension = '';
    if      (mimeType.includes('image/jpeg')) extension = '.jpg';
    else if (mimeType.includes('image/png'))  extension = '.png';
    else if (mimeType.includes('image/webp')) extension = '.webp';
    else extension = '.jpg';

    const tempFilePath = path.join(os.tmpdir(), `rmbg_${Date.now()}${extension}`);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    // Step 1: Uguu upload
    const uguuForm = new FormData();
    uguuForm.append('files[]', fs.createReadStream(tempFilePath), `file${extension}`);

    const uguuResponse = await axios.post('https://uguu.se/upload.php', uguuForm, {
      headers: { ...uguuForm.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
      timeout: 60000
    });

    if (!uguuResponse.data?.files?.[0]?.url) {
      throw "Failed to upload to Uguu";
    }

    const uguuUrl = uguuResponse.data.files[0].url;

    // Step 2: Catbox upload
    const catboxForm = new FormData();
    catboxForm.append('reqtype', 'urlupload');
    catboxForm.append('url', uguuUrl);

    const catboxResponse = await axios.post('https://catbox.moe/user/api.php', catboxForm, {
      headers: { ...catboxForm.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
      timeout: 60000
    });

    fs.unlinkSync(tempFilePath);

    let catboxUrl = catboxResponse.data.trim();
    if (!catboxUrl || catboxUrl.toLowerCase().includes('error')) {
      throw "Catbox upload failed";
    }
    if (catboxUrl.endsWith('.bin') && extension) {
      catboxUrl = catboxUrl.substring(0, catboxUrl.lastIndexOf('.')) + extension;
    }

    // Step 3: Remove background API
    // response: { status: "success", result: { url: "...", server: "..." } }
    const rmbgResponse = await axios.get(WORKER_URL, {
      params: { url: catboxUrl },
      timeout: 60000
    });

    const data = rmbgResponse.data;
    if (data.status !== "success" || !data.result?.url) {
      throw "Background removal failed";
    }

    const resultUrl = data.result.url;

    // Step 4: Download result
    const resultBuffer = await axios.get(resultUrl, {
      responseType: "arraybuffer",
      timeout: 30000
    });

    const size = formatBytes(resultBuffer.data.length);

    await client.sendMessage(message.key.remoteJid, { react: { text: "✅", key: message.key } });

    await client.sendMessage(
      message.key.remoteJid,
      {
        image: Buffer.from(resultBuffer.data),
        caption: `\`REMOVE BACKGROUND\`\n\n📦 SIZE: ${size}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ 🍸`
      },
      { quoted: message }
    );

  } catch (err) {
    console.error("RMBG Error:", err.message || err);
    await client.sendMessage(message.key.remoteJid, { react: { text: "❌", key: message.key } });
    reply("❌ Background remove error, try again");
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
