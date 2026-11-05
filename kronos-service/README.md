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

## Connect PICA

Set `KRONOS_SERVICE_URL` on the PICA web server to this service's private HTTPS URL. Set the same `KRONOS_SERVICE_TOKEN` on both servers. Never expose the model service directly to browsers. `/health` reports the real load state; `/forecast` rejects requests without a matching `X-Service-Token` when a service token is configured.

Set `TURSO_DATABASE_URL` so PICA's account quota can protect forecast usage. For a local preview only, `ARRA_CRONOS_ALLOW_UNMETERED=true` permits inference without the quota database; do not set this on a public production deployment.

The web app obtains OHLCV first from Binance Spot for crypto and Yahoo Finance chart history for other supported symbols, then forwards those real candles for inference. Yahoo futures symbols such as `GC=F`, `CL=F`, and `NQ=F` are futures reference feeds and may not equal a broker's XAUUSD, oil, or Nasdaq CFD quote. FX volume is commonly absent from this feed and is passed to the model as zero. Provider, feed symbol, volume coverage, and freshness are displayed in the app. Kronos is used as a general pretrained model here; it has not been fine-tuned or independently performance-validated on each PICA feed.

Validate each market and timeframe using walk-forward comparisons with naive baselines and realistic transaction costs before presenting performance claims. The supplied pretrained model is not proof of profitable performance on every listed feed.
