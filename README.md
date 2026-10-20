# PinkEarn Frontend (Vite + React) — Telegram Mini App

## Vercel deploy
1. ဒီ folder ကို GitHub repo အသစ်တစ်ခုအဖြစ် push လုပ်ပါ။
2. Vercel → **Add New Project** → repo ရွေးပါ (Framework: Vite အလိုအလျောက်)။
3. Environment Variable တစ်ခုပဲ လိုပါတယ်: `VITE_API_URL` = Render backend URL (ဥပမာ `https://pinkearn-backend.onrender.com`)။
4. Deploy ပြီးရင် Vercel URL ကို Render ရဲ့ `FRONTEND_URL` ထဲထည့်ပါ (CORS + bot button အတွက်)။ ပြီးရင် Render ကို redeploy/restart လုပ်ပါ။
5. BotFather → `/mybots` → Bot Settings → Menu Button (သို့) `/newapp` မှာ Vercel URL ကို သတ်မှတ်နိုင်ပါတယ်။

AdsGram block id စတာတွေကို frontend မှာ မထည့်ရပါ — backend (`ADSGRAM_BLOCK_ID`) ကနေ ယူပါတယ်။

## Local run
`npm install && npm run dev` — Telegram အပြင်မှာ စမ်းချင်ရင် `.env` မှာ `VITE_DEV_USER=111` (backend မှာ `DEV_AUTH=true`)။

Assets: `public/assets/icons/*.svg`, `public/assets/friends-gift-invite.png`, `src/design-tokens.css` (assets pack က ယူထားတာ)။
