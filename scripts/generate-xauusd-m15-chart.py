import os
import sys
import json
import requests
import pandas as pd
import mplfinance as mpf
from pathlib import Path

# Paths & Directories
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
CHART_PATH = ROOT_DIR / "ready-to-share" / "xauusd_m15_latest.png"
CHART_PATH.parent.mkdir(parents=True, exist_ok=True)

# Load environment from .env.local
def load_env():
    env_file = ROOT_DIR / ".env.local"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip().strip('"').strip("'")

load_env()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "@arrareborn7")
GROQ_KEYS = [
    k for k in [
        os.getenv("GROQ_API_KEY", ""),
        os.getenv("GROQ_API_KEY_6", os.getenv("GROQ_API_KEY_2", ""))
    ] if k
]

def fetch_m15_data():
    url = "https://query2.finance.yahoo.com/v8/finance/chart/GC=F?interval=15m&range=2d"
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    data = r.json()

    res = data["chart"]["result"][0]
    timestamps = res["timestamp"]
    quote = res["indicators"]["quote"][0]

    df = pd.DataFrame({
        "Open": quote["open"],
        "High": quote["high"],
        "Low": quote["low"],
        "Close": quote["close"],
        "Volume": quote["volume"]
    }, index=pd.to_datetime(timestamps, unit="s"))

    df = df.dropna().tail(50)
    return df

def generate_chart(df):
    current_price = float(df["Close"].iloc[-1])
    bsl = float(df["High"].max())
    ssl = float(df["Low"].min())

    mc = mpf.make_marketcolors(
        up="#089981", down="#f23645",
        edge="inherit", wick="inherit", volume="in"
    )
    style = mpf.make_mpf_style(
        base_mpf_style="nightclouds",
        marketcolors=mc,
        facecolor="#131722",
        edgecolor="#2a2e39",
        figcolor="#0b0e14",
        gridcolor="#1e222d",
        gridstyle=":"
    )

    hlines = dict(
        hlines=[bsl, ssl, current_price],
        colors=["#f23645", "#089981", "#f59e0b"],
        linestyle=["--", "--", ":"],
        linewidths=[1.5, 1.5, 1.2]
    )

    fig, axes = mpf.plot(
        df,
        type="candle",
        style=style,
        mav=(20, 50),
        hlines=hlines,
        title=f"\nARRA REBORN | XAU/USD M15 MAPPING (Live: ${current_price:.2f})",
        volume=False,
        returnfig=True,
        figsize=(10, 5.5)
    )

    ax = axes[0]
    ax.text(2, bsl, f" BSL (High Liquidity): ${bsl:.2f}", color="#f23645", fontsize=9, fontweight="bold", va="bottom")
    ax.text(2, ssl, f" SSL (Low Liquidity): ${ssl:.2f}", color="#089981", fontsize=9, fontweight="bold", va="top")
    ax.text(len(df) - 1, current_price, f"  Current: ${current_price:.2f}", color="#f59e0b", fontsize=9, fontweight="bold", va="center")

    fig.savefig(str(CHART_PATH), dpi=100, bbox_inches="tight")
    return current_price, bsl, ssl

def generate_ai_caption(current_price, bsl, ssl):
    prompt = f"""
Anda adalah Senior Technical Analyst ARRA REBORN spesialis Smart Money Concepts (SMC) & ICT untuk XAU/USD (Gold).
Data candlestick M15 terlampir di chart:
- Running Price: ${current_price:.2f}
- BSL (Buy-Side Liquidity / 24h High): ${bsl:.2f}
- SSL (Sell-Side Liquidity / 24h Low): ${ssl:.2f}

Buatkan caption analisis M15 padat, tajam, dan siap baca untuk caption gambar Telegram:
Format:
🟡 *ARRA REBORN | XAU/USD M15 CHART MAPPING*

📊 *Timeframe:* M15 (Gold Spot)
🎯 *Market Bias:* [Tentukan bias berdasarkan posisi running price terhadap BSL/SSL]

📍 *Key Levels on Chart:*
• *BSL (Resistance/High):* ${bsl:.2f}
• *SSL (Support/Low):* ${ssl:.2f}
• *Running Price:* ${current_price:.2f}

⚡ *Trading Plan M15:*
1. *Setup Reversal (Buy):* [Level trigger, konfirmasi, target]
2. *Setup Breakdown/Continuation (Sell):* [Level trigger, target]

---
💎 *Konsultasi Posisi & Hitung Margin Real-time bersama HERMES AI:*
👉 [pica.my.id/hermes-mentor](https://pica.my.id/hermes-mentor)
🏷️ *Hanya Rp 49.000 — Akses Lifetime!*

📢 @arrareborn7 | 👤 @arra7trader
PENTING: Jaga total panjang teks di bawah 950 karakter agar pas sebagai caption Telegram!
"""

    for key in GROQ_KEYS:
        try:
            res = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "qwen/qwen3.8-27b",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 450,
                    "temperature": 0.6
                },
                timeout=15
            )
            data = res.json()
            if res.ok and "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            continue

    # Fallback caption if AI call fails
    return f"""🟡 *ARRA REBORN | XAU/USD M15 CHART MAPPING*

📊 *Timeframe:* M15 (Gold Spot)
🎯 *Structure:* Testing Key Liquidity Zones

📍 *Key Levels on Chart:*
• *BSL (Buy-Side Liquidity / High):* ${bsl:.2f}
• *SSL (Sell-Side Liquidity / Low):* ${ssl:.2f}
• *Running Price:* ${current_price:.2f}

⚡ *Trading Plan M15:*
1. *Reversal (Buy):* Rejection wick di area SSL ${ssl:.2f}, SL 5 pips, Target BSL ${bsl:.2f}
2. *Breakdown (Sell):* Solid close M15 di bawah SSL, ikuti momentum volume

---
💎 *Hitung Lot & Validasi Posisi Gold 24/7 bersama HERMES AI:*
👉 [pica.my.id/hermes-mentor](https://pica.my.id/hermes-mentor)
🏷️ *Rp 49.000 — Lifetime Access!*

📢 @arrareborn7 | 👤 @arra7trader"""

def send_telegram_photo(caption):
    with open(CHART_PATH, "rb") as f:
        r = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto",
            data={
                "chat_id": CHANNEL_ID,
                "caption": caption,
                "parse_mode": "Markdown"
            },
            files={"photo": f},
            timeout=20
        )
    return r.json()

def main():
    print("[XAUUSD M15 Chart Engine] Fetching M15 data...")
    df = fetch_m15_data()
    print("[XAUUSD M15 Chart Engine] Generating chart image...")
    current_price, bsl, ssl = generate_chart(df)
    print(f"[XAUUSD M15 Chart Engine] Chart saved to {CHART_PATH} (Price: ${current_price:.2f})")
    
    print("[XAUUSD M15 Chart Engine] Generating AI analysis caption...")
    caption = generate_ai_caption(current_price, bsl, ssl)
    
    print("[XAUUSD M15 Chart Engine] Posting chart to Telegram @arrareborn7...")
    res = send_telegram_photo(caption)
    if res.get("ok"):
        print(f"[XAUUSD M15 Chart Engine] SUCCESS! Message ID: {res['result']['message_id']}")
    else:
        print(f"[XAUUSD M15 Chart Engine] Telegram FAILED: {res}")

if __name__ == "__main__":
    main()
