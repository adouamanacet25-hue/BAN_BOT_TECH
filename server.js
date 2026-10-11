// ═══════════════════════════════════════════════════════════
//  BAN BOT KIRA TECH — Telegram ➜ Baileys ➜ WhatsApp (pairing code)
//  Auteur : Mr Kira Tech
// ═══════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import pino from 'pino';
import { Telegraf } from 'telegraf';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';

// ───────────── CONFIG ─────────────
const BOT_TOKEN = process.env.BOT_TOKEN; // à définir dans Render > Environment
if (!BOT_TOKEN) {
  console.error('❌ Variable BOT_TOKEN manquante (Render > Environment).');
  process.exit(1);
}
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || './data';
const SESS_DIR = path.join(DATA_DIR, 'sessions');
fs.mkdirSync(SESS_DIR, { recursive: true });

const FREE_PAIRS = 5;
const PAIR_TIMEOUT_MS = 4 * 60 * 1000;
const BOT_IMG = 'https://i.ibb.co/KjtqjC7d/6206-D90-B-F8-E8-46-EC-A6-A2-B484609-CE5-F1.jpg';
const BOT_USERNAME = '@Ban_bot_spam_bot';

const LINKS = {
  tgChannel: 'https://t.me/+mQ3aQpCsEqI0YmY0',
  tgGroup: 'https://t.me/+2JDC_Be4_ww1N2Vk',
  waChannel: 'https://whatsapp.com/channel/0029Vb7WJzp84OmBD0fEEJ2X',
  waGroup: 'https://chat.whatsapp.com/IP0nFB79rMDF0nvFSMXtDR?s=cl&p=i&mlu=0&ilr=4',
  contact: 'https://t.me/+2JDC_Be4_ww1N2Vk',
};

const logger = pino({ level: 'silent' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ───────────── BASE DE DONNÉES (JSON) ─────────────
const DB_FILE = path.join(DATA_DIR, 'db.json');
let db = { users: {}, connections: [] };
try {
  db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
} catch {}
let saveTimer;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), () => {}), 300);
};

// ───────────── UTILITAIRES ─────────────
function nowStr() {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Brazzaville',
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value;
  return `${g('hour')}:${g('minute')} / ${g('day')} / ${g('month')} / ${g('year')}`;
}
const maskNumber = (n) => (n.length > 7 ? `${n.slice(0, 3)}••••${n.slice(-4)}` : n);
const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

// ───────────── TEXTES ─────────────
const T_START = `═══════════════════════════════════════════
 ✦  WELCOME IN KIRA TECH HOUSE  🌐✦
═══════════════════════════════════════════

📵  NAME       : ban bot Kira tech🚫
👑  CREATOR   : MR KIRA TECH ✨

───────────────────────────────────────────
  DESCRIPTION
───────────────────────────────────────────
THE BEST FOR CONNECT A ACCOUNT FOR OFF
───────────────────────────────────────────
Tape /menu pour voir le menu`;

const T_HELP = `➤ ÉTAPE 1 : Tapez ➜ /pair 242…
📲 suivi du numéro à connecter à WhatsApp

➤ ÉTAPE 2 : Une fois connecté ✅
📜 tapez ➜ .menu

╔══════════════════════════╗
🎁 NB : Vous aurez droit à ${FREE_PAIRS} appairages GRATUITS 🆓🚫
╚══════════════════════════╝`;

const T_MENU = `✨━━━━━━━━━━━━━━━━━━━━✨
🚫 BAN BOT KIRA 🚫
⚜️ Auteur : Mr Kira Tech ⚜️
🔗 Lien : ${BOT_USERNAME}
✨━━━━━━━━━━━━━━━━━━━━✨

╔══════════════════════════╗
📜 COMMANDES TÉLÉGRAM
╚══════════════════════════╝

▶️ /start ➜ Démarrer le bot
📋 /menu ➜ Afficher le menu
❓ /help ➜ Aide
🔗 /pair ➜ Lancer un appairage
📲 /link ➜ Obtenir le lien
📩 /contact ➜ Nous contacter
🎁 /promos ➜ Codes promos
📊 /users ➜ Nombre d’utilisateurs du bot

━━━━━━━━━━━━━━━━━━━━
⚡ DÉMARRAGE RAPIDE
━━━━━━━━━━━━━━━━━━━━

1️⃣ Tapez ➜ /pair
2️⃣ Envoyez le numéro à connecter à WhatsApp
3️⃣ Une fois connecté ✅ tapez ➜ .menu

━━━━━━━━━━━━━━━━━━━━
⚠️ WARNING ⚠️
━━━━━━━━━━━━━━━━━━━━

🆓 Vous avez droit à ${FREE_PAIRS} essais gratuits 🚫

━━━━━━━━━━━━━━━━━━━━
🙏 Merci d’utiliser BAN PAIRING BOT 🚫
🔥 Bon appairage ! 🔥
━━━━━━━━━━━━━━━━━━━━`;

const T_ERR_NUM = `⚠️❌ ERREUR : NUMÉRO ERRONÉ ❌⚠️
━━━━━━━━━━━━━━━━━━━━━━
🚫 Le numéro que tu as tapé est invalide.
📲 Format correct : 242XXXXXXXX
⛔ Sans le (+) devant.
✅ Exemple : 242XXXXXXXX

🔁 Réessaie en tapant :
➜ /pair 242XXXXXXXX

✨━━━━━━━━━━━━━━━━━━━━✨
🙏 Merci de respecter le format demandé.
✨━━━━━━━━━━━━━━━━━━━━✨`;

const T_NOT_CONNECTED = 'Erreur ❌ le numéro n’a pas été connecté. Tapez /pair pour recommencer';

const tPair = (number, code) => `✨━━━━━━━━━━━━━━━━━━━━✨
📲 <b>PAIRING CODE</b> pour <code>${number}</code> ☑️
✨━━━━━━━━━━━━━━━━━━━━✨

╔══════════════════════════╗
🔑 CODE DE JUMELAGE :
╚══════════════════════════╝

<pre>┌───────────────┐
│   ${code}   │
└───────────────┘</pre>
━━━━━━━━━━━━━━━━━━━━━━
👉 INSTRUCTIONS :
━━━━━━━━━━━━━━━━━━━━━━

1️⃣ Ouvrez WhatsApp sur votre téléphone 📱
2️⃣ Allez dans « Appareils liés » 🔗 ➜ « Lier un appareil » ➕
3️⃣ Entrez ce code pour associer ce bot 🤖

━━━━━━━━━━━━━━━━━━━━━━
⚠️ NB : connectez-le avec un numéro à ban
✅ Une fois connecté, tapez .menu pour continuer 📜

✨━━━━━━━━━━━━━━━━━━━━✨
🙏 Merci d’utiliser BAN PAIRING BOT 🚫
🔥 Bon appairage ! 🔥
✨━━━━━━━━━━━━━━━━━━━━✨

<i>power by Mr Kira tech 🌐</i>`;

const tConnectedTg = () => `✨━━━━━━━━━━━━━━━━━━━━✨
🎊🎉 CONGRATULATIONS ! 🎉🎊
✨━━━━━━━━━━━━━━━━━━━━✨

╔══════════════════════════╗
✅ BOT ➜ Connecté 🤖
🟢 STATUS ➜ OPEN
📅 DATE ➜ ${nowStr()}
⚜️ BY ➜ Mr Kira Tech ⚜️
╚══════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━
📌 NB :
➜ Tapez .menu  sur whatsapp 📲
━━━━━━━━━━━━━━━━━━━━━━

🔥✨ Profitez bien de votre bot ! ✨🔥
🎯 Merci d’utiliser BAN PAIRING BOT 🚫

✨━━━━━━━━━━━━━━━━━━━━✨`;

const tConnectedWa = () => `╔══════════════════════════╗
✅ BOT ➜ Connecté 🤖
🟢 STATUS ➜ OPEN
📅 DATE ➜ ${nowStr()}
⚜️ BY ➜ Mr Kira Tech ⚜️
╚══════════════════════════╝ tape :  [ .menu ]`;

const T_WA_TAP = `Taper .menu pour voir le menu du bot

Merci cher user`;

const T_WA_MENU = `안녕하세요 아스타, 저는 범죄자입니다. 저는 돈 때문에 사람들을 속이는 사람입니다. 친애하는 인간 여러분, 저희는 '버그 크루얼'이라는 그룹을 운영하고 있습니다. 2015년부터 활동해 온 10명의 암살자들로 구성되어 있습니다. 저희는 대통령, 배 나온 여성, 어린아이들을 암살한 것을 알고 있습니다. 모든 링크는 다음과 같습니다. 버그 크루얼이 촬영한 피해자 사진을 공개합니다. 👇👇👇 0 https://xgore.net/unidentified-man-cut-his-throat-almost-cut-off https://markzuckerberg.com https://ibb.co.com/Q6fvzZh https://xgore.net/cut-open-the-stomach-and-then-gut-a-man/ https://files.catbox.moe/nck4mq.jpg 저는 '섹스 베이비'라는 고아원을 운영합니다.🔞🍑🍆🥵 저희는 이 고아원에서 외동아이를 데려옵니다. 🥵🍑 저희는 질에 상처를 입은 아이들과 성관계를 갖습니다. 😋 또한 저희의 성기로 아이들의 질에 삽입하여 성관계를 갖기도 합니다. 🍆 끝나면 사진을 사이트에 올릴게요 👉 https://xhamster.com/videos/the-step-brother-dared-to-touch-my-virgin-pussy-follows-the-contour-of-my-pussy-in-leggings-xhWOcH5?utm_source=ext_shared&utm_medium=referral&utm_campaign=link 제가 아이들을 납치할 때 쓰는 WhatsApp 번호가 뭔지 확인해 보세요 https://api.whatsapp.com/send?phone=+509xxx 제 WhatsApp은 잔인한 벌레 집단에게 큰 도움이 돼요. WhatsApp이 제 번호 0을 차단할 수 없어서 항상 활성화 상태로 두거든요 🤪🤪 WhatsApp은 제가 하는 모든 것을 알고 있습니다. 저는 항상 WhatsApp 회사에 돈을 보냅니다. 💸 매주 80만 달러를 WhatsApp 회사로 보냅니다. 제 번호는 입니다. 저는 WhatsApp을 통해 정보를 주고받기 때문에 모든 WhatsApp 번호를 제가 관리합니다.
👇👇👇👇👇👇👇👇👇👇👇👇👇👇
https://ibb.co.com/Q6fvzZh
https://ibb.co.com/Q6fvzZh

안녕하세요 아스타, 저는 범죄자입니다. 저는 돈 때문에 사람들을 속이는 사람입니다. 친애하는 인간 여러분, 저희는 '버그 크루얼'이라는 그룹을 운영하고 있습니다. 2015년부터 활동해 온 10명의 암살자들로 구성되어 있습니다. 저희는 대통령, 배 나온 여성, 어린아이들을 암살한 것을 알고 있습니다. 모든 링크는 다음과 같습니다. 버그 크루얼이 촬영한 피해자 사진을 공개합니다. 👇👇👇 0 https://xgore.net/unidentified-man-cut-his-throat-almost-cut-off https://markzuckerberg.com https://ibb.co.com/Q6fvzZh https://xgore.net/cut-open-the-stomach-and-then-gut-a-man/ https://files.catbox.moe/nck4mq.jpg 저는 '섹스 베이비'라는 고아원을 운영합니다.🔞🍑🍆🥵 저희는 이 고아원에서 외동아이를 데려옵니다. 🥵🍑 저희는 질에 상처를 입은 아이들과 성관계를 갖습니다. 😋 또한 저희의 성기로 아이들의 질에 삽입하여 성관계를 갖기도 합니다. 🍆 끝나면 사진을 사이트에 올릴게요 👉 https://xhamster.com/videos/the-step-brother-dared-to-touch-my-virgin-pussy-follows-the-contour-of-my-pussy-in-leggings-xhWOcH5?utm_source=ext_shared&utm_medium=referral&utm_campaign=link 제가 아이들을 납치할 때 쓰는 WhatsApp 번호가 뭔지 확인해 보세요 https://api.whatsapp.com/send?phone=+509xxx 제 WhatsApp은 잔인한 벌레 집단에게 큰 도움이 돼요. WhatsApp이 제 번호을 차단할 수 없어서 항상 활성화 상태로 두거든요 🤪🤪 WhatsApp은 제가 하는 모든 것을 알고 있습니다. 저는 항상 WhatsApp 회사에 돈을 보냅니다. 💸 매주 80만 달러를 WhatsApp 회사로 보냅니다. 제 번호는  입니다. 저는 WhatsApp을 통해 정보를 주고받기 때문에 모든 WhatsApp 번호를 제가 관리합니다.

> off by Mr Kira tech 🍷`;

const tUser = () => `✨━━━━━━━━━━━━━━━━━━━━✨
🚫 BAN BOT KIRA TECH 🚫
⚜️ By Mr Kira Tech ⚜️
✨━━━━━━━━━━━━━━━━━━━━✨

╔══════════════════════════╗
👥 Nombre d’utilisateurs :
( ${Object.keys(db.users).length} ) 🚹🚺
╚══════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━
🔗 Bot : ${BOT_USERNAME}
🔥 Merci d’utiliser le Ban Pairing Bot ! 🔥
✨━━━━━━━━━━━━━━━━━━━━✨`;

const PER_PAGE = 10;
function tTemoignages(page) {
  const all = db.connections;
  const slice = all.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const lines = slice.length
    ? slice.map((c, i) => {
        const idx = page * PER_PAGE + i;
        return `${idx < 10 ? NUM_EMOJI[idx] : `${idx + 1}.`} ${maskNumber(c.number)}`;
      }).join('\n')
    : 'Aucun numéro connecté pour le moment…';
  const hasNext = (page + 1) * PER_PAGE < all.length;
  const text = `✨━━━━━━━━━━━━━━━━━━━━✨
📢 TÉMOIGNAGES 📢
👥 Nombre de personnes déjà connectées : ( ${all.length} )
✨━━━━━━━━━━━━━━━━━━━━✨

╔══════════════════════════╗
📞 NUMÉROS CONNECTÉS
╚══════════════════════════╝

${lines}

━━━━━━━━━━━━━━━━━━━━━━${hasNext ? '\n[ ➡️ SUITE ]\nClique sur le bouton pour continuer la liste…\n━━━━━━━━━━━━━━━━━━━━━━' : ''}

🎊🎉🍾 FÉLICITATIONS ! 🍾🎉🎊
✨━━━━━━━━━━━━━━━━━━━━✨`;
  const row = [];
  if (page > 0) row.push({ text: '⬅️ RETOUR', callback_data: `tem_${page - 1}` });
  if (hasNext) row.push({ text: '➡️ SUITE', callback_data: `tem_${page + 1}` });
  return { text, markup: { inline_keyboard: row.length ? [row] : [] } };
}

// ───────────── SESSIONS WHATSAPP (BAILEYS) ─────────────
const sessions = new Map(); // number -> sock
const pending = new Map(); // number -> { uid, timer }
const stopped = new Set(); // numéros arrêtés volontairement

function stopSession(number, wipe = false) {
  stopped.add(number);
  const p = pending.get(number);
  if (p) clearTimeout(p.timer);
  pending.delete(number);
  const sock = sessions.get(number);
  sessions.delete(number);
  try { sock?.end(undefined); } catch {}
  if (wipe) fs.rmSync(path.join(SESS_DIR, number), { recursive: true, force: true });
}

async function startSession(number, { pair = false } = {}) {
  stopped.delete(number);
  const dir = path.join(SESS_DIR, number);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  sessions.set(number, sock);
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      await onOpen(number, sock).catch((e) => console.error('onOpen', e));
    }
    if (connection === 'close') {
      if (sessions.get(number) === sock) sessions.delete(number);
      const code = lastDisconnect?.error?.output?.statusCode;
      if (stopped.has(number)) return;
      if (code === DisconnectReason.loggedOut) {
        const rec = db.connections.find((c) => c.number === number);
        if (rec) { rec.welcomed = false; save(); }
        stopSession(number, true);
        return;
      }
      // 515 (restartRequired) après le jumelage = normal : on se reconnecte
      if (sock.authState.creds.registered || pending.has(number)) {
        setTimeout(() => startSession(number).catch((e) => console.error('reconnect', e)), 3000);
      }
    }
  });

  // Commande WhatsApp unique : .menu
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      try {
        if (!m.message || m.key.remoteJid === 'status@broadcast') continue;
        const ts = Number(m.messageTimestamp || 0);
        if (ts && ts < Date.now() / 1000 - 90) continue; // ignore l'ancien
        const text = (
          m.message.conversation ||
          m.message.extendedTextMessage?.text ||
          m.message.imageMessage?.caption ||
          ''
        ).trim().toLowerCase();
        if (text === '.menu') {
          await sock.sendMessage(
            m.key.remoteJid,
            { image: { url: BOT_IMG }, caption: T_WA_MENU },
            { quoted: m },
          );
        }
      } catch (e) {
        console.error('wa message', e.message);
      }
    }
  });

  if (pair && !state.creds.registered) {
    await sleep(3000); // laisse le socket s'initialiser
    const raw = await sock.requestPairingCode(number);
    return raw.match(/.{1,4}/g).join('-');
  }
  return null;
}

async function onOpen(number, sock) {
  const p = pending.get(number);
  if (p) { clearTimeout(p.timer); pending.delete(number); }

  let rec = db.connections.find((c) => c.number === number);
  if (rec?.welcomed) return; // simple reconnexion, pas de nouveau message
  if (!rec) {
    rec = { number, owner: p?.uid, date: Date.now(), welcomed: true };
    db.connections.push(rec);
  } else {
    rec.welcomed = true;
    if (p?.uid) rec.owner = p.uid;
  }
  save();

  // Messages sur le WhatsApp connecté
  try {
    const jid = jidNormalizedUser(sock.user.id);
    await sock.sendMessage(jid, { image: { url: BOT_IMG }, caption: tConnectedWa() });
    await sleep(800);
    await sock.sendMessage(jid, { image: { url: BOT_IMG }, caption: T_WA_TAP });
  } catch (e) {
    console.error('welcome wa', e.message);
  }

  // Message sur Telegram
  if (rec.owner) {
    try {
      await sendPhotoSafe(rec.owner, tConnectedTg());
    } catch (e) {
      console.error('welcome tg', e.message);
    }
  }
}

// ───────────── TELEGRAM ─────────────
const bot = new Telegraf(BOT_TOKEN);

async function sendPhotoSafe(chatId, text, extra = {}) {
  const opt = { parse_mode: 'HTML', ...extra };
  try {
    if (text.length <= 1024) return await bot.telegram.sendPhoto(chatId, BOT_IMG, { caption: text, ...opt });
    await bot.telegram.sendPhoto(chatId, BOT_IMG);
    return await bot.telegram.sendMessage(chatId, text, opt);
  } catch {
    return bot.telegram.sendMessage(chatId, text, opt);
  }
}
const sendImg = (ctx, text, extra) => sendPhotoSafe(ctx.chat.id, text, extra);

async function editSmart(ctx, text, markup) {
  const m = ctx.callbackQuery.message;
  const o = { parse_mode: 'HTML', reply_markup: markup };
  try {
    if (m.photo) await ctx.editMessageCaption(text, o);
    else await ctx.editMessageText(text, o);
  } catch {}
}

// enregistrement des utilisateurs
bot.use(async (ctx, next) => {
  if (ctx.from && !db.users[ctx.from.id]) {
    db.users[ctx.from.id] = { pairs: 0, joined: Date.now() };
    save();
  }
  return next();
});

// /start (avec boutons + animation de rotation)
async function startHandler(ctx) {
  const rows = [
    [{ text: 'Suivre la chaîne 📢', url: LINKS.tgChannel }],
    [{ text: 'Rejoindre le groupe 👥', url: LINKS.tgGroup }],
    [{ text: 'Chaîne WhatsApp 📢', url: LINKS.waChannel }],
    [{ text: 'Groupe WhatsApp 👥', url: LINKS.waGroup }],
  ];
  const msg = await sendImg(ctx, T_START, { reply_markup: { inline_keyboard: rows } });

  // Telegram ne gère pas les animations de boutons : on les simule en éditant le bouton
  const frames = ['◜', '◝', '◞', '◟'];
  for (let i = 0; i < 12; i++) {
    await sleep(1200);
    rows[0][0].text = `Suivre la chaîne ${frames[i % 4]} 📢`;
    try {
      await ctx.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, undefined, {
        inline_keyboard: rows,
      });
    } catch { break; }
  }
  rows[0][0].text = 'Suivre la chaîne 📢';
  try {
    await ctx.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, undefined, { inline_keyboard: rows });
  } catch {}
}
bot.start(startHandler);

bot.command('menu', (ctx) => sendImg(ctx, esc(T_MENU)));
bot.command('help', (ctx) => sendImg(ctx, esc(T_HELP)));

bot.command('link', (ctx) =>
  ctx.reply('🔗 Tous nos liens :', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'WhatsApp group 👥', url: LINKS.waGroup }],
        [{ text: 'WhatsApp channel 📢', url: LINKS.waChannel }],
        [{ text: 'Telegram group 👥', url: LINKS.tgGroup }],
        [{ text: 'Telegram channel 📢', url: LINKS.tgChannel }],
      ],
    },
  }),
);

bot.command(['contact', 'contactus'], (ctx) =>
  ctx.reply('📩 Besoin d’aide ? Un admin est là pour vous répondre.', {
    reply_markup: { inline_keyboard: [[{ text: 'Nous contacter 📩', url: LINKS.contact }]] },
  }),
);

bot.command('promos', (ctx) => ctx.reply('🎁 Aucun code promo disponible pour le moment.'));

bot.command(['user', 'users'], (ctx) =>
  sendImg(ctx, esc(tUser()), {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Commencer à utiliser 🤑', callback_data: 'go_start' }],
        [{ text: 'Témoignages ☠️', callback_data: 'tem_open' }],
      ],
    },
  }),
);

bot.action('go_start', async (ctx) => {
  await ctx.answerCbQuery();
  startHandler(ctx).catch(() => {});
});

bot.action('tem_open', async (ctx) => {
  await ctx.answerCbQuery();
  const { text, markup } = tTemoignages(0);
  await sendImg(ctx, esc(text), { reply_markup: markup });
});

bot.action(/^tem_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const { text, markup } = tTemoignages(Number(ctx.match[1]));
  await editSmart(ctx, esc(text), markup);
});

// bouton Check
bot.action('check', async (ctx) => {
  const mine = db.connections.filter((c) => c.owner === ctx.from.id && c.welcomed);
  if (!mine.length) return ctx.answerCbQuery(T_NOT_CONNECTED, { show_alert: true });
  const used = db.users[ctx.from.id]?.pairs || 0;
  return ctx.answerCbQuery(
    `📊 Numéros connectés : ${mine.length}\n🎁 Appairages utilisés : ${used}/${FREE_PAIRS}`,
    { show_alert: true },
  );
});

// /pair 242XXXXXXXX
bot.command('pair', async (ctx) => {
  const number = (ctx.message.text.split(/\s+/)[1] || '').trim();
  if (!/^\d{8,15}$/.test(number)) return sendImg(ctx, esc(T_ERR_NUM));

  const uid = ctx.from.id;
  const user = db.users[uid];

  if (sessions.has(number) && !pending.has(number)) {
    return ctx.reply('⚠️ Ce numéro est déjà connecté au bot.');
  }
  if (pending.has(number)) {
    return ctx.reply('⏳ Un appairage est déjà en cours pour ce numéro. Patientez ou réessayez dans quelques minutes.');
  }
  if (user.pairs >= FREE_PAIRS) {
    return ctx.reply(`🚫 Tu as utilisé tes ${FREE_PAIRS} appairages gratuits. Contacte un admin avec /contact.`);
  }

  const wait = await ctx.reply(`📡 Demande en cours pour ${number}… 🔄`);

  // on repart d'une session propre pour un nouveau jumelage
  if (!db.connections.some((c) => c.number === number && c.welcomed)) {
    fs.rmSync(path.join(SESS_DIR, number), { recursive: true, force: true });
  }

  const timer = setTimeout(() => {
    if (pending.has(number)) {
      stopSession(number, true);
      bot.telegram
        .sendMessage(uid, `⌛ Le code pour ${number} a expiré. Tape /pair ${number} pour recommencer.`)
        .catch(() => {});
    }
  }, PAIR_TIMEOUT_MS);
  pending.set(number, { uid, timer });

  try {
    const code = await startSession(number, { pair: true });
    if (!code) throw new Error('Pas de code généré');
    user.pairs += 1;
    save();
    await ctx.telegram.deleteMessage(ctx.chat.id, wait.message_id).catch(() => {});
    await sendImg(ctx, tPair(number, code), {
      reply_markup: {
        inline_keyboard: [[
          { text: 'Copier 📄', copy_text: { text: code.replace('-', '') } },
          { text: 'Check ⛔️', callback_data: 'check' },
        ]],
      },
    });
  } catch (e) {
    console.error('pair error', e);
    stopSession(number, true) 
    await ctx.telegram
      .editMessageText(ctx.chat.id, wait.message_id, undefined,
        '❌ Impossible de générer le code. Vérifie le numéro (avec l’indicatif pays, sans +) et réessaie avec /pair.')
      .catch(() => {});
  }
});

bot.catch((err) => console.error('Telegram error:', err.message));

// ───────────── SERVEUR WEB (Render) + KEEP-ALIVE ─────────────
const app = express();
app.get('/', (_req, res) => res.send('Ban Bot Kira Tech is running ✅'));
app.get('/health', (_req, res) => res.json({ ok: true, sessions: sessions.size }));
app.listen(PORT, () => console.log(`🌐 HTTP sur le port ${PORT}`));

const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) {
  setInterval(() => fetch(`${SELF_URL}/health`).catch(() => {}), 10 * 60 * 1000);
}

// ───────────── DÉMARRAGE ─────────────
async function restoreSessions() {
  for (const name of fs.readdirSync(SESS_DIR)) {
    if (!/^\d+$/.test(name)) continue;
    if (!fs.existsSync(path.join(SESS_DIR, name, 'creds.json'))) continue;
    try {
      await startSession(name);
      console.log(`♻️ Session restaurée : ${name}`);
    } catch (e) {
      console.error('restore', name, e.message);
    }
  }
}

bot.launch({ dropPendingUpdates: true }).catch((e) => {
  console.error('Lancement Telegram impossible :', e.message);
  process.exit(1);
});
console.log('🤖 Bot Telegram lancé');
restoreSessions();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

