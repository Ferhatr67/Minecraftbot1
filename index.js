require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField, EmbedBuilder, Events, AttachmentBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, MessageEmbed, AuditLogEvent } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const fs = require("fs");
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytSearch = require('yt-search');
const ms = require('ms');
const mongoose = require('mongoose');
const Discord = require("discord.js");
const { createCanvas, loadImage } = require('canvas');
const Canvas = require('canvas');
const krediVeriDosyasi = './kredi.json';
const path = require('path');
const marketPath = path.join(__dirname, 'market.json');
const inventoryPath = path.join(__dirname, 'inventory.json');
const tradePath = path.join(__dirname, 'trades.json');
const express = require("express");
const cors = require("cors");
const sunucuOtoCevaplar = {};

const config = {
  token: 'process.env.DISCORD_TOKEN',
  prefix: 'f!'
};

const FreeGPT3 = require("freegptjs");

const app = express();
const port = 3000;

const openai = new FreeGPT3();

app.use(cors());
app.use(express.json());

// ZIP ve RAR okuma modülleri
const AdmZip = require('adm-zip');
const unrar = require('unrar-js');

// Gemini AI Kurulumu
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Discord Client Kurulumu
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates
    ] 
});

const prefix = "f!";
const ongoingBattles = new Map();
const kelimeler2 = [
  "kalem", "elma", "okul", "masa", "fare", "defter",
  "bilgisayar", "telefon", "kitap", "çanta", "sandalye", "bardak",
  "yastık", "pencere", "dolap", "ayna", "kavanoz", "makas", "cetvel",
  "süpürge", "televizyon", "kumanda", "klavye", "mouse", "yorgan",
  "şemsiye", "pantolon", "çorap", "ayakkabı", "kasket", "balık",
  "uçak", "araba", "kamyon", "traktör", "otobüs", "tren", "bisiklet",
  "uçurtma", "salıncak", "top", "oyuncak", "bebek", "lego", "zar",
  "tabak", "kaşık", "çatal", "bıçak", "tencere", "tava", "kepçe",
  "çikolata", "dondurma", "pasta", "meyve", "karpuz", "üzüm", "kavun",
  "armut", "muz", "portakal", "mandalina", "kivi", "çilek", "kiraz"
];

// Kullanıcı bellekleri için nesne
const userMemories = {};
// Kullanıcı dilleri için nesne (varsayılan: tr)
const userLanguages = {};

// Desteklenen diller
const SUPPORTED_LANGUAGES = {
    'tr': 'Türkçe',
    'en': 'English',
    'de': 'Deutsch',
    'es': 'Español'
};

// Varsayılan dil
const DEFAULT_LANGUAGE = 'tr';

// Bellek temizleme fonksiyonu (30 dakika sonra bellek silinir)
function clearMemory(userId) {
    setTimeout(() => {
        delete userMemories[userId];
        console.log(`${userId} kullanıcısının belleği temizlendi`);
    }, 30 * 60 * 1000); // 30 dakika
}

// Fotoğrafı base64'e çevirme fonksiyonu
async function getImageBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        console.error("<a:karbotyanls:1380579775235489812> Fotoğraf indirme hatası:", error);
        return null;
    }
}

// Dosya indirme fonksiyonu
async function downloadFile(url, filePath) {
    const writer = fs.createWriteStream(filePath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// ZIP dosyasını okuma fonksiyonu
async function readZipFile(filePath) {
    try {
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();
        let content = 'ZIP dosyası içeriği:\n\n';

        for (const entry of zipEntries) {
            if (!entry.isDirectory) {
                content += `📄 Dosya: ${entry.entryName}\n`;
                
                // Sadece metin dosyalarını oku (uzantı kontrolü)
                const ext = path.extname(entry.entryName).toLowerCase();
                if (['.txt', '.json', '.csv', '.md', '.log', '.xml', '.html', '.js', '.css'].includes(ext)) {
                    const fileContent = zip.readAsText(entry);
                    content += `İçerik:\n${fileContent.substring(0, 500)}...\n\n`;
                }
            }
        }

        return content;
    } catch (error) {
        console.error("<a:karbotyanls:1380579775235489812> ZIP okuma hatası:", error);
        return `<a:karbotyanls:1380579775235489812> ZIP dosyası okunurken hata oluştu: ${error.message}`;
    }
}

// RAR dosyasını okuma fonksiyonu
async function readRarFile(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        const extracted = await unrar.extractAll(buffer);
        let content = 'RAR dosyası içeriği:\n\n';

        for (const file of extracted.files) {
            content += `📄 Dosya: ${file.name}\n`;
            
            // Sadece metin dosyalarını oku (uzantı kontrolü)
            const ext = path.extname(file.name).toLowerCase();
            if (['.txt', '.json', '.csv', '.md', '.log', '.xml', '.html', '.js', '.css'].includes(ext)) {
                const fileContent = file.extraction.toString('utf8');
                content += `İçerik:\n${fileContent.substring(0, 500)}...\n\n`;
            }
        }

        return content;
    } catch (error) {
        console.error("<a:karbotyanls:1380579775235489812> RAR okuma hatası:", error);
        return `<a:karbotyanls:1380579775235489812> RAR dosyası okunurken hata oluştu: ${error.message}`;
    }
}

// Dil prompt'u oluşturma fonksiyonu
function getLanguagePrompt(languageCode, message, hasImage = false) {
    const languageMap = {
        'tr': {
            text: `Aşağıdaki mesaja Türkçe yanıt ver${hasImage ? ' ve eğer fotoğraf varsa onu analiz et' : ''}:\n${message}`,
            noText: hasImage ? 'Bu fotoğrafı analiz et ve Türkçe yanıt ver' : 'Merhaba! Nasıl yardımcı olabilirim?'
        },
        'en': {
            text: `Respond to the following message in English${hasImage ? ' and analyze the image if provided' : ''}:\n${message}`,
            noText: hasImage ? 'Analyze this photo and respond in English' : 'Hello! How can I help you?'
        },
        'de': {
            text: `Antworte auf die folgende Nachricht auf Deutsch${hasImage ? ' und analysiere das Bild, falls vorhanden' : ''}:\n${message}`,
            noText: hasImage ? 'Analysiere dieses Foto und antworte auf Deutsch' : 'Hallo! Wie kann ich dir helfen?'
        },
        'es': {
            text: `Responde al siguiente mensaje en español${hasImage ? ' y analiza la imagen si se proporciona' : ''}:\n${message}`,
            noText: hasImage ? 'Analiza esta foto y responde en español' : '¡Hola! ¿Cómo puedo ayudarte?'
        }
    };
    
    return message ? languageMap[languageCode].text : languageMap[languageCode].noText;
}

// Moderasyon işlemleri için fonksiyonlar
async function handleModerationAction(interactionOrMessage, action, targetUser, reason = 'Sebep belirtilmedi') {
    const isSlash = interactionOrMessage instanceof ChatInputCommandInteraction;
    const guild = isSlash ? interactionOrMessage.guild : interactionOrMessage.guild;
    const reply = isSlash ? interactionOrMessage.reply.bind(interactionOrMessage) : interactionOrMessage.reply.bind(interactionOrMessage);
    
    if (!guild) {
        return reply('Bu komut sadece sunucularda kullanılabilir.');
    }

    const member = await guild.members.fetch(interactionOrMessage.user.id);
    if (!member.permissions.has(PermissionFlagsBits[action])) {
        return reply(`Bu işlemi yapmak için gerekli yetkiniz yok (${action}).`);
    }

    try {
        const targetMember = await guild.members.fetch(targetUser.id);
        
        switch (action) {
            case 'BanMembers':
                await targetMember.ban({ reason });
                return reply(`${targetUser.tag} kullanıcısı banlandı. Sebep: ${reason}`);
            case 'KickMembers':
                await targetMember.kick(reason);
                return reply(`${targetUser.tag} kullanıcısı atıldı. Sebep: ${reason}`);
            case 'ModerateMembers':
                await targetMember.timeout(60 * 60 * 1000, reason); // 1 saat timeout
                return reply(`${targetUser.tag} kullanıcısı susturuldu. Sebep: ${reason}`);
            default:
                return reply('Geçersiz moderasyon eylemi.');
        }
    } catch (error) {
        console.error('Moderasyon hatası:', error);
        return reply('<a:karbotyanls:1380579775235489812> Kullanıcı üzerinde işlem yapılırken bir hata oluştu.');
    }
}


// Slash Komut İşleyicisi
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    // Dil Komutu
    if (interaction.commandName === "language") {
        const language = interaction.options.getString("language");
        const userId = interaction.user.id;
        
        if (SUPPORTED_LANGUAGES[language]) {
            userLanguages[userId] = language;
            await interaction.reply(`Diliniz ${SUPPORTED_LANGUAGES[language]} olarak ayarlandı!`);
        } else {
            await interaction.reply(`<a:karbotyanls:1380579775235489812> Geçersiz dil! Desteklenen diller: ${Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => `${code} - ${name}`).join(', ')}`);
        }
        return;
    }
    
    // Sohbet Komutu
    if (interaction.commandName === "sosasadsdwasdaswru") {
        const mesaj = interaction.options.getString("mesaj");
        const userId = interaction.user.id;
        const userLanguage = userLanguages[userId] || DEFAULT_LANGUAGE;
        
        await interaction.deferReply();
        
        try {
            // Moderasyon komutlarını kontrol et
            const moderationActions = {
                'banla': 'BanMembers',
                'at': 'KickMembers',
                'mutele': 'ModerateMembers'
            };
            
            for (const [keyword, permission] of Object.entries(moderationActions)) {
                if (mesaj && mesaj.toLowerCase().includes(keyword) && interaction.mentions.users.size > 0) {
                    const targetUser = interaction.mentions.users.first();
                    return handleModerationAction(interaction, permission, targetUser, mesaj);
                }
            }
            
            // Kullanıcının önceki konuşmalarını al veya yeni bir tane oluştur
            if (!userMemories[userId]) {
                userMemories[userId] = [];
                clearMemory(userId);
            }
            
            // Eğer ekli dosya varsa işle
            let imagePart = null;
            let archiveContent = null;
            
            if (interaction.options.getAttachment('resim')) {
                const attachment = interaction.options.getAttachment('resim');
                
                // ZIP veya RAR dosyası kontrolü
                if (attachment.name.endsWith('.zip') || attachment.name.endsWith('.rar')) {
                    const tempFilePath = `temp_${Date.now()}_${attachment.name}`;
                    await downloadFile(attachment.url, tempFilePath);
                    
                    if (attachment.name.endsWith('.zip')) {
                        archiveContent = await readZipFile(tempFilePath);
                    } else if (attachment.name.endsWith('.rar')) {
                        archiveContent = await readRarFile(tempFilePath);
                    }
                    
                    fs.unlinkSync(tempFilePath);
                } 
                // Resim dosyası kontrolü
                else if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    const imageBase64 = await getImageBase64(attachment.url);
                    if (imageBase64) {
                        imagePart = {
                            inlineData: {
                                mimeType: attachment.contentType,
                                data: imageBase64
                            }
                        };
                    }
                }
            }
            
            // Mesajı oluştur (dil desteği ile)
            const parts = [];
            let promptMessage = mesaj || '';
            
            if (archiveContent) {
                promptMessage += `\n\nAşağıdaki arşiv dosyası içeriği:\n${archiveContent}`;
            }
            
            if (promptMessage.trim()) {
                const languagePrompt = getLanguagePrompt(userLanguage, promptMessage, !!imagePart);
                parts.push({ text: languagePrompt });
            } else if (imagePart) {
                const languagePrompt = getLanguagePrompt(userLanguage, null, true);
                parts.push({ text: languagePrompt });
            } else {
                await interaction.editReply("<a:karbotyanls:1380579775235489812> Lütfen bir mesaj yazın veya fotoğraf/arşiv dosyası ekleyin!");
                return;
            }
            
            if (imagePart) parts.push(imagePart);
            
            const result = await model.generateContent({
                contents: [
                    ...userMemories[userId],
                    { role: 'user', parts: parts }
                ]
            });
            
            const response = await result.response;
            const text = response.text();
            
            // Belleği güncelle
            userMemories[userId].push(
                { role: 'user', parts: parts },
                { role: 'model', parts: [{ text: text }] }
            );
            
            // Bellek çok büyükse eski mesajları sil (son 20 mesaj tutulsun)
            if (userMemories[userId].length > 20) {
                userMemories[userId] = userMemories[userId].slice(-20);
            }
            
            await interaction.editReply(text);
        } catch (err) {
            console.error(err);
            await interaction.editReply("<a:karbotyanls:1380579775235489812> Bir hata oluştu: " + err.message);
        }
    }
    
    // Resim Komutu
    if (interaction.commandName === "resim") {
        const prompt = interaction.options.getString("prompt");
        await interaction.deferReply();
        
        try {
            const response = await axios.post(
                "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
                { inputs: prompt },
                {
                    headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
                    responseType: "arraybuffer"
                }
            );
            
            const imageBuffer = Buffer.from(response.data, "binary");
            fs.writeFileSync("temp_image.png", imageBuffer);
            
            const attachment = new AttachmentBuilder("temp_image.png");
            await interaction.editReply({ files: [attachment] });
            fs.unlinkSync("temp_image.png");
            
        } catch (error) {
            console.error("Resim oluşturma hatası:", error);
            await interaction.editReply("<a:karbotyanls:1380579775235489812> Resim oluşturulamadı: " + error.message);
        }
    }
});

// Prefix Komut İşleyicisi
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    
    // Dil Komutu
    if (message.content.startsWith(`${prefix}language`)) {
        const args = message.content.split(' ');
        if (args.length < 2) {
            return message.reply(`<a:karbotyanls:1380579775235489812> Kullanım: ${prefix}language <dil>\nDesteklenen diller: ${Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => `${code} - ${name}`).join(', ')}`);
        }
        
        const language = args[1].toLowerCase();
        const userId = message.author.id;
        
        if (SUPPORTED_LANGUAGES[language]) {
            userLanguages[userId] = language;
            await message.reply(`<a:karbotonay:1380578520094343280> Diliniz ${SUPPORTED_LANGUAGES[language]} olarak ayarlandı!`);
        } else {
            await message.reply(`<a:karbotyanls:1380579775235489812> Geçersiz dil! Desteklenen diller: ${Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => `${code} - ${name}`).join(', ')}`);
        }
        return;
    }
    
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Sohbet Komutu
    if (command === "soru") {
        const userMessage = args.join(" ");
        const userId = message.author.id;
        const userLanguage = userLanguages[userId] || DEFAULT_LANGUAGE;
        
        if (!userMessage && message.attachments.size === 0) {
            return message.reply("<a:karbotyanls:1380579775235489812> Lütfen bir mesaj yaz veya fotoğraf/arşiv dosyası ekle!");
        }

        try {
            // Moderasyon komutlarını kontrol et
            const moderationActions = {
                'banla': 'BanMembers',
                'at': 'KickMembers',
                'mutele': 'ModerateMembers',
                'sustur': 'ModerateMembers',
                'yasakla': 'BanMembers',
                'kick': 'KickMembers'
            };
            
            for (const [keyword, permission] of Object.entries(moderationActions)) {
                if (userMessage && userMessage.toLowerCase().includes(keyword) && message.mentions.users.size > 0) {
                    const targetUser = message.mentions.users.first();
                    return handleModerationAction(message, permission, targetUser, userMessage);
                }
            }
            
            // Kullanıcının önceki konuşmalarını al veya yeni bir tane oluştur
            if (!userMemories[userId]) {
                userMemories[userId] = [];
                clearMemory(userId);
            }
            
            // Eğer ekli dosya varsa işle
            let imagePart = null;
            let archiveContent = null;
            
            if (message.attachments.size > 0) {
                const attachment = message.attachments.first();
                
                // ZIP veya RAR dosyası kontrolü
                if (attachment.name.endsWith('.zip') || attachment.name.endsWith('.rar')) {
                    const tempFilePath = `temp_${Date.now()}_${attachment.name}`;
                    await downloadFile(attachment.url, tempFilePath);
                    
                    if (attachment.name.endsWith('.zip')) {
                        archiveContent = await readZipFile(tempFilePath);
                    } else if (attachment.name.endsWith('.rar')) {
                        archiveContent = await readRarFile(tempFilePath);
                    }
                    
                    fs.unlinkSync(tempFilePath);
                } 
                // Resim dosyası kontrolü
                else if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    const imageBase64 = await getImageBase64(attachment.url);
                    if (imageBase64) {
                        imagePart = {
                            inlineData: {
                                mimeType: attachment.contentType,
                                data: imageBase64
                            }
                        };
                    }
                }
            }
            
            // Mesajı oluştur (dil desteği ile)
            const parts = [];
            let promptMessage = userMessage || '';
            
            if (archiveContent) {
                promptMessage += `\n\nAşağıdaki arşiv dosyası içeriği:\n${archiveContent}`;
            }
            
            if (promptMessage.trim()) {
                const languagePrompt = getLanguagePrompt(userLanguage, promptMessage, !!imagePart);
                parts.push({ text: languagePrompt });
            } else if (imagePart) {
                const languagePrompt = getLanguagePrompt(userLanguage, null, true);
                parts.push({ text: languagePrompt });
            }
            
            if (imagePart) parts.push(imagePart);
            
            const result = await model.generateContent({
                contents: [
                    ...userMemories[userId],
                    { role: 'user', parts: parts }
                ]
            });
            
            const response = await result.response;
            const text = response.text();
            
            // Belleği güncelle
            userMemories[userId].push(
                { role: 'user', parts: parts },
                { role: 'model', parts: [{ text: text }] }
            );
            
            // Bellek çok büyükse eski mesajları sil (son 20 mesaj tutulsun)
            if (userMemories[userId].length > 20) {
                userMemories[userId] = userMemories[userId].slice(-20);
            }
            
            message.channel.send(text);
        } catch (error) {
            console.error(error);
            message.channel.send("<a:karbotyanls:1380579775235489812> Bir hata oluştu: " + error.message);
        }
    }
    
    // Resim Komutu
    if (command === "resim") {
        const prompt = args.join(" ");
        if (!prompt) return message.reply("Lütfen bir prompt yaz!");
        
        const loadingMsg = await message.reply("🖌️ Resim oluşturuluyor...");
        
        try {
            const response = await axios.get(
                `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`,
                { responseType: "arraybuffer" }
            );
            
            const imageBuffer = Buffer.from(response.data, "binary");
            fs.writeFileSync("temp_image.png", imageBuffer);
            
            await message.channel.send({
                files: ["temp_image.png"]
            });
            
            fs.unlinkSync("temp_image.png");
            await loadingMsg.delete();
        } catch (error) {
            console.error(error);
            await loadingMsg.edit("<a:karbotyanls:1380579775235489812> Resim oluşturulamadı: " + error.message);
        }
    }
});

// Slash Komutlarını Kaydet
const commands = [
    new SlashCommandBuilder()
        .setName("sohbet")
        .setDescription("Gemini ile sohbet et!")
        .addStringOption(option =>
            option.setName("mesaj")
                .setDescription("Ne söylemek istersin?")
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName("resim")
                .setDescription("Analiz edilecek fotoğraf veya arşiv dosyası (ZIP/RAR)")
                .setRequired(false))
        .toJSON(),
    new SlashCommandBuilder()
        .setName("resim")
        .setDescription("AI ile resim oluştur!")
        .addStringOption(option =>
            option.setName("prompt")
                .setDescription("Oluşturulacak resim açıklaması")
                .setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName("language")
        .setDescription("Botun dilini ayarla")
        .addStringOption(option =>
            option.setName("language")
                .setDescription("Seçilecek dil")
                .setRequired(true)
                .addChoices(
                    { name: 'Türkçe', value: 'tr' },
                    { name: 'English', value: 'en' },
                    { name: 'Deutsch', value: 'de' },
                    { name: 'Español', value: 'es' }
                ))
        .toJSON()
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("Komutlar yükleniyor...");
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log("Komutlar başarıyla yüklendi.");
    } catch (error) {
        console.error(error);
    }
})();

// DisTube yapılandırması
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [new SpotifyPlugin(), new SoundCloudPlugin(), new YtDlpPlugin()],
    emitAddListWhenCreatingQueue: false
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const komut = args.shift().toLowerCase();
  const sesKanalı = message.member.voice.channel;

  const sesKomutları = ['çal', 'dur', 'geç', 'duraklat', 'devam', 'ses', 'kuyruk', 'döngü', 'çalıyor', 'ara', 'ileri', 'geri'];
  if (sesKomutları.includes(komut) && !sesKanalı) {
    return mesajGönder(message, {
      title: '❌ Hata',
      description: 'Bu komutu kullanmak için bir ses kanalına katılmalısınız!',
      color: 0xFF0000
    });
  }

  try {
    switch (komut) {
      case 'çal':
        if (!args[0]) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Lütfen bir şarkı adı veya URL girin!',
            color: 0xFF0000
          });
        }
        await distube.play(sesKanalı, args.join(' '), {
          member: message.member,
          textChannel: message.channel
        });
        break;

      case 'dur':
        distube.stop(message);
        mesajGönder(message, {
          title: '⏹️ Müzik Durduruldu',
          description: 'Müzik durduruldu ve kanaldan ayrıldım.',
          color: 0x3498DB
        });
        break;

      case 'geç':
        const kuyruk = distube.getQueue(message);
        if (!kuyruk) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Şu anda çalan bir şarkı yok!',
            color: 0xFF0000
          });
        }
        await distube.skip(message);
        mesajGönder(message, {
          title: '⏭️ Şarkı Geçildi',
          description: 'Bir sonraki şarkıya geçiliyor...',
          color: 0x2ECC71
        });
        break;

      case 'duraklat':
        distube.pause(message);
        mesajGönder(message, {
          title: '⏸️ Müzik Duraklatıldı',
          description: 'Müzik duraklatıldı. Devam ettirmek için `f!devam` kullanın.',
          color: 0xF39C12
        });
        break;

      case 'devam':
        distube.resume(message);
        mesajGönder(message, {
          title: '▶️ Müzik Devam Ediyor',
          description: 'Müzik kaldığı yerden devam ediyor.',
          color: 0x2ECC71
        });
        break;

      case 'ses':
        const ses = parseInt(args[0]);
        if (isNaN(ses) || ses < 0 || ses > 3000) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Lütfen 0 ile 150 arasında bir ses seviyesi girin!',
            color: 0xFF0000
          });
        }
        distube.setVolume(message, ses);
        mesajGönder(message, {
          title: '🔊 Ses Seviyesi Ayarlanıyor',
          description: `Ses seviyesi ${ses}% olarak ayarlandı.`,
          color: 0x3498DB
        });
        break;

      case 'kuyruk':
        const sıra = distube.getQueue(message);
        if (!sıra) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Şu anda çalan bir şarkı yok!',
            color: 0xFF0000
          });
        }

        const şuankiŞarkı = sıra.songs[0];
        const sonrakiŞarkılar = sıra.songs.slice(1, 11);

        const embed = new EmbedBuilder()
          .setTitle('🎶 Müzik Kuyruğu')
          .setColor(0x9B59B6)
          .addFields(
            {
              name: 'Şimdi Çalıyor',
              value: `[${şuankiŞarkı.name}](${şuankiŞarkı.url}) - \`${şuankiŞarkı.formattedDuration}\``
            },
            {
              name: 'Sıradaki Şarkılar',
              value: sonrakiŞarkılar.length > 0 
                ? sonrakiŞarkılar.map((şarkı, i) => `${i + 1}. [${şarkı.name}](${şarkı.url}) - \`${şarkı.formattedDuration}\``).join('\n')
                : 'Kuyrukta başka şarkı yok.'
            }
          )
          .setFooter({ text: `Toplam ${sıra.songs.length} şarkı | ${sıra.formattedDuration} süre` });

        if (şuankiŞarkı.thumbnail) {
          embed.setThumbnail(şuankiŞarkı.thumbnail);
        }

        message.channel.send({ embeds: [embed] });
        break;

      case 'döngü':
        const mod = distube.setRepeatMode(message);
        const modAdı = mod ? (mod === 2 ? '🔁 Kuyruk Tekrarı' : '🔂 Şarkı Tekrarı') : '❌ Tekrar Kapalı';
        mesajGönder(message, {
          title: '🔁 Tekrar Modu',
          description: `Tekrar modu: ${modAdı}`,
          color: 0x9B59B6
        });
        break;

      case 'çalıyor':
      case 'np':
        const şuankiKuyruk = distube.getQueue(message);
        if (!şuankiKuyruk) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Şu anda çalan bir şarkı yok!',
            color: 0xFF0000
          });
        }

        const şarkı = şuankiKuyruk.songs[0];
        const ilerlemeÇubuğu = ilerlemeOluştur(şuankiKuyruk.currentTime, şarkı.duration);

        const çalıyorEmbed = new EmbedBuilder()
          .setTitle('🎵 Şu Anda Çalıyor')
          .setDescription(`[${şarkı.name}](${şarkı.url})`)
          .addFields(
            {
              name: 'Süre',
              value: `${şuankiKuyruk.formattedCurrentTime} / ${şarkı.formattedDuration}`,
              inline: true
            },
            {
              name: 'İsteyen',
              value: şarkı.user?.toString() || 'Bilinmiyor',
              inline: true
            },
            {
              name: 'İlerleme',
              value: ilerlemeÇubuğu,
              inline: false
            }
          )
          .setColor(0x1ABC9C);

        if (şarkı.thumbnail) {
          çalıyorEmbed.setThumbnail(şarkı.thumbnail);
        }

        message.channel.send({ embeds: [çalıyorEmbed] });
        break;

      case 'ara':
        if (!args[0]) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Lütfen aramak istediğiniz şarkı adını girin!',
            color: 0xFF0000
          });
        }

        const aramaSonuçları = await ytSearch(args.join(' '));
        const videolar = aramaSonuçları.videos.slice(0, 5);

        if (videolar.length === 0) {
          return mesajGönder(message, {
            title: '❌ Sonuç Bulunamadı',
            description: 'Aradığınız şarkı bulunamadı. Lütfen farklı bir arama terimi deneyin.',
            color: 0xFF0000
          });
        }

        const düğmeler = new ActionRowBuilder();
        videolar.forEach((video, i) => {
          düğmeler.addComponents(
            new ButtonBuilder()
              .setCustomId(`şarkı_${i}`)
              .setLabel(`${i + 1}. ${video.title.slice(0, 50)}...`)
              .setStyle(ButtonStyle.Primary)
          );
        });

        const aramaEmbed = new EmbedBuilder()
          .setTitle('🔍 Arama Sonuçları')
          .setDescription(videolar.map((video, i) => `${i + 1}. [${video.title}](${video.url}) - \`${video.duration}\``).join('\n'))
          .setColor(0xF39C12);

        const aramaMesajı = await message.channel.send({
          embeds: [aramaEmbed],
          components: [düğmeler]
        });

        const filtre = (interaction) => interaction.user.id === message.author.id;
        const toplayıcı = aramaMesajı.createMessageComponentCollector({ filtre, time: 15000, max: 1 });

        toplayıcı.on('collect', async (interaction) => {
          const index = parseInt(interaction.customId.split('_')[1]);
          const seçilenVideo = videolar[index];
          
          await interaction.reply({
            embeds: [new EmbedBuilder()
              .setDescription(`🎶 **${seçilenVideo.title}** şarkısı kuyruğa eklendi!`)
              .setColor(0x2ECC71)
            ]
          });
          
          await distube.play(sesKanalı, seçilenVideo.url, {
            member: message.member,
            textChannel: message.channel
          });
        });

        toplayıcı.on('end', (toplanan) => {
          if (toplanan.size === 0) {
            aramaMesajı.edit({
              components: [],
              embeds: [new EmbedBuilder()
                .setDescription('⏱️ Şarkı seçme süresi doldu.')
                .setColor(0x95A5A6)
              ]
            });
          }
        });
        break;

      case 'ileri':
        const ileriKuyruk = distube.getQueue(message);
        if (!ileriKuyruk) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Şu anda çalan bir şarkı yok!',
            color: 0xFF0000
          });
        }

        const saniye = parseInt(args[0]);
        if (isNaN(saniye)) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Lütfen geçerli bir saniye değeri girin!',
            color: 0xFF0000
          });
        }

        const yeniPozisyon = ileriKuyruk.currentTime + saniye;
        if (yeniPozisyon < 0 || yeniPozisyon > ileriKuyruk.songs[0].duration) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Belirtilen süre şarkı süresinin dışında!',
            color: 0xFF0000
          });
        }

        await ileriKuyruk.seek(yeniPozisyon);
        mesajGönder(message, {
          title: '⏩ Şarkı İleri Sarıldı',
          description: `Şarkı ${saniye} saniye ileri sarıldı. Şu anki pozisyon: ${ileriKuyruk.formattedCurrentTime}`,
          color: 0x3498DB
        });
        break;

      case 'geri':
        const geriKuyruk = distube.getQueue(message);
        if (!geriKuyruk) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Şu anda çalan bir şarkı yok!',
            color: 0xFF0000
          });
        }

        const geriSaniye = parseInt(args[0]);
        if (isNaN(geriSaniye)) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Lütfen geçerli bir saniye değeri girin!',
            color: 0xFF0000
          });
        }

        const geriPozisyon = geriKuyruk.currentTime - geriSaniye;
        if (geriPozisyon < 0 || geriPozisyon > geriKuyruk.songs[0].duration) {
          return mesajGönder(message, {
            title: '❌ Hata',
            description: 'Belirtilen süre şarkı süresinin dışında!',
            color: 0xFF0000
          });
        }

        await geriKuyruk.seek(geriPozisyon);
        mesajGönder(message, {
          title: '⏪ Şarkı Geri Sarıldı',
          description: `Şarkı ${geriSaniye} saniye geri sarıldı. Şu anki pozisyon: ${geriKuyruk.formattedCurrentTime}`,
          color: 0x3498DB
        });
        break;
    }
  } catch (hata) {
    console.error(hata);
    mesajGönder(message, {
      title: '❌ Hata Oluştu',
      description: `Bir hata oluştu: ${hata.message.slice(0, 2000)}`,
      color: 0xFF0000
    });
  }
});

// DisTube eventleri
distube
  .on('playSong', (kuyruk, şarkı) => {
    const embed = new EmbedBuilder()
      .setTitle('🎵 Şimdi Çalıyor')
      .setDescription(`[${şarkı.name}](${şarkı.url})`)
      .addFields(
        { name: 'Süre', value: şarkı.formattedDuration, inline: true },
        { name: 'İsteyen', value: şarkı.user?.toString() || 'Bilinmiyor', inline: true }
      )
      .setColor(0x2ECC71);

    if (şarkı.thumbnail) {
      embed.setThumbnail(şarkı.thumbnail);
    }

    kuyruk.textChannel.send({ embeds: [embed] });
  })
  .on('addSong', (kuyruk, şarkı) => {
    kuyruk.textChannel.send({
      embeds: [new EmbedBuilder()
        .setDescription(`✅ [${şarkı.name}](${şarkı.url}) kuyruğa eklendi!`)
        .setColor(0x2ECC71)
      ]
    });
  })
  .on('addList', (kuyruk, playlist) => {
    kuyruk.textChannel.send({
      embeds: [new EmbedBuilder()
        .setDescription(`✅ ${playlist.name} playlistinden ${playlist.songs.length} şarkı kuyruğa eklendi!`)
        .setColor(0x2ECC71)
      ]
    });
  })
  .on('error', (kanal, hata) => {
    console.error(hata);
    kanal.send({
      embeds: [new EmbedBuilder()
        .setTitle('❌ Müzik Hatası')
        .setDescription(`Bir hata oluştu: ${hata.message.slice(0, 2000)}`)
        .setColor(0xFF0000)
      ]
    });
  })
  .on('empty', (kanal) => {
    kanal.send({
      embeds: [new EmbedBuilder()
        .setDescription('🔇 Ses kanalı boş kaldığı için ayrılıyorum...')
        .setColor(0x95A5A6)
      ]
    });
  })
  .on('searchNoResult', (mesaj, sorgu) => {
    mesaj.channel.send({
      embeds: [new EmbedBuilder()
        .setDescription(`❌ "${sorgu}" için sonuç bulunamadı!`)
        .setColor(0xFF0000)
      ]
    });
  })
  .on('finish', (kuyruk) => {
    kuyruk.textChannel.send({
      embeds: [new EmbedBuilder()
        .setDescription('✅ Tüm şarkılar çalındı, kanaldan ayrılıyorum!')
        .setColor(0x95A5A6)
      ]
    });
  });

// Yardımcı fonksiyonlar
function mesajGönder(message, { title, description, color }) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color || 0x3498DB);

  return message.channel.send({ embeds: [embed] });
}

function ilerlemeOluştur(şuanki, toplam, boyut = 15) {
  if (toplam <= 0) return '▬'.repeat(boyut);
  
  const ilerleme = Math.min(şuanki / toplam, 1);
  const ilerlemeÇubuğu = '▬'.repeat(boyut).split('');
  const işaretPozisyonu = Math.floor(ilerleme * boyut);
  
  if (işaretPozisyonu >= 0 && işaretPozisyonu < boyut) {
    ilerlemeÇubuğu[işaretPozisyonu] = '🔘';
  }
  
  return ilerlemeÇubuğu.join('');
}
    

//video izleme

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'izle') {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('🎙️ Önce bir ses kanalına katılmalısın.');

    try {
      // Bot ses kanalına bağlanır
      joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      // YouTube Together uygulama ID'si (Discord tarafından belirlenmiş)
      const youtubeTogetherAppId = '880218394199220334';

      // YouTube Together için özel invite oluştur
      const invite = await voiceChannel.createInvite({
        maxAge: 3600,          // 1 saat geçerli
        maxUses: 0,            // sınırsız kullanım
        targetApplication: youtubeTogetherAppId,
        targetType: 2,         // Etkinlik tipi
        reason: 'YouTube Together başlatıldı',
      });

      // Sadece YouTube Together linkini gönderir
      message.channel.send(`📺 YouTube Together başlatıldı! Katılmak için Görüntüleye Ardından 'Launch'a Basın: ${invite.url}`);
      allowedMentions: { parse: [] }
    } catch (error) {
      console.error(error);
      message.reply('<a:karbotyanls:1380579775235489812> YouTube Together başlatılırken hata oluştu.');
    }
  }
});

//OwO sistem
// MongoDB Bağlantısı

const owners = ['854427646598840361'];

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB bağlantısı başarılı!'))
.catch(console.error);

// User Şeması ve Model
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  karcoin: { type: Number, default: 0 },
  kredi: { type: Number, default: 0 },
  debts: [{
    lenderId: String,
    amount: Number
  }],
  credit: [{
    amount: { type: Number, default: 0 },
    lastTaken: { type: Date, default: null },
  }]
});
const User = mongoose.model('User', userSchema);

// Bot hazır olduğunda

// Mesaj dinleyici
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase().trim();

  // Bakiye komutu (f!bakiye ve f!param)
  if (content === 'f!bakiye' || content === 'f!param') {
    let user = await User.findOne({ userId: message.author.id });
    if (!user) {
      user = new User({ userId: message.author.id, karcoin: 0 });
      await user.save();
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ffff)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTitle('KarCoin Bakiyen')
      .setDescription(`💰 **${user.karcoin.toLocaleString()} KarCoin**`)
      .setFooter({ text: 'KarCoin Ekonomi Sistemi' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // Bahis komutu: f!bahis miktar / f!bahis all
  if (content.startsWith('f!bahis')) {
    const args = content.split(' ');
    const userId = message.author.id;

    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, karcoin: 0 });
      await user.save();
    }

    const amountArg = args[1];
    if (!amountArg) {
      return message.reply('❗ Ne kadar KarCoin ile bahis yapmak istediğini yazmalısın. Örnek: `f!bahis 100` veya `f!bahis all`');
    }

    let betAmount;
    if (amountArg === 'all') {
      betAmount = user.karcoin;
    } else {
      betAmount = parseInt(amountArg);
      if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply('❗ Geçerli bir miktar yazmalısın. Örnek: `f!bahis 100`');
      }
    }

    if (user.karcoin < betAmount) {
      return message.reply('💸 Yetersiz KarCoin! Bu kadar paran yok.');
    }

    const kazandiMi = Math.random() < 0.5;

    if (kazandiMi) {
      user.karcoin += betAmount;
    } else {
      user.karcoin -= betAmount;
    }

    await user.save();

    const embed = new EmbedBuilder()
      .setColor(kazandiMi ? 0x00ff00 : 0xff0000)
      .setAuthor({ name: `${message.author.username} Bahis Sonucu`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription(
        kazandiMi
          ? `🎉 Tebrikler! **${betAmount.toLocaleString()}** KarCoin kazandın!\nYeni bakiyen: **${user.karcoin.toLocaleString()} KarCoin**`
          : `😢 Kaybettin! **${betAmount.toLocaleString()}** KarCoin gitti.\nYeni bakiyen: **${user.karcoin.toLocaleString()} KarCoin**`
      )
      .setFooter({ text: 'KarCoin Bahis Sistemi' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
});

//gönder

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith('f!gönder')) return;

  const args = message.content.trim().split(/ +/);
  // Örnek: f!gönder @kişi 100

  if (args.length < 3) return message.reply('Kullanım: f!gönder @kişi miktar');

  const mentioned = message.mentions.users.first();
  if (!mentioned) return message.reply('Lütfen bir kullanıcı etiketleyin.');

  if (mentioned.id === message.author.id) return message.reply('Kendine para gönderemezsin.');

  const amount = parseInt(args[2]);
  if (isNaN(amount) || amount <= 0) return message.reply('Geçerli bir miktar giriniz.');

  // Gönderen kullanıcı verisi
  let sender = await User.findOne({ userId: message.author.id });
  if (!sender) {
    sender = new User({ userId: message.author.id, karcoin: 0 });
    await sender.save();
  }

  if (sender.karcoin < amount) return message.reply('Yeterli paranız yok.');

  // Alıcı kullanıcı verisi
  let receiver = await User.findOne({ userId: mentioned.id });
  if (!receiver) {
    receiver = new User({ userId: mentioned.id, karcoin: 0 });
    await receiver.save();
  }

  // İşlem
  sender.karcoin -= amount;
  receiver.karcoin += amount;

  await sender.save();
  await receiver.save();

  message.channel.send(`${message.author} ${mentioned} kullanıcısına ${amount} karcoin gönderdi!`);
});

//ver sahp

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Komut prefix'i ve bölümü
  if (!message.content.toLowerCase().startsWith('f!ver')) return;

  if (!owners.includes(message.author.id)) {
    return message.reply({ content: '❌ Bu komutu kullanmaya yetkiniz yok!', ephemeral: true });
  }

  const args = message.content.trim().split(/ +/);
  // f!ver @kişi miktar

  if (args.length < 3) {
    return message.reply('Kullanım: f!ver @kullanıcı miktar');
  }

  const mentionedUser = message.mentions.users.first();
  if (!mentionedUser) {
    return message.reply('Lütfen geçerli bir kullanıcı etiketleyin.');
  }

  const amount = parseInt(args[2]);
  if (isNaN(amount) || amount <= 0) {
    return message.reply('Lütfen geçerli bir miktar girin.');
  }

  // Kullanıcı verisini çek / oluştur
  let user = await User.findOne({ userId: mentionedUser.id });
  if (!user) {
    user = new User({ userId: mentionedUser.id, karcoin: 0 });
  }

  user.karcoin += amount;
  await user.save();

  // Güzel embed gönder
  const embed = new EmbedBuilder()
    .setColor('Green')
    .setTitle('💰 Karcoin Verildi!')
    .setDescription(`${mentionedUser} kullanıcısına **${amount}** karcoin başarıyla verildi.`)
    .setFooter({ text: `İşlemi yapan: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
});

//günlük

const dailyCooldowns = new Map(); // Kullanıcı ID'si -> Son kullanım zamanı

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.toLowerCase().startsWith('f!günlük')) return;

  const userId = message.author.id;
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  if (dailyCooldowns.has(userId)) {
    const lastUsed = dailyCooldowns.get(userId);
    const timePassed = now - lastUsed;

    if (timePassed < cooldown) {
      const remaining = cooldown - timePassed;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      return message.reply(`⏳ Günlük ödül için ${hours} saat ${minutes} dakika ${seconds} saniye beklemelisin.`);
    }
  }

  // Ödülü ver
  dailyCooldowns.set(userId, now);

  const embed = new EmbedBuilder()
    .setColor('Green')
    .setTitle('🎁 Günlük Ödül')
    .setDescription(`+100 karcoin aldın!`)
    .setFooter({ text: 'Yarın tekrar gelmeyi unutma!' })
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
});


//yardım menü

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 📌 ANA YARDIM MENÜSÜ (f!yardım)
    if (command === 'yardım') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📚 Bot Komutları')
            .setDescription(`**Kullanım:** \`${prefix}yardım [kategori]\`\n**Örnek:** \`${prefix}moderasyon\``)
            .addFields(
                { name: '🔨 **Moderasyon**', value: '`f!moderasyon`', inline: true },
                { name: '💰 **Ekonomi**', value: '`f!ekonomi`', inline: true },
                { name: '🤖 **Yapay Zeka**', value: '`f!yapayzeka`', inline: true },
                { name: '🎵 **Müzik**', value: '`f!müzik`', inline: true },
                { name: '🎉 **Eğlence**', value: '`f!eğlence`', inline: true },
                { name: '⚙️ **Ayarlama**', value: '`f!ayarlama`', inline: true }
            )
            .setFooter({ text: `${message.guild.name} • Toplam 6 kategori` });

        message.channel.send({ embeds: [helpEmbed] });
    }

    // 🔨 MODERASYON KOMUTLARI (f!moderasyon)
    else if (command === 'moderasyon') {
        const modEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🔨 Moderasyon Komutları')
            .setDescription('Sunucu yönetimi için komutlar:')
            .addFields(
                { name: '`f!kilit`', value: 'Kanalı kilitler.', inline: true },
                { name: '`f!kilitaç`', value: 'Kilitlenen kanalı açar.', inline: true },
                { name: '`f!sil [miktar]`', value: 'Belirtilen kadar mesaj siler.', inline: true },
                { name: '`f!ban [@kişi] [sebep]`', value: 'Bir kişiyi banlar.', inline: true },
                { name: '`f!unban [id] [sebep]`', value: 'Banı kaldırır.', inline: true },
                { name: '`f!kick [@kişi] [sebep]`', value: 'kişiyi sunucudan atar.', inline: true },
                { name: '`f!rolver [@kişi] [@rol]`', value: 'Kişiye rol verir.', inline: true },
                { name: '`f!rolekle [rolismi] [renk]`', value: 'Yeni rol oluşturur.', inline: true },
                { name: '`f!rolsil [@rol]`', value: 'Rolü siler.', inline: true },
                { name: '`f!mute [@kişi] (süre) [sebep]`', value: 'Kişiyi muteler.', inline: true },
                { name: '`f!unmute [@kişi] [sebep]`', value: 'Mute\'yi kaldırır.', inline: true },
                { name: '`f!oylama [mesaj]`', value: 'Oylama başlatır.', inline: true },
                { name: '`f!yavaşmod [saniye]`', value: 'Yavaşmod açar.', inline: true },
                { name: '`f!yavaşmod-kapa`', value: 'Yavaş modu kapatır.', inline: true },
                { name: '`f!sesli`', value: 'Sesli komutlar.', inline: true },
                { name: '`f!sunucupanel`', value: 'Sunucu panel kurar/siler.', inline: true },
                { name: '`f!otocevap [yazı] [cevap]`', value: 'Yazıya otomatik cevap verir.', inline: true },
                { name: '`f!afk [sebep]`', value: 'AFK moduna geçer.', inline: true }
            )
            .setFooter({ text: `${message.guild.name} • Toplam 17 komut` });

        message.channel.send({ embeds: [modEmbed] });
    }

    // 💰 EKONOMİ KOMUTLARI (f!ekonomi)
    else if (command === 'ekonomi') {
        const ecoEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('💰 Ekonomi Komutları')
            .setDescription('Para sistemi ve alışveriş komutları:')
            .addFields(
                { name: '`f!bakiyem`', value: 'Bakiyeni gösterir.', inline: true },
                { name: '`f!gonder [@kullanıcı] [miktar]`', value: 'Para gönderir.', inline: true },
                { name: '`f!bahis [miktar]`', value: 'Bahis oynar.', inline: true },
                { name: '`f!günlük`', value: 'Günlük ödül alırsın.', inline: true },
                { name: '`f!liderlik`', value: 'Liderlik tablosunu gösterir.', inline: true },
                { name: '`f!kredi`', value: 'Kredi durumunu gösterir.', inline: true },
                { name: '`f!kredi çek [miktar]`', value: 'Kredi çeker.', inline: true },
                { name: '`f!kredi öde [miktar]`', value: 'Krediyi öder.', inline: true }
            )
            .setFooter({ text: `${message.guild.name} • Toplam 8 komut` });

        message.channel.send({ embeds: [ecoEmbed] });
    }

    // 🤖 YAPAY ZEKA KOMUTLARI (f!yapayzeka)
    else if (command === 'yapayzeka') {
        const aiEmbed = new EmbedBuilder()
            .setColor('#EB459E')
            .setTitle('🤖 Yapay Zeka Komutları')
            .setDescription('AI tabanlı araçlar:')
            .addFields(
                { name: '`f!site`', value: 'karBOT ile sohbet et!', inline: true },
                { name: '`f!resim`', value: 'AI ile resim oluşturur.', inline: true }
            )
            .setFooter({ text: `${message.guild.name} • Toplam 2 komut` });

        message.channel.send({ embeds: [aiEmbed] });
    }

    // 🎵 MÜZİK KOMUTLARI (f!müzik)
    else if (command === 'müzik') {
        const musicEmbed = new EmbedBuilder()
            .setColor('#1ABC9C')
            .setTitle('🎵 Müzik Komutları')
            .setDescription('Sesli sohbet müzik komutları:')
            .addFields(
                { name: '`f!çal <şarkı/url>`', value: 'Şarkı çalar.', inline: true },
                { name: '`f!dur`', value: 'Müziği durdurur.', inline: true },
                { name: '`f!geç`', value: 'Şu anki şarkıyı geçer.', inline: true },
                { name: '`f!duraklat`', value: 'Müziği duraklatır.', inline: true },
                { name: '`f!devam`', value: 'Duraklatılmış müziği devam ettirir.', inline: true },
                { name: '`f!ses <0-150>`', value: 'Ses seviyesini ayarlar.', inline: true },
                { name: '`f!kuyruk`', value: 'Şarkı kuyruğunu gösterir.', inline: true },
                { name: '`f!döngü`', value: 'Tekrar modunu değiştirir.', inline: true },
                { name: '`f!çalıyor`', value: 'Şu an çalan şarkıyı gösterir.', inline: true },
                { name: '`f!ara <şarkı>`', value: 'Şarkı arar ve seçim sunar.', inline: true },
                { name: '`f!ileri <saniye>`', value: 'Şarkıyı ileri sarar.', inline: true },
                { name: '`f!geri <saniye>`', value: 'Şarkıyı geri sarar.', inline: true }
            )
            .setFooter({ text: `${message.guild.name} • Toplam 12 komut` });

        message.channel.send({ embeds: [musicEmbed] });
    }

    // 🎉 EĞLENCE KOMUTLARI (f!eğlence)
    else if (command === 'eğlence') {
        const funEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('🎉 Eğlence Komutları')
            .setDescription('Eğlenceli komutlar:')
            .addFields(
                { name: '`f!wasted [@kişi]`', value: 'GTA ölüm ekranı efekti.', inline: true },
                { name: '`f!sarıl [@kişi]`', value: 'Etiketlediğiniz kişiye sarılır.', inline: true },
                { name: '`f!aranıyor [@kişi]`', value: 'Kaybolmuş ilanı efekti.', inline: true },
                { name: '`f!slot`', value: 'Slot makinesi oynatır.', inline: true },
                { name: '`f!kelime`', value: 'Kelime bulmaca oyunu.', inline: true },
                { name: '`f!sahteetiket`', value: 'Sahte etiket efekti.', inline: true },
                { name: '`f!aşkölçer [@kişi]`', value: 'Aşk yüzdesi ölçer.', inline: true },
                { name: '`f!kaçcm`', value: 'Rastgele boyut söyler.', inline: true },
                { name: '`f!mesajdöndür [mesaj]`', value: 'Mesajı ters çevirir.', inline: true },
                { name: '`f!1vs1 [@kişi]`', value: 'Düello başlatır.', inline: true },
                { name: '`f!1vs1 sıralama`', value: 'Global sıralamayı gösterir.', inline: true },
                { name: '`f!hapishane [@kişi]`', value: 'hapishane efekti verir.', inline: true },
                { name: '`f!adamasmaca`', value: 'Adam asmaca oyunu.', inline: true },
                { name: '`f!kelimeyarışı [@kişi]`', value: 'Kelime yarışması.', inline: true }
            )
            .setFooter({ text: `${message.guild.name} • Toplam 14 komut` });

        message.channel.send({ embeds: [funEmbed] });
    }

    // ⚙️ AYARLAMA KOMUTLARI (f!ayarlama)
    else if (command === 'ayarlama') {
        const settingsEmbed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('⚙️ Ayarlama Komutları')
            .setDescription('Bot ve sunucu ayarları:')
            .addFields(
                { name: '`f!küfürengel`', value: 'Küfür engelini açar/kapatır.', inline: true },
                { name: '`f!linkengel`', value: 'Link engelini açar/kapatır.', inline: true },
                { name: '`f!log [#kanal]`', value: 'Log kanalını ayarlar.', inline: true },
                { name: '`f!ototag`', value: 'tag komutlarını gösterir.', inline: true },
                { name: '`f!ototag ayarla [tag]`', value: 'tag ayarlar.', inline: true },
                { name: '`f!ototag kapat`', value: 'tag kapatır.', inline: true }
            )
            .setFooter({ text: `${message.guild.name} • Toplam 6 komut` });

        message.channel.send({ embeds: [settingsEmbed] });
    }
});


client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'dm') {
    const userId = args.shift();
    const dmMessage = args.join(' ');
    if (!userId) return message.reply("Lütfen kullanıcı ID'si gir.");
    if (!dmMessage) return message.reply("Lütfen gönderilecek mesajı yaz.");

    try {
      const user = await client.users.fetch(userId);
      if (!user) return message.reply("Kullanıcı bulunamadı.");

      await user.send(dmMessage);
      message.reply(`Mesaj başarıyla <@${userId}> kullanıcısına gönderildi.`);
    } catch (error) {
      console.error(error);
      message.reply("Mesaj gönderilemedi. Kullanıcının DM'leri kapalı olabilir veya ID yanlış olabilir.");
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'kilit') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply('🚫 Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısın.');
    }

    const channel = message.channel;

    const everyoneRole = message.guild.roles.everyone;
    const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);

    if (currentPerms?.deny.has(PermissionsBitField.Flags.SendMessages)) {
      return message.reply('❌ Bu kanal zaten kilitli.');
    }

    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: false
    });

    message.reply('🔒 Kanal başarıyla **kilitlendi**.');
  }

  if (command === 'kilitaç') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply('🚫 Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısın.');
    }

    const channel = message.channel;

    const everyoneRole = message.guild.roles.everyone;
    const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);

    if (!currentPerms?.deny.has(PermissionsBitField.Flags.SendMessages)) {
      return message.reply('❌ Bu kanal zaten açık.');
    }

    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: null
    });

    message.reply('🔓 Kanalın kilidi **kaldırıldı**.');
  }
});
//ban
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

if (command === 'sil') {
  if (args[0] === 'all') {
    // Onay butonları oluştur
    const row = new Discord.ActionRowBuilder()
      .addComponents(
        new Discord.ButtonBuilder()
          .setCustomId('confirm_delete_all')
          .setLabel('✅ Kabul Et')
          .setStyle(Discord.ButtonStyle.Success),
        new Discord.ButtonBuilder()
          .setCustomId('cancel_delete_all')
          .setLabel('❌ Reddet')
          .setStyle(Discord.ButtonStyle.Danger)
      );

    // Uyarı mesajını gönder
    const warningMsg = await message.reply({
      content: '⚠ **Tüm mesajları silmek üzeresiniz!**\nBu işlem geri alınamaz. Devam etmek istiyor musunuz?',
      components: [row]
    });

    // Buton etkileşimi için filtre
    const filter = i => i.user.id === message.author.id;
    const collector = warningMsg.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async i => {
      if (i.customId === 'confirm_delete_all') {
        await i.deferUpdate();
        try {
          let fetched;
          let totalDeleted = 0;
          do {
            fetched = await message.channel.messages.fetch({ limit: 100 });
            if (fetched.size > 0) {
              await message.channel.bulkDelete(fetched.size > 99 ? 100 : fetched.size, true);
              totalDeleted += fetched.size;
            }
          } while (fetched.size >= 999);
          
          const infoMsg = await message.channel.send(`<a:karbotonay:1380578520094343280> Toplam ${totalDeleted} mesaj başarıyla silindi.`);
          setTimeout(() => {
            infoMsg.delete().catch(() => {});
          }, 5000);
        } catch (err) {
          console.error(err);
          message.reply("<a:karbotyanls:1380579775235489812> Mesajlar silinirken bir hata oluştu.");
        }
      } else if (i.customId === 'cancel_delete_all') {
        await i.update({ content: '❌ İşlem iptal edildi.', components: [] });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        warningMsg.edit({ content: '⏳ Zaman aşımı nedeniyle işlem iptal edildi.', components: [] }).catch(() => {});
      }
    });
    return;
  }

  const miktar = parseInt(args[0]);

  if (isNaN(miktar) || miktar < 1 || miktar > 100) {
    return message.reply("<a:karbotyanls:1380579775235489812> Lütfen 1 ile 100 arasında bir sayı girin veya 'all' yazın.");
  }

  try {
    const fetched = await message.channel.messages.fetch({ limit: miktar + 1 });
    const deleteCount = Math.min(fetched.size, miktar + 1);
    
    await message.channel.bulkDelete(deleteCount, true);

    const infoMsg = await message.channel.send(`<a:karbotonay:1380578520094343280> ${deleteCount - 1} mesaj silindi.`);
    setTimeout(() => {
      infoMsg.delete().catch(() => {});
    }, 5000);
  } catch (err) {
    console.error(err);
    message.reply("<a:karbotyanls:1380579775235489812> Mesajlar silinirken bir hata oluştu.");
  }
}
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

if (command === 'ban') {
    const member = message.mentions.members.first();
    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";

    if (!message.member.permissions.has('BanMembers'))
        return message.reply("<a:karbotyanls:1380579775235489812> Ban yetkin yok!");

    if (!member)
        return message.reply("<a:karbotyanls:1380579775235489812> Banlanacak kişiyi etiketle!");

    if (!member.bannable)
        return message.reply("<a:karbotyanls:1380579775235489812> Bu kişiyi banlayamam!");

    try {
        await member.ban({ reason });
        message.channel.send({
            content: `<a:karbotonay:1380578520094343280> **Banlandı:** ${member.user.tag}\n🆔 **ID:** ${member.id}\n📄 **Sebep:** ${reason}`
        });
    } catch (error) {
        console.error(error);
        message.reply("<a:karbotyanls:1380579775235489812> Bir hata oluştu, ban atılamadı.");
    }
}
    // f!unban komutu
    if (command === 'unban') {
        if (!message.member.permissions.has('BanMembers'))
            return message.reply("<a:karbotyanls:1380579775235489812> Unban yetkin yok!");

        const userId = args[0];
        const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";

        if (!userId)
            return message.reply("<a:karbotyanls:1380579775235489812> Lütfen unban yapılacak kullanıcının ID'sini gir!");

        try {
            await message.guild.members.unban(userId, reason);
            message.channel.send(`<a:karbotonay:1380578520094343280><@${userId}> adlı kullanıcı unbanlandı. Sebep: ${reason}`);
        } catch (error) {
            console.error(error);
            message.reply("<a:karbotyanls:1380579775235489812> Bu kullanıcı banlı değil ya da ID yanlış.");
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'rolver') {
        if (!message.member.permissions.has('ManageRoles')) {
            return message.reply('<a:karbotyanls:1380579775235489812> Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısın.');
        }

        const user = message.mentions.members.first();
        const role = message.mentions.roles.first();

        if (!user || !role) {
            return message.reply('<a:karbotyanls:1380579775235489812> Doğru kullanım: `f!rolver @kullanıcı @rol`');
        }

        if (!message.guild.members.me.permissions.has('ManageRoles')) {
            return message.reply('<a:karbotyanls:1380579775235489812> Rolleri yönetme iznim yok.');
        }

        try {
            await user.roles.add(role);
            message.reply(`<a:karbotonay:1380578520094343280> ${user} kullanıcısına ${role} rolü verildi.`);
        } catch (error) {
            console.error(error);
            message.reply('<a:karbotyanls:1380579775235489812> Bir hata oluştu. Rol verilemedi.');
        }
    }
});

const renkler = {
  kırmızı: 0xFF0000,
  yeşil: 0x00FF00,
  mavi: 0x0000FF,
  turuncu: 0xFFA500,
  sarı: 0xFFFF00,
  mor: 0x800080,
  pembe: 0xFFC0CB,
  siyah: 0x000000,
  beyaz: 0xFFFFFF,
  gri: 0x808080,
  lacivert: 0x000080
};

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'rolekle') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply('<a:karbotyanls:1380579775235489812> Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısın.');
    }

    const rolIsmi = args[0];
    const renkIsmi = args[1]?.toLowerCase();

    if (!rolIsmi || !renkIsmi) {
      return message.reply('<a:karbotyanls:1380579775235489812> Lütfen rol ismi ve renk ismi gir. Örnek: `f!rolekle Üye kırmızı`');
    }

    const renkKodu = renkler[renkIsmi];
    if (!renkKodu) {
      return message.reply('<a:karbotyanls:1380579775235489812> Geçersiz renk ismi! Kullanılabilir renkler: ' + Object.keys(renkler).join(', '));
    }

    try {
      const yeniRol = await message.guild.roles.create({
        name: rolIsmi,
        color: renkKodu,
        reason: `<a:karbotonay:1380578520094343280> ${message.author.tag} tarafından yeni rol oluşturuldu.`
      });

      message.channel.send(`<a:karbotonay:1380578520094343280> Başarıyla yeni rol oluşturuldu: ${yeniRol}`);
    } catch (error) {
      console.error(error);
      message.reply('<a:karbotyanls:1380579775235489812> Rol oluşturulurken bir hata oluştu.');
    }
  } else if (command === 'rolsil') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply('<a:karbotyanls:1380579775235489812> Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısın.');
    }

    const rolMention = message.mentions.roles.first();
    let rol;

    if (rolMention) {
      rol = rolMention;
    } else if (args[0]) {
      rol = message.guild.roles.cache.find(r => r.name === args[0]);
    }

    if (!rol) {
      return message.reply('<a:karbotyanls:1380579775235489812> Lütfen silinecek rolü etiketle veya tam adını yaz.');
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply('<a:karbotyanls:1380579775235489812> Rolü silmek için yeterli yetkim yok.');
    }

    try {
      await rol.delete(`Rol ${message.author.tag} tarafından silindi.`);
      message.channel.send(`<a:karbotonay:1380578520094343280> Başarıyla rol silindi: ${rol.name}`);
    } catch (error) {
      console.error(error);
      message.reply('<a:karbotyanls:1380579775235489812> Rol silinirken bir hata oluştu.');
    }
  }
});

//mute

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB bağlantısı kuruldu!'))
  .catch(err => console.error('❌ MongoDB bağlantı hatası:', err));

const muteSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  endTime: Date,
});

const Mute = mongoose.model('Mute', muteSchema);


client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift()?.toLowerCase();

  if (
    !message.member.permissions.has('Administrator') &&
    (command === 'mute' || command === 'unmute')
  ) return message.reply('❌ Bu komutu kullanmak için "Yönetici" yetkisine sahip olmalısın.');

  if (command === 'mute') {
    const member = message.mentions.members.first();
    let sure = args[1];
    const sebep = args.slice(2).join(' ') || 'Belirtilmedi';

    if (!member || !sure)
      return message.reply('❌ Doğru kullanım: `f!mute @kişi 10dakika sebep`');

    // Türkçe birimleri çevir
sure = sure.replace(/milisaniye/gi, 'ms')
           .replace(/saniye/gi, 's')
           .replace(/dakika/gi, 'm')
           .replace(/saat/gi, 'h')
           .replace(/gün/gi, 'd');
               

    const sureMs = ms(sure);
    if (!sureMs)
      return message.reply('❌ Geçerli bir süre belirtmelisin (örnek: `10dakika`, `1saat`).');

    // Muted rolünü kontrol et
    let mutedRole = message.guild.roles.cache.find(r => r.name === 'muted');
    if (!mutedRole) {
      try {
        mutedRole = await message.guild.roles.create({
          name: 'muted',
          color: 0x555555,
          permissions: [],
        });

        for (const [_, channel] of message.guild.channels.cache) {
          await channel.permissionOverwrites.create(mutedRole, {
            SendMessages: false,
            AddReactions: false,
            Speak: false,
          });
        }
      } catch (err) {
        console.error(err);
        return message.reply('❌ Muted rolü oluşturulamadı.');
      }
    }

    await member.roles.add(mutedRole);

    const endTime = new Date(Date.now() + sureMs);

    await Mute.findOneAndUpdate(
      { guildId: message.guild.id, userId: member.id },
      { endTime },
      { upsert: true }
    );

    message.channel.send(`✅ ${member} kullanıcısı **${args[1]}** süreyle susturuldu. Sebep: **${sebep}**`);
  }

  if (command === 'unmute') {
    const member = message.mentions.members.first();
    const sebep = args.slice(1).join(' ') || 'Belirtilmedi';

    if (!member) return message.reply('❌ Doğru kullanım: `f!unmute @kişi sebep`');

    const mutedRole = message.guild.roles.cache.find(r => r.name === 'muted');
    if (!mutedRole || !member.roles.cache.has(mutedRole.id))
      return message.reply('❌ Bu kullanıcı susturulmamış.');

    await member.roles.remove(mutedRole);
    await Mute.findOneAndDelete({ guildId: message.guild.id, userId: member.id });

    message.channel.send(`🔈 ${member} kullanıcısının susturulması kaldırıldı. Sebep: **${sebep}**`);
  }
});

client.on('ready', async () => {
  console.log(`🤖 Bot aktif: ${client.user.tag}`);

  setInterval(async () => {
    const now = new Date();
    const expiredMutes = await Mute.find({ endTime: { $lte: now } });

    for (const mute of expiredMutes) {
      const guild = client.guilds.cache.get(mute.guildId);
      if (!guild) continue;

      const member = await guild.members.fetch(mute.userId).catch(() => null);
      if (!member) continue;

      const mutedRole = guild.roles.cache.find(r => r.name === 'muted');
      if (mutedRole && member.roles.cache.has(mutedRole.id)) {
        await member.roles.remove(mutedRole);
        const logChannel = guild.systemChannel;
        if (logChannel) logChannel.send(`⏱️ ${member} kullanıcısının susturulma süresi doldu.`);
      }

      await Mute.findOneAndDelete({ guildId: mute.guildId, userId: mute.userId });
    }
  }, 10000); // 10 saniyede bir kontrol
});

//oylama

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "oylama") {
        const content = args.join(" ");
        if (!content) {
            return message.reply({
                content: "<a:karbotyanls:1380579775235489812> Oylama içeriğini yazmalısınız. Örnek: `f!oylama En iyi film nedir?`",
                allowedMentions: { repliedUser: false }
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("📊 Oylama")
            .setDescription(`**${content}**`)
            .addFields(
                { name: "\u200B", value: "<a:karbotonay:1380578520094343280> **Evet**\n<a:karbotyanls:1380579775235489812> **Hayır**\n<a:karbotnatural:1380813975826071642> **Kararsızım**" }
            )
            .setColor("#5865F2")
            .setThumbnail(`https://cdn.discordapp.com/icons/${message.guild.id}/${message.guild.icon}.png`)
            .setFooter({ 
                text: `${message.author.tag} tarafından başlatıldı | Sadece 1 oy kullanabilirsiniz`, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();

        try {
            const pollMessage = await message.channel.send({ embeds: [embed] });
            
            const reactions = [
                "<a:karbotonay:1380578520094343280>",
                "<a:karbotyanls:1380579775235489812>",
                "<a:karbotnatural:1380813975826071642>"
            ];
            
            for (const reaction of reactions) {
                await pollMessage.react(reaction);
            }

            // Kullanıcıların tepkilerini takip etmek için bir koleksiyon
            const userVotes = new Set();

            const collector = pollMessage.createReactionCollector({
                filter: (reaction, user) => {
                    // Bot tepkilerini filtrele ve sadece belirtilen emojilere izin ver
                    return !user.bot && 
                           reactions.includes(reaction.emoji.id || reaction.emoji.name);
                },
                dispose: true // Tepki kaldırıldığında da yakala
            });

            collector.on('collect', async (reaction, user) => {
                if (userVotes.has(user.id)) {
                    // Eğer kullanıcı zaten oy kullandıysa tepkisini kaldır
                    await reaction.users.remove(user.id);
                    return;
                }

                // Kullanıcıyı oy kullananlar listesine ekle
                userVotes.add(user.id);
            });

            collector.on('remove', async (reaction, user) => {
                // Eğer kullanıcı tepkisini kaldırırsa, listeden de çıkar
                if (userVotes.has(user.id)) {
                    userVotes.delete(user.id);
                }
            });

            await message.delete().catch(() => {});

        } catch (error) {
            console.error("Oylama gönderilirken hata oluştu:", error);
            message.reply({
                content: "Oylama oluşturulurken bir hata oluştu!",
                allowedMentions: { repliedUser: false }
            });
        }
    }
});

//yavaşmod ve uyarı

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

if (command === '-*-*-*') {
    // Yetki kontrolü (Discord.js v14)
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('Red')
                    .setDescription('❌ **Hata:** Bu komutu kullanabilmek için `Sunucuyu Yönet` yetkisine sahip olmalısınız!')
            ]
        });
    }

    const hedef = message.mentions.users.first();
    const sebep = args.slice(1).join(" ") || "Sebep belirtilmedi";

    if (!hedef) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('Orange')
                    .setDescription('⚠️ **Uyarı:** Lütfen bir kullanıcı etiketleyin!\n**Örnek:** `f!uyarı @kullanıcı uygunsuz dil kullanımı`')
            ]
        });
    }

    // Veritabanı işlemleri
    const uyarıKey = `uyarılar_${message.guild.id}_${hedef.id}`;
    const uyarılar = await client.db.get(uyarıKey) || [];
    
    uyarılar.push({
        yetkili: message.author.tag,
        sebep: sebep,
        tarih: Date.now()
    });

    await client.db.set(uyarıKey, uyarılar);

    // Uyarı embedi
    const uyariMesaji = new EmbedBuilder()
        .setTitle('⚠️ Yeni Uyarı')
        .setColor(0xFFA500)
        .setThumbnail(hedef.displayAvatarURL())
        .addFields(
            { name: '🔹 Kullanıcı', value: `${hedef}`, inline: true },
            { name: '🔹 Toplam Uyarı', value: `${uyarılar.length}`, inline: true },
            { name: '📌 Sebep', value: sebep },
            { name: '👤 Yetkili', value: message.author.toString(), inline: true },
            { name: '⏱️ Tarih', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
        )
        .setFooter({ text: '3 uyarı = otomatik ban' });

    await message.channel.send({ embeds: [uyariMesaji] });

    // 3 uyarı kontrolü
    if (uyarılar.length >= 3) {
        try {
            await message.guild.members.ban(hedef.id, { 
                reason: `3/3 Uyarı: ${sebep} | Banlayan: ${message.author.tag}` 
            });
            
            await client.db.delete(uyarıKey); // Uyarıları temizle
            
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('⛔ Otomatik Ban')
                        .setColor(0xFF0000)
                        .setDescription(`${hedef} **3 uyarı limitini aştığı için banlandı!**`)
                        .addFields(
                            { name: '🔸 Son Sebep', value: sebep },
                            { name: '🔸 Toplam Uyarı', value: '3', inline: true },
                            { name: '🔸 Banlayan', value: message.author.toString(), inline: true }
                        )
                ]
            });
            
        } catch (error) {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setDescription(`❌ **Hata:** ${hedef} banlanamadı (${error.message})`)
                ]
            });
        }
    }
}

  // f!yavaşmod komutu
  else if (command === 'yavaşmod') {
    const süre = parseInt(args[0]);

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply('<a:karbotyanls:1380579775235489812> Bu komutu kullanmak için **Kanalı Yönet** yetkisine sahip olmalısın!');
    }

    if (isNaN(süre) || süre < 0) {
      return message.reply('<a:karbotyanls:1380579775235489812> Lütfen geçerli bir saniye girin! (Örn: `f!yavaşmod 5`)');
    }

    message.channel.setRateLimitPerUser(süre);
    message.channel.send(`<a:karbotonay:1380578520094343280> Bu kanala ${süre} saniyelik yavaş mod uygulandı.`);
  }

  // f!yavaşmod-kapa komutu
  else if (command === 'yavaşmod-kapa') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply('<a:karbotyanls:1380579775235489812> Bu komutu kullanmak için **Kanalı Yönet** yetkisine sahip olmalısın!');
    }

    message.channel.setRateLimitPerUser(0);
    message.channel.send(`<a:karbotonay:1380578520094343280> Yavaş mod kapatıldı.`);
  }
});

//f!sesliye çekme komutu

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'sesli') {
    const altKomut = args.shift();
    const member = message.mentions.members.first();

    if (!altKomut || !member) {
      return message.reply('<a:karbotonay:1380578520094343280> Lütfen doğru kullanın. Örnekler:\n' +
        '`f!sesli at @kullanıcı`\n' +
        '`f!sesli çek @kullanıcı`\n' +
        '`f!sesli git @kullanıcı`');
    }

    // İşlemler için ses kanalları kontrolü
    const authorVoiceChannel = message.member.voice.channel;
    const memberVoiceChannel = member.voice.channel;
    const botVoiceChannel = message.guild.me.voice.channel;

    switch (altKomut) {
      case 'at':
        // Komutu kullananın ses kanalında olması zorunlu
        if (!authorVoiceChannel) {
          return message.reply('<a:karbotonay:1380578520094343280> Öncelikle sesli bir kanala bağlanmalısınız.');
        }
        if (!memberVoiceChannel) {
          return message.reply('<a:karbotonay:1380578520094343280> Etiketlenen kullanıcı sesli kanalda değil.');
        }

        try {
          await member.voice.setChannel(authorVoiceChannel);
          message.reply(`<a:karbotonay:1380578520094343280> ${member.user.tag} sizin ses kanalınıza taşındı.`);
        } catch (error) {
          console.error(error);
          message.reply('<a:karbotyanls:1380579775235489812> Kullanıcıyı taşıyamadım. Yetkilerimi kontrol edin.');
        }
        break;

      case 'çek':
        // Botun ses kanalında olması zorunlu
        if (!botVoiceChannel) {
          return message.reply('<a:karbotyanls:1380579775235489812> Bot ses kanalında değil.');
        }
        if (!memberVoiceChannel) {
          return message.reply('<a:karbotyanls:1380579775235489812> Etiketlenen kullanıcı sesli kanalda değil.');
        }

        try {
          await member.voice.setChannel(botVoiceChannel);
          message.reply(`<a:karbotonay:1380578520094343280> ${member.user.tag} botun bulunduğu sesli kanala çekildi.`);
        } catch (error) {
          console.error(error);
          message.reply('<a:karbotyanls:1380579775235489812> Kullanıcıyı taşıyamadım. Yetkilerimi kontrol edin.');
        }
        break;

      case 'git':
        // Komutu kullananın ses kanalında olmaması durumunda hata
        if (!memberVoiceChannel) {
          return message.reply('<a:karbotyanls:1380579775235489812> Etiketlenen kullanıcı sesli kanalda değil.');
        }

        try {
          await message.member.voice.setChannel(memberVoiceChannel);
          message.reply(`<a:karbotonay:1380578520094343280> Siz ${member.user.tag}'in sesli kanalına taşındınız.`);
        } catch (error) {
          console.error(error);
          message.reply('<a:karbotyanls:1380579775235489812> Sizi taşıyamadım. Yetkilerinizi kontrol edin.');
        }
        break;

      default:
        message.reply('<a:karbotyanls:1380579775235489812> Geçersiz alt komut. Kullanabileceğiniz: at, çek, git');
    }
  }
});

//sunucupane

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command === 'sunucupanel') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply("<a:karbotyanls:1380579775235489812> Bu komutu kullanmak için **Kanalları Yönet** iznine sahip olmalısın.");
    }

    const subcommand = args[0]?.toLowerCase();

    if (subcommand === "kur") {
      let category = message.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === "Sunucu Panel");
      if (category) return message.reply("Sunucu Panel kategorisi zaten mevcut.");

      try {
        category = await message.guild.channels.create({
          name: "𝔖𝔲𝔫𝔲𝔠𝔲 𝔓𝔞𝔫𝔢𝔩",
          type: ChannelType.GuildCategory,
          reason: "<a:karbotonay:1380578520094343280> Sunucu Panel kategorisi oluşturuldu."
        });

        await category.setPosition(0); // En üstte konumlandır

        await message.guild.channels.create({
          name: `Ü𝔶𝔢 𝔖𝔞𝔶ı𝔰ı - ${message.guild.memberCount}`,
          type: ChannelType.GuildVoice,
          parent: category.id,
          permissionOverwrites: [
            {
              id: message.guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.Connect],
            }
          ],
          reason: "<a:karbotonay:1380578520094343280> Üye sayısı göstergesi kanalı oluşturuldu."
        });

        message.reply("<a:karbotonay:1380578520094343280> Sunucu Panel kategorisi ve Üye Sayısı kanalı başarıyla oluşturuldu.");

      } catch (error) {
        message.reply("<a:karbotyanls:1380579775235489812> Panel kurulurken hata oluştu: " + error.message);
      }
    }
    else if (subcommand === "sil") {
      let category = message.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === "Sunucu Panel");
      if (!category) return message.reply("<a:karbotyanls:1380579775235489812> Sunucu Panel kategorisi bulunamadı.");

      try {
        const channelsToDelete = message.guild.channels.cache.filter(c => c.parentId === category.id);
        for (const [id, ch] of channelsToDelete) {
          await ch.delete("<a:karbotonay:1380578520094343280> Sunucu Panel silindiği için alt kanal silindi.");
        }

        await category.delete("Sunucu Panel kategorisi silindi.");
        message.reply("<a:karbotonay:1380578520094343280> Sunucu Panel kategorisi ve altındaki kanallar başarıyla silindi.");

      } catch (error) {
        message.reply("<a:karbotyanls:1380579775235489812> Panel silinirken hata oluştu: " + error.message);
      }
    }
    else {
      message.reply("<a:karbotyanls:1380579775235489812> Geçersiz alt komut. Kullanım: `f!sunucupanel kur` veya `f!sunucupanel sil`");
    }
  }
});

// Üye girince güncelle
client.on('guildMemberAdd', async member => {
  try {
    const category = member.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === "Sunucu Panel");
    if (!category) return;

    const channel = member.guild.channels.cache.find(ch => ch.parentId === category.id && ch.name.startsWith("Üye Sayısı -"));
    if (!channel) return;

    await channel.setName(`Üye Sayısı - ${member.guild.memberCount}`);
  } catch (error) {
    console.error('Üye katılımında hata:', error);
  }
});

// Üye çıkınca güncelle
client.on('guildMemberRemove', async member => {
  try {
    const category = member.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === "Sunucu Panel");
    if (!category) return;

    const channel = member.guild.channels.cache.find(ch => ch.parentId === category.id && ch.name.startsWith("Üye Sayısı -"));
    if (!channel) return;

    await channel.setName(`Üye Sayısı - ${member.guild.memberCount}`);
  } catch (error) {
    console.error('Üye ayrıldığında hata:', error);
  }
});

// Slash komutun kaydı (deploy komutlarında kullanılır)
const otocevapCommand = new SlashCommandBuilder()
  .setName('otocevap')
  .setDescription('Otomatik cevap ekler')
  .addStringOption(option =>
    option.setName('giris')
      .setDescription('Yanıt verilecek mesaj')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('cevap')
      .setDescription('Verilecek yanıt')
      .setRequired(true));

// Komutlar listesine ekle (örnek)
commands.push(otocevapCommand.toJSON());

// Mesajları dinleyip cevap verme
client.on('messageCreate', message => {
  if (message.author.bot || !message.guild) return;

  const msg = message.content.toLowerCase();
  const guildId = message.guild.id;

  if (!sunucuOtoCevaplar[guildId]) {
    sunucuOtoCevaplar[guildId] = {};
  }

  // ✅ Otomatik cevap kontrolü
  if (sunucuOtoCevaplar[guildId][msg]) {
    return message.channel.send(sunucuOtoCevaplar[guildId][msg]);
  }

  // 🔧 f!otocevap <giriş> <cevap> (eski yöntem)
  if (msg.startsWith(prefix + 'otocevap')) {
    const args = message.content.slice((prefix + 'otocevap').length).trim().split(/ +/);
    if (args.length < 2) {
      return message.reply("<a:karbotyanls:1380579775235489812>Kullanım: `f!otocevap <giriş> <cevap>`");
    }

    const giris = args[0].toLowerCase();
    const cevap = args.slice(1).join(' ');

    sunucuOtoCevaplar[guildId][giris] = cevap;
    return message.reply(`<a:karbotonay:1380578520094343280> Artık bu sunucuda biri "${giris}" yazarsa, "${cevap}" diye cevap vereceğim.`);
  }
});

// Slash komut dinleyici
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'otocevap') return;

  const guildId = interaction.guild.id;
  const giris = interaction.options.getString('giris').toLowerCase();
  const cevap = interaction.options.getString('cevap');

  if (!sunucuOtoCevaplar[guildId]) {
    sunucuOtoCevaplar[guildId] = {};
  }

  sunucuOtoCevaplar[guildId][giris] = cevap;
  await interaction.reply(`<a:karbotonay:1380578520094343280> Artık biri "${giris}" yazarsa, "${cevap}" cevabını vereceğim.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command === "wasted") {
    try {
      const user = message.mentions.users.first() || message.author;
      const avatarURL = user.displayAvatarURL({ extension: "png", size: 512 });

      const canvas = Canvas.createCanvas(512, 512);
      const ctx = canvas.getContext("2d");

      // 1. Profil fotoğrafını çiz
      const avatar = await Canvas.loadImage(avatarURL);
      ctx.drawImage(avatar, 0, 0, 512, 512);

      // 2. Karanlık efekti (yarı saydam siyah katman)
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; // %40 karartma
      ctx.fillRect(0, 0, 512, 512);

      // 3. WASTED overlay ekle
      const wasted = await Canvas.loadImage(path.join(__dirname, "wasted.png"));
      ctx.drawImage(wasted, 0, 0, 512, 512);

      // 4. Görseli gönder
      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "wasted.png" });
      message.reply({ files: [attachment] });
    } catch (err) {
      console.error("Hata:", err);
      message.reply("Bir hata oluştu. Lütfen tekrar dene.");
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'sarıl') {
    const kullanıcı = message.mentions.users.first();
    if (!kullanıcı) {
      return message.reply('Lütfen sarılmak istediğin kişiyi etiketle! (`f!sarıl @kişi`)');
    }

    const gifler = [
      'https://media.giphy.com/media/143v0Z4767T15e/giphy.gif',
      'https://media.giphy.com/media/lrr9rHuoJOE0w/giphy.gif',
      'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
      'https://media.giphy.com/media/HaC1WdpkL3W00/giphy.gif'
    ];

    const rastgeleGif = gifler[Math.floor(Math.random() * gifler.length)];

    const embed = new EmbedBuilder()
      .setTitle('🤗 Sarılma!')
      .setDescription(`${message.author} adlı kişi, ${kullanıcı} adlı kişiye sarıldı!`)
      .setImage(rastgeleGif)
      .setColor('#ff69b4'); // sol çizgi rengi (pembe ton)

    message.channel.send({ embeds: [embed] });
  }
});

client.on('messageCreate', async message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'aranıyor') {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply('Lütfen aranacak kişiyi etiketle! Örnek: `f!aranıyor @kişi`');
    }

    const canvas = Canvas.createCanvas(430, 626); // Arka plan boyutuyla aynı
    const ctx = canvas.getContext('2d');

    // Afiş arka planı
    const background = await Canvas.loadImage(path.join(__dirname, 'wanted.png'));
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

const avatar = await Canvas.loadImage(target.displayAvatarURL({ extension: 'png', size: 256 }));
// Ortaya ve biraz daha aşağı yerleştirme (x = 87, y = 200)
ctx.drawImage(avatar, 87, 200, 256, 256);

    // Sonuç olarak gönder
    const attachment = {
      files: [{ attachment: canvas.toBuffer(), name: 'aranıyor.png' }]
    };

    message.channel.send({ content: `🚨 **${target.username}** aranıyor!`, ...attachment });
  }
});

const SLOT_CONFIG = {
  emojis: ['🍒', '💰', '🍋', '🔔', '⭐', '7️⃣', '🍇', '💎'],
  spinDuration: 3000, // 3 saniye
  spinSteps: 5, // Animasyon adım sayısı
  colors: {
    loading: '#FEE75C', // Sarı
    success: '#57F287'  // Yeşil
  }
};

const SLOTS = ['🍒', '💰', '🍋', '🔔', '⭐', '7️⃣', '🍇', '💎'];


client.on('messageCreate', async message => {
  if (message.author.bot || message.content !== 'f!slot') return;

  try {
    // 1. Başlangıç mesajı (Embed)
    const startEmbed = new EmbedBuilder()
      .setColor('#FFD700') // Altın rengi
      .setDescription(`**000 ${message.author.username} slot makinesini çalıştırdı! 000**`);
    
    await message.channel.send({ embeds: [startEmbed] });

    // 2. Animasyon (Embed ile)
    const spinEmbed = new EmbedBuilder()
      .setColor('#5865F2') // Mavi
      .setDescription("------------------\n\n🔄 **Slotlar dönüyor...**\n\n------------------");
    
    const spinMsg = await message.channel.send({ embeds: [spinEmbed] });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    spinEmbed.setDescription("------------------\n\n🔵 🔵 🔵\n\n------------------");
    await spinMsg.edit({ embeds: [spinEmbed] });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    spinEmbed.setDescription("------------------\n\n🟡 🟡 🟡\n\n------------------");
    await spinMsg.edit({ embeds: [spinEmbed] });

    // 3. Sonuç (Embed ile)
    const result = [
      `${randEmoji()} : ${randEmoji()} : ${randEmoji()}`,

      `${randEmoji()} : ${randEmoji()} : ${randEmoji()} <-`,
      
      `${randEmoji()} : ${randEmoji()} : ${randEmoji()}`
    ];
    
    const resultEmbed = new EmbedBuilder()
      .setColor('#57F287') // Yeşil
      .setDescription(`------------------\n${result.join('\n')}\n------------------`);
    
    await spinMsg.edit({ embeds: [resultEmbed] });

  } catch (err) {
    console.error('Hata:', err);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#ED4245') // Kırmızı
      .setDescription('❌ **Slot makinesi bozuldu!**');
    
    message.channel.send({ embeds: [errorEmbed] });
  }
});

function randEmoji() {
  return SLOTS[Math.floor(Math.random() * SLOTS.length)];
}

const kelimeler = [
  // Kısa kelimeler (1-4 harf)
  'ev', 'su', 'yol', 'gün', 'bal', 'at', 'göz', 'el', 'kuş', 'ay',
  'elma', 'masa', 'uçak',

  // Orta uzunlukta kelimeler (5-6 harf)
  'kalem', 'kitap', 'araba', 'okul', 'sevgi', 'deniz', 'yazı', 'çiçek', 'şehir',

  // Uzun kelimeler (7 ve üzeri harf)
  'telefon', 'bilgisayar', 'öğretmen', 'dostluklar', 'okullardan', 'arkadaşlık',
  'mutluluklar', 'çiçekçilik', 'sorumluluk', 'çalışkanlık', 'düşünceler, muvaffakiyetsizleştiricileştiriveremeyebileceklerimizdenmişsinizce'
];

const ecoPath = './ecoData.json';

// Para ekleme fonksiyonu (dosyaya anlık yazıyor)
function addMoney(userId, amount) {
  let ecoData = {};
  if (fs.existsSync(ecoPath)) {
    ecoData = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));
  }
  if (!ecoData[userId]) {
    ecoData[userId] = { money: 0 };
  }
  ecoData[userId].money += amount;
  fs.writeFileSync(ecoPath, JSON.stringify(ecoData, null, 2));
}

// Para okuma fonksiyonu
function getMoney(userId) {
  if (!fs.existsSync(ecoPath)) return 0;
  const ecoData = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));
  if (!ecoData[userId]) return 0;
  return ecoData[userId].money;
}



client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const prefix = 'f!';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // f!kelime komutu
  if (command === 'kelime') {
    const kelime = kelimeler[Math.floor(Math.random() * kelimeler.length)];

    const width = 500;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const imagePath = path.join(__dirname, 'background.png');

    try {
      const image = await loadImage(imagePath);
      ctx.drawImage(image, 0, 0, width, height);
    } catch (error) {
      console.error('Arka plan resmi yüklenemedi:', error);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 72px Arial';

    const textWidth = ctx.measureText(kelime).width;
    const x = (width - textWidth) / 2;
    const y = height / 2 + 9; // Yazıyı biraz yukarı aldık

    ctx.fillText(kelime, x, y);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'kelime.png' });

    await message.channel.send({ files: [attachment], content: `10 saniye içinde **${kelime}** kelimesini yaz!` });

    const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === kelime.toLowerCase();

    message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] })
      .then(() => {
        addMoney(message.author.id, 5);
        const bakiye = getMoney(message.author.id);

        message.channel.send(`Tebrikler! Doğru yazdın: **${kelime}** ve 5 KarCoin kazandın! Şu anki bakiyen: ${bakiye} KarCoin.`);
      })
      .catch(() => {
        message.channel.send(`Süre doldu! Doğru kelime **${kelime}** idi.`);
      });
  }
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.mentions.users;
  const command = message.content.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();

  if (command === 'aşkölçer') {
    const user1 = message.author;
    const user2 = args.first();

    if (!user2) {
      return message.reply('Birini etiketlemelisin! Örnek: `f!aşkölçer @kişi`');
    }

    const lovePercent = Math.floor(Math.random() * 101);
    const barWidth = Math.floor(lovePercent * 3.2); // Max: 320px

    const canvas = Canvas.createCanvas(500, 310);
    const ctx = canvas.getContext('2d');

    // Arka plan
    const bgPath = path.join(__dirname, 'arka-plan.png');
    const background = await Canvas.loadImage(bgPath);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);


// Bar çerçevesi (2 piksel sağa)
ctx.strokeStyle = 'black';
ctx.lineWidth = 2;
ctx.strokeRect(89, 215, 320, 37)

// Bar çubuğu (iç dolgu - 2 piksel sağa)
ctx.fillStyle = 'red';
ctx.fillRect(89, 215, barWidth, 37)

// Yüzde yazısı (2 piksel sağa)
ctx.fillStyle = 'black';
ctx.font = 'bold 20px sans-serif';
ctx.fillText(`%${lovePercent}`, 212, 250); // 210 → 212

    // Avatarlar
    const avatar1 = await Canvas.loadImage(user1.displayAvatarURL({ extension: 'png' }));
    const avatar2 = await Canvas.loadImage(user2.displayAvatarURL({ extension: 'png' }));

    ctx.drawImage(avatar1, 35, 70, 105, 100);
    ctx.drawImage(avatar2, 361, 70, 105, 100);

    // Gönder
    const attachment = {
      files: [{ attachment: canvas.toBuffer(), name: 'askolcer.png' }]
    };

    message.channel.send({ content: `${user1.username} ❤️ ${user2.username}`, ...attachment });
  }
});

client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  if (message.content.startsWith(prefix + 'sahteetiket')) {
    // 1-9 arası sayı alalım.
    message.channel.send("1 ile 9 arasında bir sayı seçiniz.").then(() => {
      // Kullanıcının cevabını bekle
      const filter = m => m.author.id === message.author.id;
      message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
        .then(async collected => {
          const sayi = collected.first().content;
          if (!/^[1-9]$/.test(sayi)) {
            return message.channel.send("Lütfen sadece 1 ile 9 arasında bir sayı giriniz.");
          }

          try {
            // Canvas 500x500
            const canvas = Canvas.createCanvas(500, 500);
            const ctx = canvas.getContext('2d');

            // Arka planı şeffaf yapabiliriz (Opsiyonel)
            ctx.clearRect(0, 0, 500, 500);

            // Sunucu logosunu al (url)
            const guildIconURL = message.guild.iconURL({ extension: 'png', size: 512 });
            if (!guildIconURL) return message.channel.send("Sunucunun logosu yok.");

            // Sunucu logosunu yükle ve çiz
            const guildIcon = await Canvas.loadImage(guildIconURL);
            // Logoyu tam olarak 500x500 çizelim
            ctx.drawImage(guildIcon, 0, 0, 500, 500);

            // Etiket.png dosyasını yükle (Proje klasöründe olmalı)
            const etiketPath = path.join(__dirname, '1etiket.png');
            const etiketImage = await Canvas.loadImage(etiketPath);
            // Üst üste çiz (etiket.png tam 500x500)
            ctx.drawImage(etiketImage, 0, 0, 500, 500);

            // Sayıyı sağ alt köşeye yaz (örneğin 480, 480 civarı)
            ctx.font = 'bold 160px Arial';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;

            // Sayının pozisyonu ve çizimi
            const text = sayi;
            const textMetrics = ctx.measureText(text);
            const x = 500 - textMetrics.width - 85;
            const y = 430;

            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);

            // Dosyayı Discord'a gönder
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'sahteetiket.png' });
            message.channel.send({ files: [attachment] });

          } catch (error) {
            console.error(error);
            message.channel.send("Bir hata oluştu.");
          }
        })
        .catch(() => {
          message.channel.send("Zaman aşımına uğradı. Lütfen tekrar deneyin.");
        });
    });
  }
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === 'f!kaçcm') {
    const cm = Math.floor(Math.random() * 51); // 0-50 dahil
    message.reply(`Seninki tam **${cm}cm** :flushed:`);
  }
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const prefix = 'f!';
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'mesajdöndür') {
    if (!args[0]) return message.reply('Bir mesaj yazmalısın!');

    const input = args.join(' ');
    const flipped = flipText(input);
    message.reply(`🔁 ${flipped}`);
  }
});

// Harfleri ters döndüren fonksiyon
function flipText(text) {
  const chars = {
    a: 'ɐ', b: 'q', c: 'ɔ', d: 'p',
    e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ',
    i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'ʃ',
    m: 'ɯ', n: 'u', o: 'o', p: 'd',
    q: 'b', r: 'ɹ', s: 's', t: 'ʇ',
    u: 'n', v: 'ʌ', w: 'ʍ', x: 'x',
    y: 'ʎ', z: 'z',
    A: '∀', B: '𐐒', C: 'Ɔ', D: '◖',
    E: 'Ǝ', F: 'Ⅎ', G: 'פ', H: 'H',
    I: 'I', J: 'ſ', K: '⋊', L: '⅃',
    M: 'W', N: 'N', O: 'O', P: 'Ԁ',
    Q: 'Ό', R: 'ᴚ', S: 'S', T: '⊥',
    U: '∩', V: 'Λ', W: 'M', X: 'X',
    Y: '⅄', Z: 'Z',
    '.': '˙', ',': "'", "'": ',', '"': '„',
    '!': '¡', '?': '¿', '(': ')', ')': '(',
    '[': ']', ']': '[', '{': '}', '}': '{',
    '<': '>', '>': '<', '_': '‾'
  };

  return text
    .split('')
    .map(c => chars[c] || chars[c.toLowerCase()] || c)
    .reverse()
    .join('');
}

let db;

// Mongoose bağlantısı ve şema tanımları
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB bağlantısı başarılı');
  } catch (err) {
    console.error('MongoDB bağlantı hatası:', err);
  }
}

// Leaderboard şema modeli
const leaderboardSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  score: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

// Puan ekleme fonksiyonu (Mongoose versiyonu)
async function addScore(userId, username, score) {
  try {
    await Leaderboard.findOneAndUpdate(
      { userId },
      { $inc: { score }, $set: { username, lastUpdated: new Date() } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Puan ekleme hatası:', err);
  }
}

// Sıralama getirme fonksiyonu (Mongoose versiyonu)
async function getLeaderboard(limit = 10) {
  try {
    return await Leaderboard.find()
      .sort({ score: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('Sıralama getirme hatası:', err);
    return [];
  }
}

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(`${prefix}1vs1`)) return;

  const args = message.content.slice(prefix.length + 4).trim().split(/ +/);
  const mention = message.mentions.users.first();
  const difficulty = args[1]?.toLowerCase();

  // Sıralama komutu
// Sıralama komutu (modern versiyon)
if (args[0] === "sıralama") {
    const leaderboard = await getLeaderboard();
    
    // Renkli embed oluşturma
    const embed = new EmbedBuilder()
        .setTitle("🏆 1vs1 Liderlik Tablosu 🏆")
        .setColor("#FFD700") // Altın rengi
        .setThumbnail("https://i.imgur.com/n9aurVy.png") // Örnek bir kupa resmi
        .setFooter({ text: `Son Güncelleme: ${new Date().toLocaleString()}` });
    
    // Sıralama bilgilerini ekleme
    if (leaderboard.length === 0) {
        embed.setDescription("Henüz liderlik tablosu boş. İlk sırada olmak için hemen bir savaş yap!");
    } else {
        // İlk 3 için özel renkler ve emojiler
        const top3Emojis = ["🥇", "🥈", "🥉"];
        
        let leaderboardText = "";
        leaderboard.forEach((entry, index) => {
            // İlk 3 için özel format
            if (index < 3) {
                leaderboardText += `${top3Emojis[index]} **${entry.username}** - \`${entry.score} puan\`\n`;
            } else {
                leaderboardText += `\`${index + 1}.\` ${entry.username} - \`${entry.score} puan\`\n`;
            }
        });
        
        embed.addFields(
            { name: 'Top 10 Oyuncu', value: leaderboardText }
        );
        
        // İlk 3 oyuncu için ekstra bilgiler
        if (leaderboard.length >= 3) {
            embed.addFields(
                { 
                    name: 'Liderler', 
                    value: `**${leaderboard[0].username}** şu an zirvede! 🏆\n` +
                           `2. ${leaderboard[1].username} ve 3. ${leaderboard[2].username} onu yakalamaya çalışıyor!`, 
                    inline: false 
                }
            );
        }
    }
    
    // İstatistikler ekleyelim
    const totalPlayers = await Leaderboard.countDocuments();
    const averageScore = await Leaderboard.aggregate([{ $group: { _id: null, avg: { $avg: "$score" } } }]);
    
    embed.addFields(
        { name: '📊 İstatistikler', value: `Toplam Oyuncu: ${totalPlayers}\nOrtalama Puan: ${Math.round(averageScore[0]?.avg || 0)}` }
    );
    
    return message.channel.send({ embeds: [embed] });
}

  if (!mention) return message.reply("Kiminle kapışacaksın? Lütfen bir kullanıcı etiketle.");
  if (mention.id === message.author.id) return message.reply("Kendinle savaşamazsın!");
  if (ongoingBattles.has(message.author.id) || ongoingBattles.has(mention.id)) {
    return message.reply("Taraflardan biri zaten bir savaşta!");
  }

  // Zorluklar sadece bot için geçerli
  const isBotBattle = mention.bot;
  if (isBotBattle && !["kolay", "mücadeleci", "dişli", "yenilmez"].includes(difficulty)) {
    return message.reply("Botla savaşmak için zorluk seç: kolay, mücadeleci, dişli, yenilmez");
  }

  const challenger = message.author;
  const opponent = mention;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("accept_1vs1").setLabel("Kabul Et").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("reject_1vs1").setLabel("Reddet").setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({
    content: `**${opponent}**, ${challenger} sana meydan okudu! Kabul ediyor musun?`,
    components: [row]
  });

  const filter = (i) => ["accept_1vs1", "reject_1vs1"].includes(i.customId) && i.user.id === opponent.id;
  const collector = msg.createMessageComponentCollector({ filter, time: 15000 });

  collector.on("collect", async (i) => {
    if (i.customId === "reject_1vs1") {
      await i.update({ content: `**${opponent.username}** savaşı reddetti.`, components: [] });
      return;
    }

    await i.update({ content: `Savaş başlıyor...`, components: [] });
    startBattle(challenger, opponent, message.channel, isBotBattle, difficulty);
  });
});

function startBattle(user1, user2, channel, isBotBattle, difficulty) {
  const battleData = {
    players: [user1, user2],
    hp: { [user1.id]: 500, [user2.id]: 500 },
    turn: user1.id,
    power: { [user1.id]: 0, [user2.id]: 0 },
    cooldown: {},
    timeout: null,
    usedUltra: { [user1.id]: false, [user2.id]: false },
    difficulty: isBotBattle ? difficulty : null
  };

  ongoingBattles.set(user1.id, battleData);
  ongoingBattles.set(user2.id, battleData);

  sendTurnMessage(channel, battleData);
}

async function sendTurnMessage(channel, battleData) {
  clearTimeout(battleData.timeout);
  const currentPlayer = battleData.players.find(p => p.id === battleData.turn);
  const opponent = battleData.players.find(p => p.id !== battleData.turn);

  let components = ["yumruk", "kalkan", "şifa", "kaç"];
  if (battleData.power[currentPlayer.id] >= 3 && !battleData.usedUltra[currentPlayer.id]) {
    components.splice(2, 0, "ultra güç");
  }

  const row = new ActionRowBuilder().addComponents(
    components.map(action =>
      new ButtonBuilder()
        .setCustomId(`battle_${action}`)
        .setLabel(action.charAt(0).toUpperCase() + action.slice(1))
        .setStyle(ButtonStyle.Primary)
    )
  );

  const embed = new EmbedBuilder()
    .setTitle("⚔️ 1vs1 Savaşı")
    .setDescription(`**${currentPlayer.username}**, sıran sende. Ne yapmak istersin?`)
    .addFields(
      { name: currentPlayer.username, value: `${battleData.hp[currentPlayer.id]} ❤️`, inline: true },
      { name: opponent.username, value: `${battleData.hp[opponent.id]} ❤️`, inline: true }
    )
    .setColor("Blue");

  const msg = await channel.send({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === currentPlayer.id,
    time: 60000
  });

  battleData.timeout = setTimeout(() => {
    channel.send(`⏱️ **${currentPlayer.username}** 1 dakika boyunca hamle yapmadı. **${opponent.username}** kazandı!<a:karbotparty:1381335756877987981>`);
    ongoingBattles.delete(currentPlayer.id);
    ongoingBattles.delete(opponent.id);
  }, 60000);

  collector.on("collect", async (i) => {
    await i.deferUpdate();
    handleBattleAction(i.customId.split("_")[1], battleData, channel);
    collector.stop();
  });
}

async function handleBattleAction(action, data, channel) {
  const player = data.players.find(p => p.id === data.turn);
  const enemy = data.players.find(p => p.id !== data.turn);
  let log = "";

  // Kalkan etkisini kontrol et (bir önceki turda kalkan kullanılmışsa)
  const hasShieldProtection = data.shieldActive && data.shieldActive[player.id];
  
  if (action === "yumruk") {
    let damage = Math.floor(Math.random() * 50) + 30;
    
    // Kalkan etkisi varsa hasarı %50 azalt
    if (hasShieldProtection) {
      damage = Math.floor(damage * 0.5);
      delete data.shieldActive[player.id]; // Tek seferlik etki
      log = `**${player.username}** ${damage} hasar vurdu (${enemy.username}'in kalkanı etkisiyle hasar yarıya düştü!)`;
    } else {
      log = `**${player.username}** tam **${damage}** hasar vurdu!`;
    }
    
    data.hp[enemy.id] -= damage;
    data.power[player.id]++;
    
  } else if (action === "kalkan") {
    data.power[player.id]++;
    // Bir sonraki tur için kalkan etkisini aktif et
    if (!data.shieldActive) data.shieldActive = {};
    data.shieldActive[enemy.id] = true; // Rakibin bir sonraki saldırısına karşı
    log = `**${player.username}**, Süper Kalkan ile savundu. Bir sonraki saldırıda hasar %50 azalacak!`;
    
  } else if (action === "şifa") {
    const chance = Math.random();
    if (chance > 0.4) {
      const heal = Math.floor(Math.random() * 30) + 20;
      data.hp[player.id] += heal;
      if (data.hp[player.id] > 500) data.hp[player.id] = 500;
      log = `**${player.username}**, iksirle **${heal}** can kazandı.`;
    } else {
      log = `**${player.username}**, şifa almaya çalıştı ama su göndermişler! Başarısız oldu.`;
    }
  } else if (action === "ultra güç") {
    if (data.power[player.id] >= 3 && !data.usedUltra[player.id]) {
      const damage = Math.floor(Math.random() * 100) + 50;
      data.hp[enemy.id] -= damage;
      data.usedUltra[player.id] = true;
      log = `**${player.username}**, ULTRA GÜÇ ile tam **${damage}** hasar verdi!`;
    } else {
      log = `**${player.username}**, Ultra Güç kullanılamıyor.`;
    }
  } else if (action === "kaç") {
    clearTimeout(data.timeout);
    
    // Kaçan kişi 100 puan kaybeder, diğer oyuncu 100 puan kazanır
    await addScore(player.id, player.username, -100);
    await addScore(enemy.id, enemy.username, 100);
    
    channel.send(`**${player.username}** savaştan kaçtı!\n` +
                `**${player.username}** 100 puan kaybetti!\n` +
                `**${enemy.username}** 100 puan kazandı!<a:karbotparty:1381335756877987981>`);
    
    ongoingBattles.delete(player.id);
    ongoingBattles.delete(enemy.id);
    return;
  }

  if (data.hp[enemy.id] <= 0) {
    const winner = player;
    const winnerHp = data.hp[player.id];
    
    channel.send(`🏆 **${winner.username}** kazandı! (Kalan can: ${winnerHp}) <a:karbotparty:1381335756877987981>`);
    
    // Kazananın puanını ekle (kalan can kadar)
    await addScore(winner.id, winner.username, winnerHp);
    
    ongoingBattles.delete(player.id);
    ongoingBattles.delete(enemy.id);
    return;
  }

  await channel.send(log);
  data.turn = enemy.id;
  sendTurnMessage(channel, data);
}


const adamCizimleri = [
  `\`\`\`
  _______
  |     |
  |
  |
  |
  |
=========\`\`\``,
  `\`\`\`
  _______
  |     |
  |     O
  |
  |
  |
=========\`\`\``,
  `\`\`\`
  _______
  |     |
  |     O
  |     |
  |
  |
=========\`\`\``,
  `\`\`\`
  _______
  |     |
  |     O
  |    /|
  |
  |
=========\`\`\``,
  `\`\`\`
  _______
  |     |
  |     O
  |    /|\\
  |
  |
=========\`\`\``,
  `\`\`\`
  _______
  |     |
  |     O
  |    /|\\
  |    /
  |
=========\`\`\``,
  `\`\`\`
  _______
  |     |
  |     O
  |    /|\\
  |    / \\
  |
=========\`\`\``
];

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(`${prefix}adamasmaca`) || message.author.bot) return;

  const kelime = kelimeler2[Math.floor(Math.random() * kelimeler2.length)].toLowerCase();
  let gizli = kelime.split("").map(() => "_");
  let yanlisHarfler = [];
  let yanlisSayisi = 0;

  const msg = await message.channel.send(
    `🎮 **karBOT Adam Asmaca!**\n📌 Kelime: \`${gizli.join(" ")}\`\n❌ Yanlış Harfler: Yok\n\`\`\`${adamCizimleri[yanlisSayisi]}\`\`\``
  );

  const filter = m => m.author.id === message.author.id;
  const collector = message.channel.createMessageCollector({ filter, time: 120000 });

  collector.on("collect", cevap => {
    const tahmin = cevap.content.toLowerCase();

    // Tüm kelimeyi tahmin etme
    if (tahmin.length > 1) {
      if (tahmin === kelime) {
        msg.edit(`🎉 **Tebrikler! Doğru tahmin ettin!**\n✅ Kelime: \`${kelime}\`\n\`\`\`${adamCizimleri[yanlisSayisi]}\`\`\``);
      } else {
        msg.edit(`💀 **Yanlış tahmin! Adam asıldı!**\n🧠 Doğru kelime: \`${kelime}\`\n\`\`\`${adamCizimleri[adamCizimleri.length - 1]}\`\`\``);
      }
      collector.stop();
      return;
    }

    const harf = tahmin;

    if (!/^[a-zğüşıöç]$/i.test(harf)) {
      cevap.reply("<a:karbotyanls:1380579775235489812> Lütfen sadece bir harf veya doğru kelimeyi yaz.");
      return;
    }

    if (gizli.includes(harf) || yanlisHarfler.includes(harf)) {
      cevap.reply("<a:karbotyanls:1380579775235489812> Bu harfi zaten denedin.");
      return;
    }

    if (kelime.includes(harf)) {
      kelime.split("").forEach((h, i) => {
        if (h === harf) gizli[i] = harf;
      });
    } else {
      yanlisHarfler.push(harf);
      yanlisSayisi++;
    }

    if (!gizli.includes("_")) {
      msg.edit(`🎉 **Tebrikler, kelimeyi tamamladın!**\n<a:karbotonay:1380578520094343280> Kelime: \`${kelime}\`\n\`\`\`${adamCizimleri[yanlisSayisi]}\`\`\``);
      collector.stop();
      return;
    }

    if (yanlisSayisi >= adamCizimleri.length - 1) {
      msg.edit(`💀 **Adam Asıldı!**\n🧠 Doğru Kelime: \`${kelime}\`\n❌ Yanlış Harfler: ${yanlisHarfler.join(", ")}\n\`\`\`${adamCizimleri[yanlisSayisi]}\`\`\``);
      collector.stop();
      return;
    }

    msg.edit(
      `🎮 **karBOT Adam Asmaca!**\n📌 Kelime: \`${gizli.join(" ")}\`\n❌ Yanlış Harfler: ${yanlisHarfler.length ? yanlisHarfler.join(", ") : "Yok"}\n\`\`\`${adamCizimleri[yanlisSayisi]}\`\`\``
    );
  });

  collector.on("end", (_, reason) => {
    if (reason === "time") {
      msg.edit(`⏱️ **Süre doldu!**\n🧠 Doğru Kelime: \`${kelime}\`\n\`\`\`${adamCizimleri[yanlisSayisi]}\`\`\``);
    }
  });
});

const kelimeler3 = [
  'kişisel', 'gizemli', 'uçurtma', 'zaman', 'şehir', 'kütüphane',
  'merdiven', 'kalemlik', 'kitaplık', 'çalışkan', 'defter'
];

const aktifOyunlar = new Map();

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'kelimeyarışı') {
    const etiketlenen = message.mentions.users.first();
    if (!etiketlenen) return message.reply('Bir kullanıcı etiketlemelisin!');

    if (aktifOyunlar.get(message.channel.id)) {
      return message.reply('Bu kanalda zaten aktif bir kelime oyunu var!');
    }

    const kelime = kelimeler3[Math.floor(Math.random() * kelimeler3.length)];

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kabul')
        .setLabel('✅ Kabul Et')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('reddet')
        .setLabel('❌ Reddet')
        .setStyle(ButtonStyle.Danger)
    );

    const oyunMesaj = await message.channel.send({
      content: `📨 | ${etiketlenen} Kelime Oyunu İsteği Geldi. Kabul ediyor musun?`,
      components: [row]
    });

    const filter = (i) => i.user.id === etiketlenen.id;
    const collector = oyunMesaj.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async (i) => {
      if (i.customId === 'kabul') {
        await i.update({ content: `✅ ${etiketlenen} daveti kabul etti!`, components: [] });

        await message.channel.send(`📝 Kelime: **${kelime}**\nİlk yazan kazanır!`);
        aktifOyunlar.set(message.channel.id, true);

        const yazmaFilter = (m) =>
          [message.author.id, etiketlenen.id].includes(m.author.id) &&
          m.content.toLowerCase() === kelime.toLowerCase();

        const yazmaCollector = message.channel.createMessageCollector({ filter: yazmaFilter, time: 15000 });

        yazmaCollector.on('collect', (m) => {
          message.channel.send(`<a:karbotparty:1381335756877987981> Tebrikler ${m.author}, doğru yazdın ve yarışı kazandın!`);
          aktifOyunlar.delete(message.channel.id);
          yazmaCollector.stop();
        });

        yazmaCollector.on('end', (collected, reason) => {
          if (reason !== 'user' && collected.size === 0) {
            message.channel.send('⏰ Süre doldu, kimse kazanamadı.');
            aktifOyunlar.delete(message.channel.id);
          }
        });

      } else if (i.customId === 'reddet') {
        await i.update({ content: `❌ ${etiketlenen} isteği reddetti.`, components: [] });
      }
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        oyunMesaj.edit({ content: '❌ İstek zaman aşımına uğradı.', components: [] });
      }
    });
  }
});

client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (message.content === 'f!site') {
    message.channel.send('Bu özellik için siteye ne dersin? https://karbot.w3spaces.com/index.html ');
  }
});

//afk sistemi

// AFK listesi: userId => { reason, timestamp }
const afkMap = new Map();

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const prefix = config.prefix;

  // ✅ Mesaj atan kişi AFK mıydı?
  if (afkMap.has(message.author.id)) {
    afkMap.delete(message.author.id);
    message.reply({ embeds: [
      new EmbedBuilder()
        .setColor('Green')
        .setTitle('⏱️ AFK Modundan Çıkıldı')
        .setDescription('Artık AFK değilsin. Hoşgeldin!')
    ]});
  }

  // ✅ Etiketlenen kişi AFK mı?
  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach(user => {
      if (afkMap.has(user.id)) {
        const afk = afkMap.get(user.id);
        message.reply({ embeds: [
    new EmbedBuilder()
      .setColor('Orange')
      .setTitle(`🔕 ${user.username} şu anda AFK`)
      .setDescription(`**Sebep:** ${afk.reason}`)
      .setFooter({ text: 'Lütfen rahatsız etmeyiniz.' })
  ],
  allowedMentions: { users: [] } // 🔇 Etiketleme bildirimi gönderme
});
      }
    });
  }

  // ✅ Komut: f!afk sebep
  if (message.content.startsWith(`${prefix}afk`)) {
    const args = message.content.slice(prefix.length + 3).trim();
    const reason = args || 'Sebep belirtilmedi.';
    afkMap.set(message.author.id, {
      reason,
      timestamp: Date.now()
    });

    message.reply({ embeds: [
      new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🛌 AFK Modu Aktif')
        .setDescription(`Artık AFK'sın. Sebep: **${reason}**`)
        .setFooter({ text: 'Mesaj yazınca otomatik çıkılır.' })
    ]});
  }
});

client.on("messageCreate", message => {
  // Bot mesajlarını ve prefix dışı mesajları yoksay
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "emojiyazı") {
    const metin = args.join(" ").toUpperCase();
    if (!metin) return message.reply("Lütfen bir yazı gir.");

    let cevap = "";

    for (let harf of metin) {
      if (harf >= 'A' && harf <= 'Z') {
        cevap += `:regional_indicator_${harf.toLowerCase()}: `;
      } else if (harf === " ") {
        cevap += "⬛ "; // boşluk için kutu emoji
      } else {
        cevap += harf + " "; // özel karakterler aynen yazılır
      }
    }

    message.reply(cevap);
  }
});

//küfürengel

const küfürler = [
// TEMEL KÜFÜRLER
"salak", "aptal", "oç", "anan", "orospu", "amk", "aq", "siktir", "yarrak", "piç",
"amınakoyım", "yarram", "mal", "gerizekalı", "gerzek", "ibne", "göt", "götveren",
"sikik", "siktiğim", "amcık", "amına", "sik", "sikerim", "sokarım", "yaraq", "amq",
"sikim", "pezevenk", "orospuçocuğu", "orospu cocugu", "oc", "ananısikeyim", "ananı sikeyim",
"sikis", "sikiyim", "amına koyayım", "amina koyayim", "kancık", "şerefsiz", "haysiyetsiz",
"piç kurusu", "göt lalesi", "götlek", "veled", "çocuğu", "kevaşe", "fahişe", "amcığa",
"siktir git", "siktir ol", "yarramin", "yavşak", "yirtik",
];

// MongoDB bağlantısı
mongoose.connect("mongodb+srv://karbot:ferhat6712@cluster0.292mbf8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ MongoDB'ye bağlanıldı.");
}).catch(err => {
  console.error("❌ MongoDB bağlantı hatası:", err);
});

// Şema tanımı
const guildSettingsSchema = new mongoose.Schema({
  guildID: { type: String, required: true, unique: true },
  kufurEngel: { type: Boolean, default: false }
});

const GuildSettings = mongoose.model("GuildSettings", guildSettingsSchema);

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  const args = message.content.toLowerCase().split(" ");
  const command = args[0];

  // f!küfürengel aç/kapat komutu
  if (command === "f!küfürengel") {
    if (!message.member.permissions.has("ManageGuild"))
      return message.reply("❌ Bu komutu kullanmak için `Sunucuyu Yönet` yetkisine sahip olmalısın.");

    let data = await GuildSettings.findOne({ guildID: message.guild.id });
    if (!data) {
      data = new GuildSettings({ guildID: message.guild.id });
    }

    if (args[1] === "aç") {
      data.kufurEngel = true;
      await data.save();
      return message.reply("✅ Küfür engel sistemi **aktif** edildi.");
    }

    if (args[1] === "kapat") {
      data.kufurEngel = false;
      await data.save();
      return message.reply("❌ Küfür engel sistemi **devre dışı** bırakıldı.");
    }

    return message.reply("Lütfen `f!küfürengel aç` veya `f!küfürengel kapat` şeklinde kullan.");
  }

  // Küfür engelleme sistemi çalışıyor mu?
  const ayar = await GuildSettings.findOne({ guildID: message.guild.id });
  if (ayar && ayar.kufurEngel) {
    if (
      !message.member.permissions.has("ManageGuild") &&
      küfürler.some(k => message.content.toLowerCase().includes(k))
    ) {
      await message.delete().catch(() => {});
      return message.channel.send(`🚫 ${message.author}, küfür etme!`).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 3000);
      });
    }
  }
});

//linkengel

// MongoDB schema ve model
const linkEngelSchema = new mongoose.Schema({
  guildId: String,
  aktif: Boolean
});
const LinkEngel = mongoose.model('LinkEngel', linkEngelSchema);

// MongoDB bağlantısı
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB bağlantısı başarılı!'))
  .catch(console.error);

// Bot hazır olduğunda konsola yaz
client.once('ready', () => {
  console.log(`Bot giriş yaptı: ${client.user.tag}`);
});

// Mesaj geldiğinde
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;  // Bot mesajlarını yoksay
  if (!message.guild) return;       // DM'leri yoksay

  const prefix = 'f!';

  // Komut: f!linkengel aç/kapat
  if (message.content.toLowerCase().startsWith(prefix + 'linkengel')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('Bu komutu kullanmak için yönetici olmalısın.');
    }

    const args = message.content.split(' ').slice(1);
    if (!args[0]) return message.reply('Lütfen `aç` ya da `kapat` yaz.');

    const durum = args[0].toLowerCase();
    if (durum !== 'aç' && durum !== 'kapat') {
      return message.reply('Geçerli seçenek: `aç` ya da `kapat`.');
    }

    const aktifMi = durum === 'aç';

    let kayit = await LinkEngel.findOne({ guildId: message.guild.id });
    if (kayit) {
      kayit.aktif = aktifMi;
      await kayit.save();
    } else {
      kayit = new LinkEngel({
        guildId: message.guild.id,
        aktif: aktifMi
      });
      await kayit.save();
    }

    return message.channel.send(`Link engel başarıyla **${aktifMi ? 'açıldı' : 'kapatıldı'}**.`);
  }

  // Link engel aktifse link içeren mesajları sil (Yönetici olanlar serbest)
  const kayit = await LinkEngel.findOne({ guildId: message.guild.id });
  if (kayit && kayit.aktif) {
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|discord\.gg\/[^\s]+/i;
    if (linkRegex.test(message.content)) {
      if (!message.member.permissions.has('Administrator')) {
        try {
          await message.delete();
          message.channel.send(`${message.author}, link paylaşımı bu sunucuda engelleniyor!`).then(msg => {
            setTimeout(() => msg.delete(), 5000);
          });
        } catch (error) {
          console.error('Mesaj silinemedi:', error);
        }
      }
    }
  }
});

// --- MongoDB Bağlantısı ve Model ---
mongoose.connect("mongodb+srv://karbot:ferhat6712@cluster0.292mbf8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("🟢 MongoDB bağlantısı başarılı!"))
  .catch(e => console.error("🔴 MongoDB bağlantı hatası:", e));

const logChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
});
const LogChannel = mongoose.model("LogChannel", logChannelSchema);

// --- Yardımcı Fonksiyonlar ---

async function getLogChannel(guildId) {
  const data = await LogChannel.findOne({ guildId });
  return data ? data.channelId : null;
}

function createLogEmbed(title, description, color = 0x0099ff) {
  return new EmbedBuilder()
    .setTitle(`📝 ${title}`)
    .setDescription(description)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: "Log Sistemi", iconURL: client.user.displayAvatarURL() });
}

async function sendLog(guild, embed) {
  const channelId = await getLogChannel(guild.id);
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  channel.send({ embeds: [embed] }).catch(() => {});
}

async function fetchExecutor(guild, type, targetId) {
  try {
    const auditLogs = await guild.fetchAuditLogs({ limit: 5, type: type });
    for (const [id, entry] of auditLogs.entries) {
      if (entry.target?.id === targetId) return entry.executor?.tag || "Bilinmiyor";
    }
  } catch {
    return "Bilinmiyor";
  }
  return "Bilinmiyor";
}

function getChannelTypeName(type) {
  const types = {
    [ChannelType.GuildText]: "📝 Yazı Kanalı",
    [ChannelType.GuildVoice]: "🔊 Ses Kanalı",
    [ChannelType.GuildCategory]: "📁 Kategori",
    [ChannelType.GuildNews]: "📢 Duyuru Kanalı",
    [ChannelType.GuildStageVoice]: "🎤 Sahne Kanalı",
    [ChannelType.GuildForum]: "💬 Forum Kanalı"
  };
  return types[type] || "❓ Bilinmeyen Tür";
}

function getRoleColor(color) {
  return color ? `#${color.toString(16).padStart(6, '0')}` : "🌈 Varsayılan";
}

// --- Log Kanalı Ayarlama Komutu ---
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;
  
  const prefix = "f!";
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  if (cmd === "log") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("❌ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!")
        ]
      });
    }

    const kanal = message.mentions.channels.first();
    if (!kanal) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle("Log Kanalı Ayarlama")
            .setDescription("Lütfen bir kanal etiketle!\nÖrnek: `f!log #log-kanalı`")
        ]
      });
    }

    try {
      const existing = await LogChannel.findOne({ guildId: message.guild.id });
      if (existing) {
        existing.channelId = kanal.id;
        await existing.save();
      } else {
        await LogChannel.create({ guildId: message.guild.id, channelId: kanal.id });
      }

      const successEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(`✅ Log kanalı başarıyla ${kanal} olarak ayarlandı!`)
        .setThumbnail("https://cdn.discordapp.com/emojis/833473153306198036.png");
      
      return message.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("Log kanalı ayarlama hatası:", error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("🔴 Log kanalı ayarlanırken bir hata oluştu!")
        ]
      });
    }
  }
});

// --- Eventler ---

// Mesaj Silindi
client.on("messageDelete", async message => {
  if (!message.guild) return;
  if (message.partial) await message.fetch().catch(() => {});

  const executor = await fetchExecutor(message.guild, AuditLogEvent.MessageDelete, message.id);

  const embed = createLogEmbed(
    "Mesaj Silindi",
    `**👤 Kullanıcı:** ${message.author?.tag || "Bilinmiyor"}\n` +
    `**📌 Kanal:** ${message.channel?.toString() || "Bilinmiyor"}\n` +
    `**🗒️ Mesaj:** ${message.content?.slice(0, 1024) || "*Mesaj içeriği yok*"}\n` +
    `**🛠️ İşlemi Yapan:** ${executor}`,
    0xff0000
  ).setThumbnail(message.author?.displayAvatarURL() || null);

  sendLog(message.guild, embed);
});

// Mesaj Düzenlendi
client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!oldMessage.guild) return;
  if (oldMessage.partial) await oldMessage.fetch().catch(() => {});
  if (newMessage.partial) await newMessage.fetch().catch(() => {});
  if (oldMessage.content === newMessage.content) return;

  const executor = await fetchExecutor(oldMessage.guild, AuditLogEvent.MessageUpdate, oldMessage.id);

  const embed = createLogEmbed(
    "Mesaj Düzenlendi",
    `**👤 Kullanıcı:** ${oldMessage.author?.tag || "Bilinmiyor"}\n` +
    `**📌 Kanal:** ${oldMessage.channel?.toString() || "Bilinmiyor"}\n` +
    `**📜 Eski Mesaj:** ${oldMessage.content?.slice(0, 512) || "*Mesaj içeriği yok*"}\n` +
    `**🆕 Yeni Mesaj:** ${newMessage.content?.slice(0, 512) || "*Mesaj içeriği yok*"}\n` +
    `**🛠️ İşlemi Yapan:** ${executor}`,
    0xffa500
  ).setThumbnail(oldMessage.author?.displayAvatarURL() || null);

  sendLog(oldMessage.guild, embed);
});

// Kanal Oluşturuldu
client.on("channelCreate", async channel => {
  if (!channel.guild) return;

  const executor = await fetchExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

  const embed = createLogEmbed(
    "Kanal Oluşturuldu",
    `**📛 İsim:** ${channel.name}\n` +
    `**🔧 Tür:** ${getChannelTypeName(channel.type)}\n` +
    `**🆔 ID:** \`${channel.id}\`\n` +
    `**👷 Oluşturan:** ${executor}`,
    0x00ff00
  );

  sendLog(channel.guild, embed);
});

// Kanal Silindi
client.on("channelDelete", async channel => {
  if (!channel.guild) return;

  const executor = await fetchExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);

  const embed = createLogEmbed(
    "Kanal Silindi",
    `**📛 İsim:** ${channel.name}\n` +
    `**🔧 Tür:** ${getChannelTypeName(channel.type)}\n` +
    `**🆔 ID:** \`${channel.id}\`\n` +
    `**🗑️ Silen:** ${executor}`,
    0xff0000
  );

  sendLog(channel.guild, embed);
});

// Rol Oluşturuldu
client.on("roleCreate", async role => {
  const executor = await fetchExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);

  const embed = createLogEmbed(
    "Rol Oluşturuldu",
    `**🎭 Rol:** ${role.name}\n` +
    `**🎨 Renk:** ${getRoleColor(role.color)}\n` +
    `**🆔 ID:** \`${role.id}\`\n` +
    `**👷 Oluşturan:** ${executor}`,
    0x00ff00
  );

  sendLog(role.guild, embed);
});

// Rol Silindi
client.on("roleDelete", async role => {
  const executor = await fetchExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);

  const embed = createLogEmbed(
    "Rol Silindi",
    `**🎭 Rol:** ${role.name}\n` +
    `**🎨 Renk:** ${getRoleColor(role.color)}\n` +
    `**🆔 ID:** \`${role.id}\`\n` +
    `**🗑️ Silen:** ${executor}`,
    0xff0000
  );

  sendLog(role.guild, embed);
});

// Rol Güncellendi
client.on("roleUpdate", async (oldRole, newRole) => {
  let changes = "";
  if (oldRole.name !== newRole.name) changes += `**📛 İsim:** \`${oldRole.name}\` ➔ \`${newRole.name}\`\n`;
  if (oldRole.color !== newRole.color) changes += `**🎨 Renk:** ${getRoleColor(oldRole.color)} ➔ ${getRoleColor(newRole.color)}\n`;
  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes += `**🔐 İzinler değişti**\n`;
  if (!changes) return;

  const executor = await fetchExecutor(oldRole.guild, AuditLogEvent.RoleUpdate, oldRole.id);

  const embed = createLogEmbed(
    "Rol Güncellendi",
    `**🎭 Rol:** ${oldRole.name}\n` + changes +
    `**🔄 Güncelleyen:** ${executor}`,
    0xffa500
  );

  sendLog(oldRole.guild, embed);
});

// Üye Katıldı
client.on("guildMemberAdd", member => {
  const embed = createLogEmbed(
    "Üye Katıldı",
    `🎉 **${member.user.tag}** sunucuya katıldı!\n` +
    `**🆔 Kullanıcı ID:** \`${member.id}\`\n` +
    `**📅 Hesap Oluşturulma:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
    0x00ff00
  ).setThumbnail(member.user.displayAvatarURL());

  sendLog(member.guild, embed);
});

// Üye Ayrıldı
client.on("guildMemberRemove", member => {
  const embed = createLogEmbed(
    "Üye Ayrıldı",
    `👋 **${member.user.tag}** sunucudan ayrıldı!\n` +
    `**🆔 Kullanıcı ID:** \`${member.id}\`\n` +
    `**📅 Katılma Tarihi:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
    0xff0000
  ).setThumbnail(member.user.displayAvatarURL());

  sendLog(member.guild, embed);
});

// Banlandı
client.on("guildBanAdd", async ban => {
  const executor = await fetchExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);

  const embed = createLogEmbed(
    "Üye Banlandı",
    `⛔ **${ban.user.tag}** banlandı!\n` +
    `**📝 Sebep:** ${ban.reason || "Belirtilmedi"}\n` +
    `**🔨 Banlayan:** ${executor}`,
    0xff0000
  ).setThumbnail(ban.user.displayAvatarURL());

  sendLog(ban.guild, embed);
});

// Ban Kaldırıldı
client.on("guildBanRemove", async ban => {
  const executor = await fetchExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);

  const embed = createLogEmbed(
    "Ban Kaldırıldı",
    `✅ **${ban.user.tag}** kullanıcısının banı kaldırıldı!\n` +
    `**🙌 İşlemi Yapan:** ${executor}`,
    0x00ff00
  ).setThumbnail(ban.user.displayAvatarURL());

  sendLog(ban.guild, embed);
});

// Sunucu Güncellendi
client.on("guildUpdate", async (oldGuild, newGuild) => {
  let changes = "";

  if (oldGuild.name !== newGuild.name) changes += `**📛 İsim:** \`${oldGuild.name}\` ➔ \`${newGuild.name}\`\n`;
  if (oldGuild.iconURL() !== newGuild.iconURL()) changes += `**🖼️ İkon değişti**\n`;
  if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) changes += `**🔗 Vanity URL değişti**\n`;

  if (!changes) return;

  const executor = await fetchExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id).catch(() => "Bilinmiyor");

  const embed = createLogEmbed(
    "Sunucu Güncellendi",
    changes + `**🔄 Güncelleyen:** ${executor}`,
    0x00ffff
  );

  sendLog(newGuild, embed);
});

// Rol Verme/Alma Logları
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
    
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    // Rol verilme durumu
    if (addedRoles.size > 0) {
      const executor = await fetchExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
      
      const embed = createLogEmbed(
        "Üyeye Rol Verildi",
        `**👤 Kullanıcı:** ${newMember.user.tag}\n` +
        `**🎭 Verilen Rol:** ${addedRoles.map(r => r.toString()).join(", ")}\n` +
        `**🛠️ İşlemi Yapan:** ${executor}`,
        0x00ff00
      ).setThumbnail(newMember.user.displayAvatarURL());
      
      sendLog(newMember.guild, embed);
    }
    
    // Rol alınma durumu
    if (removedRoles.size > 0) {
      const executor = await fetchExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
      
      const embed = createLogEmbed(
        "Üyeden Rol Alındı",
        `**👤 Kullanıcı:** ${newMember.user.tag}\n` +
        `**🎭 Alınan Rol:** ${removedRoles.map(r => r.toString()).join(", ")}\n` +
        `**🛠️ İşlemi Yapan:** ${executor}`,
        0xff0000
      ).setThumbnail(newMember.user.displayAvatarURL());
      
      sendLog(newMember.guild, embed);
    }
  } catch (error) {
    console.error("Rol log hatası:", error);
  }
});

// Emoji Logları
client.on("emojiCreate", async emoji => {
  try {
    const executor = await fetchExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
    
    const embed = createLogEmbed(
      "Emoji Oluşturuldu",
      `**😀 Emoji:** ${emoji.toString()} \`${emoji.name}\`\n` +
      `**🆔 ID:** \`${emoji.id}\`\n` +
      `**👷 Oluşturan:** ${executor}`,
      0x00ff00
    ).setImage(emoji.url);
    
    sendLog(emoji.guild, embed);
  } catch (error) {
    console.error("Emoji oluşturma log hatası:", error);
  }
});

client.on("emojiDelete", async emoji => {
  try {
    const executor = await fetchExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
    
    const embed = createLogEmbed(
      "Emoji Silindi",
      `**😀 Emoji:** \`${emoji.name}\`\n` +
      `**🆔 ID:** \`${emoji.id}\`\n` +
      `**🗑️ Silen:** ${executor}`,
      0xff0000
    );
    
    sendLog(emoji.guild, embed);
  } catch (error) {
    console.error("Emoji silme log hatası:", error);
  }
});

client.on("emojiUpdate", async (oldEmoji, newEmoji) => {
  try {
    if (oldEmoji.name === newEmoji.name) return;
    
    const executor = await fetchExecutor(newEmoji.guild, AuditLogEvent.EmojiUpdate, newEmoji.id);
    
    const embed = createLogEmbed(
      "Emoji Güncellendi",
      `**😀 Emoji:** ${newEmoji.toString()}\n` +
      `**📛 Eski İsim:** \`${oldEmoji.name}\`\n` +
      `**🆕 Yeni İsim:** \`${newEmoji.name}\`\n` +
      `**🔄 Güncelleyen:** ${executor}`,
      0xffa500
    ).setImage(newEmoji.url);
    
    sendLog(newEmoji.guild, embed);
  } catch (error) {
    console.error("Emoji güncelleme log hatası:", error);
  }
});

// --- Otorol Sistemi ---
const autoRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  roleId: { type: String, required: true }
});

const AutoRole = mongoose.model('AutoRole', autoRoleSchema);

client.on('guildMemberAdd', async (member) => {
  try {
    const data = await AutoRole.findOne({ guildId: member.guild.id });
    if (!data) return;

    const role = member.guild.roles.cache.get(data.roleId);
    if (!role) return;

    await member.roles.add(role);
    
    const logEmbed = createLogEmbed(
      "Otorol Uygulandı",
      `**👤 Kullanıcı:** ${member.user.tag}\n` +
      `**🎭 Rol:** ${role.name}`,
      0x7289da
    ).setThumbnail(member.user.displayAvatarURL());
    
    sendLog(member.guild, logEmbed);
  } catch (err) {
    console.error('Otomatik rol verirken hata:', err);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const prefix = 'f!';
  if (!message.content.toLowerCase().startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'otorol') {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("❌ Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısın!")
        ]
      });
    }

    if (args.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x7289da)
            .setTitle("Otorol Sistemi")
            .setDescription("**Kullanım:**\n`f!otorol aç @rol` - Otorol sistemini aktif eder\n`f!otorol kapat` - Otorol sistemini devre dışı bırakır")
        ]
      });
    }

    if (args[0].toLowerCase() === 'aç') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription("❌ Lütfen bir rol etiketleyin!")
        ]
      });

      await AutoRole.findOneAndUpdate(
        { guildId: message.guild.id },
        { roleId: role.id },
        { upsert: true }
      );

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00ff00)
            .setDescription(`✅ Otorol sistemi aktif edildi! Yeni gelen üyelere **${role.name}** rolü verilecek.`)
        ]
      });
    }

    if (args[0].toLowerCase() === 'kapat') {
      const deleted = await AutoRole.findOneAndDelete({ guildId: message.guild.id });
      
      const embed = new EmbedBuilder()
        .setColor(deleted ? 0x00ff00 : 0xffa500)
        .setDescription(deleted ? 
          "✅ Otorol sistemi devre dışı bırakıldı!" : 
          "ℹ️ Otorol sistemi zaten aktif değil!"
        );
      
      return message.reply({ embeds: [embed] });
    }
  }
});

//ototag

// Mongoose bağlantısı
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('MongoDB bağlantısı başarılı'))
.catch(err => console.error('MongoDB bağlantı hatası:', err));

// Şema tanımı
const autoTagSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  tag: { type: String, required: true }
});
const AutoTag = mongoose.model('AutoTag', autoTagSchema);

client.on('ready', () => {
  console.log(`Bot hazır: ${client.user.tag}`);
  client.user.setActivity('f!yardım', { type: 2 }); // PLAYING = 0, STREAMING = 1, LISTENING = 2, WATCHING = 3
});

client.on('guildMemberAdd', async member => {
  try {
    const settings = await AutoTag.findOne({ guildId: member.guild.id });
    if (settings) {
      await member.setNickname(`${settings.tag} ${member.user.username}`)
        .catch(err => console.error('İsim ayarlanamadı:', err));
    }
  } catch (err) {
    console.error('DB hatası:', err);
  }
});

// Yardım mesajı fonksiyonu
function ototagYardim(message) {
  const embed = new EmbedBuilder()
    .setColor(0x7289DA)
    .setTitle('🔧 Otomatik Tag Sistemi')
    .setDescription('Sunucuya yeni girenlere otomatik tag ekler.')
    .addFields(
      { name: 'Komutlar', value: '**ayarla [tag]** - Otomatik tag ayarlar\n**kapat** - Sistemi kapatır\n**bilgi** - Mevcut ayarları gösterir' },
      { name: 'Örnek', value: '`f!ototag ayarla ✧`\n`f!ototag kapat`' }
    )
    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() });
  
  return message.channel.send({ embeds: [embed] });
}

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const komut = args.shift().toLowerCase();

  // Ototag komutları
  const ototagKomutlari = ['ayarla', 'kapat', 'bilgi'];
  
  if (komut === 'ototag') {
    // Yetki kontrolü (Discord.js v14 için yeni yetki sistemi)
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Yetki Hatası')
            .setDescription('Bu komutu kullanmak için **Kullanıcı Adlarını Yönet** yetkisine sahip olmalısınız!')
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
        ]
      });
    }

    // Alt komut yoksa yardım göster
    if (!args.length) return ototagYardim(message);

    const altKomut = args.shift().toLowerCase();

    if (!ototagKomutlari.includes(altKomut)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('⚠️ Geçersiz Komut')
            .setDescription('Geçersiz alt komut. Kullanım için `f!ototag` yazın.')
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
        ]
      });
    }

    try {
      switch (altKomut) {
        case 'ayarla':
          const tag = args.join(' ');
          if (!tag) {
            return message.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xFFA500)
                  .setTitle('ℹ️ Kullanım')
                  .setDescription('Doğru kullanım: `f!ototag ayarla [tag]`\nÖrnek: `f!ototag ayarla ✧`')
                  .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
              ]
            });
          }

          await AutoTag.findOneAndUpdate(
            { guildId: message.guild.id },
            { tag },
            { upsert: true }
          );

          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Başarılı')
                .setDescription(`Yeni üyelere otomatik **${tag}** tagı eklenecek.`)
                .addFields({ name: 'Örnek', value: `${tag} ${message.author.username}` })
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
            ]
          });

        case 'kapat':
          await AutoTag.findOneAndDelete({ guildId: message.guild.id });
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Başarılı')
                .setDescription('Otomatik tag sistemi kapatıldı.')
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
            ]
          });

        case 'bilgi':
          const settings = await AutoTag.findOne({ guildId: message.guild.id });
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x7289DA)
                .setTitle('ℹ️ Otomatik Tag Bilgisi')
                .setDescription(settings 
                  ? `Aktif tag: **${settings.tag}**\nÖrnek: \`${settings.tag} ${message.author.username}\``
                  : 'Otomatik tag sistemi şu anda kapalı.')
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
            ]
          });
      }
    } catch (error) {
      console.error('Ototag komut hatası:', error);
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Hata')
            .setDescription('Komut işlenirken bir hata oluştu!')
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
        ]
      });
    }
  }
});

//kick

// Mesajları dinleme
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Kick komutu kontrolü
    if (message.content.startsWith('f!kick')) {
        // Yetki kontrolü
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Yetkiniz Yok')
                .setDescription('Bu komutu kullanmak için **Kullanıcıları At** yetkisine sahip olmalısınız.')
                .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() });
            
            return message.reply({ embeds: [embed] });
        }

        const args = message.content.slice('f!kick'.length).trim().split(/ +/);
        const user = message.mentions.users.first();

        // Kullanıcı etiket kontrolü
        if (!user) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Kullanıcı Belirtilmedi')
                .setDescription('Lütfen atılacak kullanıcıyı etiketleyin.\nÖrnek: `f!kick @kullanıcı sebep`')
                .setFooter({ text: message.author.tag });
            
            return message.reply({ embeds: [embed] });
        }

        const member = message.guild.members.cache.get(user.id);

        // Geçerli üye kontrolü
        if (!member) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Kullanıcı Bulunamadı')
                .setDescription('Belirtilen kullanıcı sunucuda bulunamadı.')
                .setFooter({ text: message.author.tag });
            
            return message.reply({ embeds: [embed] });
        }

        // Kendini atma kontrolü
        if (member.id === message.author.id) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Hata')
                .setDescription('Kendini atamazsın!')
                .setFooter({ text: message.author.tag });
            
            return message.reply({ embeds: [embed] });
        }

        // Bot yetki kontrolü
        if (!member.kickable) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Yetki Yetersiz')
                .setDescription('Bu kullanıcıyı atma yetkim yok.')
                .setFooter({ text: message.author.tag });
            
            return message.reply({ embeds: [embed] });
        }

        // Sebep al
        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

        try {
            // Kullanıcıyı at
            await member.kick(reason);

            // Başarı mesajı
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Başarılı')
                .setDescription(`${user.tag} sunucudan atıldı.`)
                .addFields(
                    { name: 'Sebep', value: reason },
                    { name: 'Moderatör', value: message.author.tag }
                )
                .setThumbnail(user.displayAvatarURL())
                .setFooter({ text: `ID: ${user.id}` })
                .setTimestamp();
            
            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Kick hatası:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Hata')
                .setDescription('Kullanıcı atılırken bir hata oluştu.')
                .setFooter({ text: message.author.tag });
            
            message.reply({ embeds: [embed] });
        }
    }
});

//hapishane

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'hapishane') {
    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Lütfen bir kullanıcı etiketle.');

    try {
      // Avatarı al
      const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
      const avatarBuffer = (await axios.get(avatarURL, { responseType: 'arraybuffer' })).data;
      const avatarImage = await loadImage(avatarBuffer);

      // Hapis efektini yükle (500x500 boyutunda şeffaf PNG olmalı)
      const overlayImage = await loadImage(path.join(__dirname, 'hapis.png'));

      // Canvas oluştur
      const canvas = createCanvas(500, 500);
      const ctx = canvas.getContext('2d');

      // Görselleri çiz
      ctx.drawImage(avatarImage, 0, 0, 500, 500);       // Avatarı çiz
      ctx.drawImage(overlayImage, 0, 0, 500, 500);      // Üzerine hapis efekti

      // Görseli hazırla ve gönder
      const buffer = canvas.toBuffer();
      fs.writeFileSync('hapiste.png', buffer);

      await message.channel.send({
        content: `🔒 ${user.username} artık hapiste!`,
        files: ['hapiste.png']
      });

      // Geçici dosyayı sil
      fs.unlinkSync('hapiste.png');

    } catch (err) {
      console.error(err);
      message.reply('❌ Bir hata oluştu.');
    }
  }
});

// Botu Başlat
client.login(process.env.DISCORD_TOKEN);
