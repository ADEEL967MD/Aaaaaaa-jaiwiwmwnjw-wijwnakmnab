const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { cmd } = require("../command");

const API = "https://jerrycoder.oggyapi.workers.dev/rembg";

cmd({
  pattern: "rmbg",
  alias: ["removebg", "rbg"],
  react: "📸",
  desc: "Remove background",
  category: "editing",
  filename: __filename
}, async (client, message, match, { reply }) => {
  try {
    const q = message.quoted ? message.quoted : message;
    const mime = (q.msg || q).mimetype || "";
    if (!mime.startsWith("image/")) return reply("❌ Reply to an image");

    const buffer = await q.download();
    if (!buffer) throw "Download failed";

    let ext = mime.includes("png") ? ".png" : ".jpg";
    const file = path.join(os.tmpdir(), `rmbg_${Date.now()}${ext}`);
    fs.writeFileSync(file, buffer);

    let imageUrl;

    try {
      const f1 = new FormData();
      f1.append("files[]", fs.createReadStream(file), `file${ext}`);

      const u1 = await axios.post("https://uguu.se/upload.php", f1, {
        headers: { ...f1.getHeaders(), "User-Agent": "Mozilla/5.0" },
        timeout: 60000
      });

      const uguu = u1.data?.files?.[0]?.url;
      if (!uguu) throw "Uguu failed";

      const f2 = new FormData();
      f2.append("reqtype", "urlupload");
      f2.append("url", uguu);

      const u2 = await axios.post("https://catbox.moe/user/api.php", f2, {
        headers: { ...f2.getHeaders(), "User-Agent": "Mozilla/5.0" },
        timeout: 60000
      });

      imageUrl = (u2.data || "").trim();
      if (!imageUrl || imageUrl.includes("error")) throw "Catbox failed";

    } catch {
      const f = new FormData();
      f.append("fileToUpload", buffer);
      f.append("reqtype", "fileupload");

      const up = await axios.post("https://catbox.moe/user/api.php", f, {
        headers: f.getHeaders(),
        timeout: 60000
      });

      imageUrl = (up.data || "").trim();
      if (!imageUrl || imageUrl.includes("error")) throw "Upload failed";
    }

    const api = await axios.get(`${API}?url=${encodeURIComponent(imageUrl)}`, {
      timeout: 60000,
      validateStatus: () => true
    });

    if (api.status !== 200 || api.data?.status !== "success" || !api.data?.result?.url) {
      throw "API failed";
    }

    const res = await axios.get(api.data.result.url, {
      responseType: "arraybuffer",
      timeout: 60000
    });

    const size = (b => {
      if (!b) return "0 Bytes";
      const k = 1024, s = ["Bytes","KB","MB"], i = Math.floor(Math.log(b)/Math.log(k));
      return (b/Math.pow(k,i)).toFixed(2)+" "+s[i];
    })(res.data.length);

    fs.unlinkSync(file);

    await client.sendMessage(message.chat, {
      image: Buffer.from(res.data),
      caption: `\`REMOVE BACKGROUND\`\n\n📦 SIZE: ${size}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴇᴇʟ-ᴍᴅ 🍸`
    }, { quoted: message });

  } catch (e) {
    await reply("❌ Error processing image");
  }
});
