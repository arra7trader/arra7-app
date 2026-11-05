# ARRA Cronos

ARRA Cronos is an independent Pine Script v6 indicator for TradingView. It searches for historical OHLCV analogs, uses the three closest sampled paths for the default moving forecast, and overlays an on-chart readout with the setup context and validation metrics. Confirmed-bar BUY/SELL signals are optional.

## Important model distinction

TradingView Pine Script cannot load the Kronos PyTorch checkpoints or run the Hugging Face Kronos model. ARRA Cronos does not contain or reproduce that model. It is an original, self-contained Pine implementation inspired by comparing sequences of financial candles. Do not describe its output as a Kronos prediction, AI probability, or guaranteed win rate.

## What it calculates

- Searches a configurable 3–12 candle pattern in the selected historical window, comparing ATR-normalized bodies and ranges, close location, wick balance, and relative volume.
- Samples candidate paths at least one full pattern-plus-forecast window apart, weights matches by similarity, and rescales forward OHLC paths by each sample's ATR before mapping them to current volatility. This reduces price-scale and past-volatility-regime effects; it does not establish that the forecast will be accurate.
- Works on the symbol and timeframe of the open TradingView chart; ATR-normalized comparisons make it applicable across asset classes, subject to each feed's volume quality and sufficient chart history.
- Adds EMA trend, price momentum, optional candle close-location/relative-volume pressure, and optional confirmed higher-timeframe EMA bias into a directional alignment score.
- Defaults to a weighted path made from the three closest sampled analogs, with each analog's actual historical forward sequence shown as a dashed line. The main forecast can turn with those historical paths instead of being flattened by averaging every match.
- The translucent envelope shows the broader analog basket's dispersion around the three-path forecast. It can widen when the wider sample disagrees; it is descriptive dispersion, not a calibrated confidence interval.
- Offers an alternate projected-OHLC mean view. These shapes summarize averaged historical OHLC values and are not actual future candles.
- Shows BUY/SELL details directly on confirmed signal candles: entry, forecast target and move, a configurable ATR reference stop, illustrative R:R, analog up-share, and walk-forward hit/MAE or the current sample count while the evaluation is still small.
- The stop distance is a user-selected ATR reference for chart planning, not a structurally optimized stop or a backtested trading rule. R:R is arithmetic based on that reference and the forecast target.
- Requires analog direction agreement as well as similarity count, dispersion, directional alignment, and minimum forecast move before printing a signal. Agreement is a historical sample statistic, not a probability.
- Shows a compact live badge beside the latest candle with target, move, horizon, match count, sample up-share, dispersion, higher-timeframe bias, and walk-forward sample status.
- Hides the dashboard table by default. It remains available as an optional display setting.
- Walk-forward metrics evaluate matured BUY/SELL setup forecasts against a no-change baseline. Metrics need enough observations and are not a substitute for evaluating multiple symbols and market regimes.
- Walk-forward hit-rate percentages are withheld until 30 signal forecasts mature; before that, the chart shows the sample count. This is a display threshold, not a guarantee that 30 observations are statistically sufficient.
- Forces the optional EMAs, signal labels, forecast paths or projected candles, live badge, and optional dashboard onto the main price chart. Signals print once when a setup first becomes true.

The volume component estimates candle pressure from candle shape and relative volume. It does not see bid/ask transactions, DOM, or exchange order flow. The score from -100 to +100 is directional confluence, not a probability.

## Add it to TradingView

1. Open a chart in TradingView and open **Pine Editor**.
2. Paste the contents of `ARRA_Cronos.pine` into a new script.
3. Select **Save**, then **Add to chart**.
4. Adjust search history, prediction horizon, similarity threshold, and filters for the symbol and timeframe. The default settings are a starting point, not optimized values.
5. To receive alerts, create an alert from the indicator's **ARRA Cronos BUY** or **ARRA Cronos SELL** condition. Signals are gated to confirmed candle closes.

## Development and validation

TradingView's compiler still needs to be checked in the Pine Editor. Forecast quality is not guaranteed. Compare its walk-forward error and directional hit rate with simple baselines on each symbol and timeframe, then account for spread, commission, and slippage. This indicator is not a strategy backtest and does not place orders or calculate position size.

The script is distributed under the Mozilla Public License 2.0, consistent with the other ARRA Trading Pine indicators in this repository.
