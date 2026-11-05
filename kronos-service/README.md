---
title: ARRA Cronos Inference API
emoji: 📈
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8010
pinned: false
---

# ARRA Cronos inference service

This service runs the original [Kronos](https://github.com/shiyu-coder/Kronos) PyTorch implementation at upstream commit `67b630e67f6a18c9e9be918d9b4337c960db1e9a`. It loads public `NeoQuasar/Kronos-mini` weights at revision `f4e68697d9d5aed55cef5c96aabc3376bcad9f81` and matching `NeoQuasar/Kronos-Tokenizer-2k` weights at revision `26966d0035065a0cae0ebad7af8ece35bc1fb51c` from Hugging Face. No prediction is fabricated when weights or data are unavailable.

The upstream source and its MIT license are included under `model/` and `KRONOS-LICENSE`. The service uses the original predictor, which averages five sampled paths. Output is an experimental OHLCV forecast, not a calibrated probability or trading recommendation.

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

Hugging Face deployment is not configured for this account: creating a Docker Space returned HTTP 402 because free CPU-Basic Docker Spaces require a PRO subscription. Do not reuse the existing ARRA bot Space for this service. Choose an authorized host with enough memory for PyTorch and provide its deployment credentials before connecting the public web app. Sleeping CPU hosts are suitable only for previews; use an always-on host with persistent model storage before offering a production service-level guarantee.

## Connect PICA

Set `KRONOS_SERVICE_URL` on the PICA web server to this service's private HTTPS URL. Set the same `KRONOS_SERVICE_TOKEN` on both servers. Never expose the model service directly to browsers. `/health` reports the real load state; `/forecast` rejects requests without a matching `X-Service-Token` when a service token is configured.

Set `TURSO_DATABASE_URL` so PICA's account quota can protect forecast usage. For a local preview only, `ARRA_CRONOS_ALLOW_UNMETERED=true` permits inference without the quota database; do not set this on a public production deployment.

The web app obtains OHLCV first from Binance Spot for crypto and Yahoo Finance chart history for other supported symbols, then forwards those real candles for inference. Yahoo futures symbols such as `GC=F`, `CL=F`, and `NQ=F` are futures reference feeds and may not equal a broker's XAUUSD, oil, or Nasdaq CFD quote. FX volume is commonly absent from this feed and is passed to the model as zero. Provider, feed symbol, volume coverage, and freshness are displayed in the app. Kronos is used as a general pretrained model here; it has not been fine-tuned or independently performance-validated on each PICA feed.

## Walk-forward diagnostic

With the service dependencies installed and the Kronos weights cached, run a repeatable 1-hour diagnostic against the live providers:

```powershell
$env:KRONOS_SERVICE_TOKEN = "local-validation-only-token"
python evaluate_walkforward.py --origins 32 --output validation/walk-forward.json
```

The script uses actual future candle timestamps, fixed model sampling seeds, a 12-bar horizon, and a 512-bar lookback where available. It compares terminal-close absolute error and direction against a persistence baseline (the last observed close). The included `validation/walk-forward-2026-11-05.json` is a 32-origin smoke sample, not a robust strategy backtest. Repeat on multiple timeframes and longer date ranges, then account for spreads, slippage, funding, and execution before making any performance claim.

The pretrained model is not proof of profitable performance on every listed feed. Do not market its direction as a calibrated probability. Yahoo futures symbols such as `GC=F`, `CL=F`, and `NQ=F` are reference feeds and may not equal a broker's XAUUSD, oil, or Nasdaq CFD quote.

### Initial 32-origin sample (2026-11-05)

The included diagnostic used 512 prior bars, a 12-hour horizon, and 32 walk-forward origins per market. Negative improvement means the model's mean terminal absolute error was worse than persistence. This is a small smoke sample with no spread, slippage, swap, or funding costs:

| Market feed | Model error | Persistence error | Direction accuracy | Error improvement |
| --- | ---: | ---: | ---: | ---: |
| BTCUSDT spot | 0.9786% | 0.9463% | 75.0% | -3.41% |
| EURUSD=X | 0.2336% | 0.2008% | 40.6% | -16.31% |
| GBPUSD=X | 0.2042% | 0.2075% | 53.1% | +1.57% |
| NQ=F futures reference | 0.6329% | 0.5745% | 62.5% | -10.17% |
| GC=F futures reference | 0.7621% | 0.6630% | 59.4% | -14.94% |
| CL=F futures reference | 1.5559% | 1.4805% | 46.9% | -5.09% |

Only GBPUSD marginally beat persistence on this sample. These figures are not stable accuracy estimates and do not justify an accuracy or profitability claim.
