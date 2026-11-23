import { PlatformTarget } from './types';
import { getTechniqueById } from './catalog';

export interface CompileOptions {
  platform: PlatformTarget;
  techniqueIds: string[];
  customName?: string;
  licenseCode?: string;
}

export function compileIndicator(options: CompileOptions): {
  platform: PlatformTarget;
  code: string;
  filename: string;
  techniqueNames: string[];
} {
  const { platform, techniqueIds, customName = 'PICA Custom Strategy', licenseCode = 'COMMUNITY-USER' } = options;
  
  // Enforce Max 5 Combo
  const validIds = techniqueIds.slice(0, 5);
  const modules = validIds.map(id => getTechniqueById(id)).filter((m): m is NonNullable<typeof m> => !!m);

  if (modules.length === 0) {
    throw new Error('Pilih minimal 1 teknik untuk merakit indikator.');
  }

  const cleanName = customName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'PICA_Custom_Strategy';
  const techniqueNames = modules.map(m => m.name);

  if (platform === 'tradingview') {
    const code = compilePineScriptV5(cleanName, modules, licenseCode);
    const filename = `${cleanName.toLowerCase().replace(/\s+/g, '_')}_tv5.pine`;
    return { platform: 'tradingview', code, filename, techniqueNames };
  } else {
    const code = compileMQL5(cleanName, modules, licenseCode);
    const filename = `${cleanName.toLowerCase().replace(/\s+/g, '_')}_mt5.mq5`;
    return { platform: 'mt5', code, filename, techniqueNames };
  }
}

function compilePineScriptV5(name: string, modules: any[], licenseCode: string): string {
  const inputsBlock = modules.map(m => m.pineInputs).filter(Boolean).join('\n');
  const functionsBlock = modules.map(m => m.pineFunction).filter(Boolean).join('\n');
  const plotCalls = modules.map(m => m.pinePlotting).filter(Boolean).join('\n');
  
  const buyConditions = modules
    .map(m => m.pineConditionBuy)
    .filter(c => c && c !== 'true');
  const sellConditions = modules
    .map(m => m.pineConditionSell)
    .filter(c => c && c !== 'true');

  const buyScoreExpr = buyConditions.length > 0
    ? buyConditions.map(c => `(${c} ? 1 : 0)`).join(' + ')
    : '(close > open ? 1 : 0)';

  const sellScoreExpr = sellConditions.length > 0
    ? sellConditions.map(c => `(${c} ? 1 : 0)`).join(' + ')
    : '(close < open ? 1 : 0)';

  const numModules = Math.max(1, buyConditions.length);
  const recommendedThreshold = Math.max(1, Math.min(2, numModules));

  return `//@version=5
// ==============================================================================
// PICA INDICATOR MAKER — INSTITUTIONAL EDITION
// Indicator Name : ${name}
// Target Platform: TradingView (PineScript v5)
// License Key    : ${licenseCode}
// Techniques     : ${modules.map(m => m.name).join(', ')}
// Guarantee      : Zero-Repaint (Engine Lock at barstate.isconfirmed)
// Built with     : https://pica.my.id/indicator-maker
// ==============================================================================

indicator("${name}", shorttitle="${name.slice(0, 12)}", overlay=true, max_bars_back=500)

// --- SYSTEM INPUTS & SETTINGS ---
show_signals = input.bool(true, "Show BUY / SELL Signal Arrows", group="General Signals")
filter_bars  = input.bool(true, "Enforce Anti-Repaint Confirmed Candle", group="General Signals")
confluence_mode = input.string("Flexible Confluence (Rekomendasi)", "Mode Konfluensi Sinyal", options=["Sensitif (1 Modul Cocok)", "Flexible Confluence (Rekomendasi)", "Strict (Semua Modul Harus Cocok)"], group="Signal Engine")

${inputsBlock}

// --- MODULAR INSTITUTIONAL FUNCTIONS ---
${functionsBlock}

// --- EXECUTE PLOTTING & LOGIC BLOCKS ---
${plotCalls}

// --- COMPOSITE SIGNAL CONFLUENCE ENGINE ---
buy_score = ${buyScoreExpr}
sell_score = ${sellScoreExpr}

total_modules = ${numModules}
req_score = confluence_mode == "Sensitif (1 Modul Cocok)" ? 1 : confluence_mode == "Flexible Confluence (Rekomendasi)" ? ${recommendedThreshold} : total_modules

raw_buy  = buy_score >= req_score
raw_sell = sell_score >= req_score

// Zero-Repaint Trigger Lock
final_buy_signal  = show_signals and raw_buy  and (filter_bars ? barstate.isconfirmed : true)
final_sell_signal = show_signals and raw_sell and (filter_bars ? barstate.isconfirmed : true)

// Avoid repeated sequential signals on same trend
var int last_signal_dir = 0
signal_buy_trigger  = final_buy_signal  and last_signal_dir != 1
signal_sell_trigger = final_sell_signal and last_signal_dir != -1

if signal_buy_trigger
    last_signal_dir := 1
if signal_sell_trigger
    last_signal_dir := -1

// --- VISUAL ON-CHART SIGNALS ---
plotshape(signal_buy_trigger, title="INSTITUTIONAL BUY", style=shape.labelup, location=location.belowbar, color=color.rgb(16, 185, 129), text="BUY", textcolor=color.white, size=size.normal)
plotshape(signal_sell_trigger, title="INSTITUTIONAL SELL", style=shape.labeldown, location=location.abovebar, color=color.rgb(239, 68, 68), text="SELL", textcolor=color.white, size=size.normal)

// Background & Bar Color Highlights
bgcolor(signal_buy_trigger ? color.rgb(16, 185, 129, 85) : signal_sell_trigger ? color.rgb(239, 68, 68, 85) : na, title="Signal Bar Tint")
barcolor(signal_buy_trigger ? color.rgb(16, 185, 129) : signal_sell_trigger ? color.rgb(239, 68, 68) : na)

// --- ON-CHART TELEMETRY HUD TABLE ---
show_hud = input.bool(true, "Show On-Chart HUD Table", group="Visual Dashboard")
var table hud = table.new(position.top_right, 2, 4, bgcolor=color.rgb(15, 23, 42, 15), border_color=color.rgb(51, 65, 85, 30), border_width=1)

if barstate.islast and show_hud
    table.cell(hud, 0, 0, "PICA SYSTEM", bgcolor=color.rgb(30, 41, 59), text_color=color.white, text_size=size.small)
    table.cell(hud, 1, 0, "${name.slice(0, 16)}", bgcolor=color.rgb(30, 41, 59), text_color=color.rgb(56, 189, 248), text_size=size.small)
    table.cell(hud, 0, 1, "Status Engine", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 1, "READY (Pine v5)", text_color=color.rgb(16, 185, 129), text_size=size.small)
    table.cell(hud, 0, 2, "Confluence Score", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 2, str.tostring(buy_score) + " Buy / " + str.tostring(sell_score) + " Sell", text_color=buy_score > sell_score ? color.rgb(16, 185, 129) : sell_score > buy_score ? color.rgb(239, 68, 68) : color.gray, text_size=size.small)
    table.cell(hud, 0, 3, "Mode Sinyal", text_color=color.gray, text_size=size.small)
    table.cell(hud, 1, 3, confluence_mode, text_color=color.white, text_size=size.small)

// --- NATIVE ALERTS ---
alertcondition(signal_buy_trigger, title="[PICA BUY ALERT]", message="PICA AI System: BUY Trigger on {{ticker}} @ {{close}}")
alertcondition(signal_sell_trigger, title="[PICA SELL ALERT]", message="PICA AI System: SELL Trigger on {{ticker}} @ {{close}}")
`;
}

function compileMQL5(name: string, modules: any[], licenseCode: string): string {
  const inputsBlock = modules.map(m => m.mq5Inputs).filter(Boolean).join('\n');
  const functionsBlock = modules.map(m => m.mq5Function).filter(Boolean).join('\n');
  const plotCalls = modules.map(m => m.mq5Plotting).filter(Boolean).join('\n');

  const buyConditions = modules
    .map(m => m.mq5ConditionBuy)
    .filter(c => c && c !== 'true');
  const sellConditions = modules
    .map(m => m.mq5ConditionSell)
    .filter(c => c && c !== 'true');

  const buyScoreCalc = buyConditions.length > 0
    ? buyConditions.map(c => `      if (${c}) b_score++;`).join('\n')
    : '      if (Close[i] > Open[i]) b_score++;';

  const sellScoreCalc = sellConditions.length > 0
    ? sellConditions.map(c => `      if (${c}) s_score++;`).join('\n')
    : '      if (Close[i] < Open[i]) s_score++;';

  const numModules = Math.max(1, buyConditions.length);
  const recommendedThreshold = Math.max(1, Math.min(2, numModules));

  return `//+------------------------------------------------------------------+
//|                                     ${name}.mq5 |
//|                     PICA INDICATOR MAKER — MT5 EDITION           |
//|                          https://pica.my.id/indicator-maker      |
//+------------------------------------------------------------------+
#property copyright   "PICA AI Quantitative Platform & ARRA AI"
#property link        "https://pica.my.id/indicator-maker"
#property version     "1.00"
#property description "Custom Indicator generated by PICA INDICATOR MAKER"
#property description "License: ${licenseCode}"
#property indicator_chart_window
#property indicator_buffers 2
#property indicator_plots   2

//--- Plot Buy Arrow
#property indicator_label1  "PICA Buy Signal"
#property indicator_type1   DRAW_ARROW
#property indicator_color1  clrLimeGreen
#property indicator_style1  STYLE_SOLID
#property indicator_width1  2

//--- Plot Sell Arrow
#property indicator_label2  "PICA Sell Signal"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrCrimson
#property indicator_style2  STYLE_SOLID
#property indicator_width2  2

//--- Input Parameters
input group "=== GENERAL SETTINGS ===";
input bool InpShowSignals = true; // Show Buy & Sell Arrows
input bool InpSendAlerts   = true; // Enable Popup & Sound Alerts
input int  InpConfluenceMode = 1;  // Signal Mode: 0=Sensitive(1 Mod), 1=Flexible(Confluence), 2=Strict(All)

${inputsBlock}

//--- Indicator Buffers
double BufferBuy[];
double BufferSell[];

${functionsBlock}

//+------------------------------------------------------------------+
//| Custom indicator initialization function                         |
//+------------------------------------------------------------------+
int OnInit()
  {
   SetIndexBuffer(0, BufferBuy, INDICATOR_DATA);
   SetIndexBuffer(1, BufferSell, INDICATOR_DATA);
   
   PlotIndexSetInteger(0, PLOT_ARROW, 233); // Up Arrow Wingdings
   PlotIndexSetInteger(1, PLOT_ARROW, 234); // Down Arrow Wingdings
   
   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, 0.0);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, 0.0);
   
   IndicatorSetString(INDICATOR_SHORTNAME, "${name}");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Custom indicator iteration function                              |
//+------------------------------------------------------------------+
#define open Open
#define high High
#define low Low
#define close Close

int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &Open[],
                const double &High[],
                const double &Low[],
                const double &Close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
  {
   if(rates_total < 30) return(0);

   int limit = rates_total - prev_calculated;
   if(prev_calculated > 0) limit++;

   int total_modules = ${numModules};
   int req_score = (InpConfluenceMode == 0) ? 1 : (InpConfluenceMode == 1) ? ${recommendedThreshold} : total_modules;

   // Loop over candles in historical order
   for(int i = limit - 1; i >= 1; i--)
     {
      BufferBuy[i] = 0.0;
      BufferSell[i] = 0.0;

      if(!InpShowSignals) continue;

      int b_score = 0;
      int s_score = 0;
${buyScoreCalc}
${sellScoreCalc}

      bool condBuy  = (b_score >= req_score);
      bool condSell = (s_score >= req_score);

      if(condBuy)
        {
         BufferBuy[i] = Low[i] - (High[i] - Low[i]) * 0.3;
         if(i == 1 && InpSendAlerts)
           {
            Alert(StringFormat("[PICA BUY] %s %s @ %.5f", _Symbol, EnumToString(_Period), Close[i]));
           }
        }
      else if(condSell)
        {
         BufferSell[i] = High[i] + (High[i] - Low[i]) * 0.3;
         if(i == 1 && InpSendAlerts)
           {
            Alert(StringFormat("[PICA SELL] %s %s @ %.5f", _Symbol, EnumToString(_Period), Close[i]));
           }
        }
     }

   return(rates_total);
  }
`;
}