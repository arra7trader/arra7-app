# ARRA Cronos inference service

This service runs the original [Kronos](https://github.com/shiyu-coder/Kronos) PyTorch implementation at upstream commit `67b630e67f6a18c9e9be918d9b4337c960db1e9a`. It loads public `NeoQuasar/Kronos-base` weights and matching `NeoQuasar/Kronos-Tokenizer-2k` weights from Hugging Face. No prediction is fabricated when weights or data are unavailable.

The upstream source and its MIT license are included under `model/` and `KRONOS-LICENSE`. The service uses the original predictor, which averages five sampled paths. Output is an experimental OHLCV forecast, not a calibrated probability or trading recommendation.

## Model Variants

| Model ID | Size | Notes |
|---|---|---|
| `NeoQuasar/Kronos-mini` | Smallest | Faster inference, lower accuracy |
| `NeoQuasar/Kronos-base` | **Default** | Balance antara speed dan akurasi |
| `NeoQuasar/Kronos` | Full | Paling akurat, butuh RAM/VRAM lebih besar |

Set `KRONOS_MODEL_ID` di `.env` untuk memilih varian. Default sekarang: **Kronos-base**.

## Run

Use Python 3.10 or newer. Install the PyTorch build suited to the host, then install this service's requirements and start it:

```powershell
cd kronos-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
$env:KRONOS_SERVICE_TOKEN = "replace-with-a-long-random-secret"
uvicorn app:app --host 0.0.0.0 --port 8010
```

The first launch downloads model weights from Hugging Face. A CPU host works but takes longer; CUDA is selected automatically if PyTorch can use it.

For a container host, build `Dockerfile`, set `KRONOS_SERVICE_TOKEN`, and persist `/model-cache` as a volume so later restarts do not fetch the weights again. Keep one worker per model instance; inference is serialized in-process to prevent concurrent CPU/GPU memory spikes.

## Connect PICA

Set `KRONOS_SERVICE_URL` on the PICA web server to this service's private HTTPS URL. Set the same `KRONOS_SERVICE_TOKEN` on both servers. Never expose the model service directly to browsers. `/health` reports the real load state; `/forecast` rejects requests without a matching `X-Service-Token` when a service token is configured.

Set `TURSO_DATABASE_URL` so PICA's account quota can protect forecast usage. For a local preview only, `ARRA_CRONOS_ALLOW_UNMETERED=true` permits inference without the quota database; do not set this on a public production deployment.

## Market Data Source

Market data untuk chart dan candle history sekarang menggunakan **TradingView** sebagai sumber utama untuk realtime data. TradingView Advanced Chart widget digunakan untuk visualisasi chart langsung di halaman ARRA Cronos, sementara OHLCV candle data untuk inference Kronos tetap menggunakan server-side fetch dari Yahoo Finance / Binance sebagai backup ketika TradingView data tidak tersedia.

Validate each market and timeframe using walk-forward comparisons with naive baselines and realistic transaction costs before presenting performance claims. The supplied pretrained model is not proof of profitable performance on every listed feed.
