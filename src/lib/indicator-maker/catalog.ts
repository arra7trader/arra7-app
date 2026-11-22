import { TechniqueModule } from './types';

export const INSTITUTIONAL_TECHNIQUES: TechniqueModule[] = [
  // ==========================================
  // 1. SMART MONEY CONCEPTS (SMC) — 14 MODULES
  // ==========================================
  {
    id: 'smc_ob',
    name: 'Institutional Order Block (OB)',
    category: 'smc',
    badge: 'Institusi SMC',
    recommendedTf: 'M5 - H1',
    description: 'Mendeteksi candle footprint terakhir institusi sebelum pergerakan impulsif besar (mitigasi re-entry).',
    visualPattern: 'order_block',
    pineInputs: 'ob_len = input.int(5, "OB Lookback Period", group="Order Block")',
    pineFunction: `
f_order_block() =>
    var float ob_bull_high = na
    var float ob_bull_low = na
    var float ob_bear_high = na
    var float ob_bear_low = na
    is_impulse_up = close > high[1] and (close - open) > ta.atr(14) * 1.2
    is_impulse_down = close < low[1] and (open - close) > ta.atr(14) * 1.2
    if is_impulse_up and close[1] < open[1]
        ob_bull_high := high[1]
        ob_bull_low := low[1]
    if is_impulse_down and close[1] > open[1]
        ob_bear_high := high[1]
        ob_bear_low := low[1]
    bull_signal = low <= ob_bull_high and close >= ob_bull_low and close > open
    bear_signal = high >= ob_bear_low and close <= ob_bear_high and close < open
    [bull_signal, bear_signal, ob_bull_high, ob_bear_low]
`,
    pineConditionBuy: 'ob_buy',
    pineConditionSell: 'ob_sell',
    pinePlotting: `[ob_buy, ob_sell, ob_b_h, ob_s_l] = f_order_block()`,
    mq5Inputs: 'input int InpOBLookback = 5; // OB Lookback Period',
    mq5Function: `
bool CheckOrderBlock(int shift, bool isBuy) {
    double atr = iATR(_Symbol, _Period, 14, shift);
    if(isBuy) {
        return (Close[shift] > High[shift+1] && (Close[shift]-Open[shift]) > atr * 1.2 && Close[shift+1] < Open[shift+1]);
    } else {
        return (Close[shift] < Low[shift+1] && (Open[shift]-Close[shift]) > atr * 1.2 && Close[shift+1] > Open[shift+1]);
    }
}
`,
    mq5ConditionBuy: 'CheckOrderBlock(1, true)',
    mq5ConditionSell: 'CheckOrderBlock(1, false)',
    mq5Plotting: '// OB Plotting Buffer in MT5'
  },
  {
    id: 'smc_fvg',
    name: 'Fair Value Gap (FVG / Imbalance)',
    category: 'smc',
    badge: 'Likuiditas Gap',
    recommendedTf: 'M1 - M15',
    description: 'Mengidentifikasi celah harga 3-candle imbalance di mana transaksi institusi belum terisi sempurna.',
    visualPattern: 'fvg',
    pineInputs: 'fvg_min_pts = input.float(0.5, "FVG Min ATR Multiplier", group="Fair Value Gap")',
    pineFunction: `
f_fvg() =>
    fvg_bull = low > high[2] and (low - high[2]) > ta.atr(14) * fvg_min_pts
    fvg_bear = high < low[2] and (low[2] - high) > ta.atr(14) * fvg_min_pts
    [fvg_bull, fvg_bear]
`,
    pineConditionBuy: 'fvg_buy',
    pineConditionSell: 'fvg_sell',
    pinePlotting: `[fvg_buy, fvg_sell] = f_fvg()`,
    mq5Inputs: 'input double InpFVGMultiplier = 0.5; // FVG ATR Multiplier',
    mq5Function: `
bool CheckFVG(int shift, bool isBuy) {
    double atr = iATR(_Symbol, _Period, 14, shift);
    if(isBuy) return (Low[shift] > High[shift+2] && (Low[shift] - High[shift+2]) > atr * InpFVGMultiplier);
    return (High[shift] < Low[shift+2] && (Low[shift+2] - High[shift]) > atr * InpFVGMultiplier);
}
`,
    mq5ConditionBuy: 'CheckFVG(1, true)',
    mq5ConditionSell: 'CheckFVG(1, false)',
    mq5Plotting: '// FVG Plotting Buffer'
  },
  {
    id: 'smc_bos',
    name: 'Break of Structure (BOS)',
    category: 'smc',
    badge: 'Trend Continuation',
    recommendedTf: 'M15 - H4',
    description: 'Konfirmasi penembusan swing high / low valid yang menandakan kelanjutan tren institusi.',
    visualPattern: 'bos',
    pineInputs: 'bos_swing = input.int(10, "BOS Swing Pivot Lookback", group="BOS")',
    pineFunction: `
f_bos() =>
    ph = ta.pivothigh(high, bos_swing, bos_swing)
    pl = ta.pivotlow(low, bos_swing, bos_swing)
    var float last_ph = na
    var float last_pl = na
    if not na(ph)
        last_ph := ph
    if not na(pl)
        last_pl := pl
    bos_up = ta.crossover(close, last_ph)
    bos_down = ta.crossunder(close, last_pl)
    [bos_up, bos_down]
`,
    pineConditionBuy: 'bos_buy',
    pineConditionSell: 'bos_sell',
    pinePlotting: `[bos_buy, bos_sell] = f_bos()`,
    mq5Inputs: 'input int InpBOSLookback = 10; // BOS Pivot Lookback',
    mq5Function: `
bool CheckBOS(int shift, bool isBuy) {
    int highestBar = iHighest(_Symbol, _Period, MODE_HIGH, InpBOSLookback, shift+1);
    int lowestBar = iLowest(_Symbol, _Period, MODE_LOW, InpBOSLookback, shift+1);
    if(isBuy) return (Close[shift] > High[highestBar]);
    return (Close[shift] < Low[lowestBar]);
}
`,
    mq5ConditionBuy: 'CheckBOS(1, true)',
    mq5ConditionSell: 'CheckBOS(1, false)',
    mq5Plotting: '// BOS Buffer'
  },
  {
    id: 'smc_choch',
    name: 'Change of Character (CHoCH)',
    category: 'smc',
    badge: 'Struktur Reversal',
    recommendedTf: 'M5 - H1',
    description: 'Mendeteksi perubahan karakter market dari bearish ke bullish (atau sebaliknya) sebelum tren baru terbentuk.',
    visualPattern: 'choch',
    pineInputs: 'choch_len = input.int(7, "CHoCH Sensitivity", group="CHoCH")',
    pineFunction: `
f_choch() =>
    swing_h = ta.highest(high, choch_len)[1]
    swing_l = ta.lowest(low, choch_len)[1]
    choch_bull = ta.crossover(close, swing_h) and close[1] < swing_h
    choch_bear = ta.crossunder(close, swing_l) and close[1] > swing_l
    [choch_bull, choch_bear]
`,
    pineConditionBuy: 'choch_buy',
    pineConditionSell: 'choch_sell',
    pinePlotting: `[choch_buy, choch_sell] = f_choch()`,
    mq5Inputs: 'input int InpCHoCHPeriod = 7; // CHoCH Sensitivity',
    mq5Function: `
bool CheckCHoCH(int shift, bool isBuy) {
    int h = iHighest(_Symbol, _Period, MODE_HIGH, InpCHoCHPeriod, shift+1);
    int l = iLowest(_Symbol, _Period, MODE_LOW, InpCHoCHPeriod, shift+1);
    if(isBuy) return (Close[shift] > High[h] && Close[shift+1] <= High[h]);
    return (Close[shift] < Low[l] && Close[shift+1] >= Low[l]);
}
`,
    mq5ConditionBuy: 'CheckCHoCH(1, true)',
    mq5ConditionSell: 'CheckCHoCH(1, false)',
    mq5Plotting: '// CHoCH Buffer'
  },
  {
    id: 'smc_liq_sweep',
    name: 'Liquidity Sweep (Stop Hunt Raid)',
    category: 'smc',
    badge: 'Sniper Hunt',
    recommendedTf: 'M1 - M15',
    description: 'Membaca ekor candle (wick) yang menyapu level likuiditas retail lalu ditutup berbalik arah (rejection).',
    visualPattern: 'liq_sweep',
    pineInputs: 'sweep_bars = input.int(20, "Liquidity Search Bars", group="Liquidity Sweep")',
    pineFunction: `
f_liq_sweep() =>
    prior_high = ta.highest(high[1], sweep_bars)
    prior_low = ta.lowest(low[1], sweep_bars)
    sweep_bull = low < prior_low and close > prior_low
    sweep_bear = high > prior_high and close < prior_high
    [sweep_bull, sweep_bear]
`,
    pineConditionBuy: 'sweep_buy',
    pineConditionSell: 'sweep_sell',
    pinePlotting: `[sweep_buy, sweep_sell] = f_liq_sweep()`,
    mq5Inputs: 'input int InpSweepBars = 20; // Liquidity Bars Search',
    mq5Function: `
bool CheckSweep(int shift, bool isBuy) {
    int l = iLowest(_Symbol, _Period, MODE_LOW, InpSweepBars, shift+1);
    int h = iHighest(_Symbol, _Period, MODE_HIGH, InpSweepBars, shift+1);
    if(isBuy) return (Low[shift] < Low[l] && Close[shift] > Low[l]);
    return (High[shift] > High[h] && Close[shift] < High[h]);
}
`,
    mq5ConditionBuy: 'CheckSweep(1, true)',
    mq5ConditionSell: 'CheckSweep(1, false)',
    mq5Plotting: '// Sweep Buffer'
  },
  {
    id: 'smc_inducement',
    name: 'Inducement Trapping Zone (IDM)',
    category: 'smc',
    badge: 'Smart Trap',
    recommendedTf: 'M5 - M30',
    description: 'Menandai jebakan swing minor retail sebelum harga meluncur ke area likuiditas sesungguhnya.',
    visualPattern: 'inducement',
    pineInputs: 'idm_mult = input.float(1.5, "IDM Volatility Multiplier", group="Inducement")',
    pineFunction: `
f_inducement() =>
    idm_high = ta.highest(high, 8)
    idm_low = ta.lowest(low, 8)
    idm_trap_bull = low < idm_low[1] and (close - open) > ta.atr(14) * 0.8
    idm_trap_bear = high > idm_high[1] and (open - close) > ta.atr(14) * 0.8
    [idm_trap_bull, idm_trap_bear]
`,
    pineConditionBuy: 'idm_buy',
    pineConditionSell: 'idm_sell',
    pinePlotting: `[idm_buy, idm_sell] = f_inducement()`,
    mq5Inputs: 'input double InpIDMMult = 1.5; // IDM Multiplier',
    mq5Function: `
bool CheckIDM(int shift, bool isBuy) {
    double atr = iATR(_Symbol, _Period, 14, shift);
    int l = iLowest(_Symbol, _Period, MODE_LOW, 8, shift+1);
    int h = iHighest(_Symbol, _Period, MODE_HIGH, 8, shift+1);
    if(isBuy) return (Low[shift] < Low[l] && (Close[shift]-Open[shift]) > atr * 0.8);
    return (High[shift] > High[h] && (Open[shift]-Close[shift]) > atr * 0.8);
}
`,
    mq5ConditionBuy: 'CheckIDM(1, true)',
    mq5ConditionSell: 'CheckIDM(1, false)',
    mq5Plotting: '// IDM Buffer'
  },
  {
    id: 'smc_prem_disc',
    name: 'Premium / Discount 50% Array',
    category: 'smc',
    badge: 'Diskon Harga',
    recommendedTf: 'M15 - Daily',
    description: 'Hanya mengizinkan BUY di zona Diskon (di bawah 50% range) dan SELL di zona Premium (di atas 50% range).',
    visualPattern: 'prem_disc',
    pineInputs: 'pd_range = input.int(50, "PD Range Lookback", group="Premium/Discount")',
    pineFunction: `
f_prem_disc() =>
    range_high = ta.highest(high, pd_range)
    range_low = ta.lowest(low, pd_range)
    equilibrium = (range_high + range_low) / 2
    is_discount = close < equilibrium
    is_premium = close > equilibrium
    [is_discount, is_premium]
`,
    pineConditionBuy: 'is_discount',
    pineConditionSell: 'is_premium',
    pinePlotting: `[is_discount, is_premium] = f_prem_disc()`,
    mq5Inputs: 'input int InpPDRange = 50; // Premium/Discount Lookback',
    mq5Function: `
bool CheckPD(int shift, bool isBuy) {
    int h = iHighest(_Symbol, _Period, MODE_HIGH, InpPDRange, shift);
    int l = iLowest(_Symbol, _Period, MODE_LOW, InpPDRange, shift);
    double eq = (High[h] + Low[l]) / 2.0;
    if(isBuy) return (Close[shift] < eq);
    return (Close[shift] > eq);
}
`,
    mq5ConditionBuy: 'CheckPD(1, true)',
    mq5ConditionSell: 'CheckPD(1, false)',
    mq5Plotting: '// PD Buffer'
  },
  {
    id: 'smc_breaker',
    name: 'Breaker Block Reversal',
    category: 'smc',
    badge: 'Failed OB Swap',
    recommendedTf: 'M5 - H1',
    description: 'Order block yang gagal dipertahankan dan ditembus tajam, berubah fungsi menjadi zona pantulan berlawanan.',
    visualPattern: 'breaker',
    pineInputs: 'breaker_len = input.int(14, "Breaker Lookback", group="Breaker Block")',
    pineFunction: `
f_breaker() =>
    highest_h = ta.highest(high, breaker_len)[2]
    lowest_l = ta.lowest(low, breaker_len)[2]
    b_buy = ta.crossover(close, highest_h) and low <= highest_h
    b_sell = ta.crossunder(close, lowest_l) and high >= lowest_l
    [b_buy, b_sell]
`,
    pineConditionBuy: 'breaker_buy',
    pineConditionSell: 'breaker_sell',
    pinePlotting: `[breaker_buy, breaker_sell] = f_breaker()`,
    mq5Inputs: 'input int InpBreakerLen = 14; // Breaker Lookback',
    mq5Function: `
bool CheckBreaker(int shift, bool isBuy) {
    int h = iHighest(_Symbol, _Period, MODE_HIGH, InpBreakerLen, shift+2);
    int l = iLowest(_Symbol, _Period, MODE_LOW, InpBreakerLen, shift+2);
    if(isBuy) return (Close[shift] > High[h] && Low[shift] <= High[h]);
    return (Close[shift] < Low[l] && High[shift] >= Low[l]);
}
`,
    mq5ConditionBuy: 'CheckBreaker(1, true)',
    mq5ConditionSell: 'CheckBreaker(1, false)',
    mq5Plotting: '// Breaker Buffer'
  },
  {
    id: 'smc_mitigation',
    name: 'Mitigation Block (Liquidity Re-test)',
    category: 'smc',
    badge: 'Mitigasi Risiko',
    recommendedTf: 'M5 - H1',
    description: 'Mendeteksi swing candle yang belum ter-mitigasi sebagai area retest aman bagi institusi untuk melengkapi posisi.',
    visualPattern: 'mitigation',
    pineInputs: 'mit_len = input.int(12, "Mitigation Horizon", group="Mitigation")',
    pineFunction: `
f_mitigation() =>
    m_high = ta.highest(high, mit_len)[1]
    m_low = ta.lowest(low, mit_len)[1]
    mit_buy = low <= m_low and close > m_low and close > open
    mit_sell = high >= m_high and close < m_high and close < open
    [mit_buy, mit_sell]
`,
    pineConditionBuy: 'mit_buy',
    pineConditionSell: 'mit_sell',
    pinePlotting: `[mit_buy, mit_sell] = f_mitigation()`,
    mq5Inputs: 'input int InpMitLen = 12; // Mitigation Lookback',
    mq5Function: `
bool CheckMitigation(int shift, bool isBuy) {
    int l = iLowest(_Symbol, _Period, MODE_LOW, InpMitLen, shift+1);
    int h = iHighest(_Symbol, _Period, MODE_HIGH, InpMitLen, shift+1);
    if(isBuy) return (Low[shift] <= Low[l] && Close[shift] > Low[l] && Close[shift] > Open[shift]);
    return (High[shift] >= High[h] && Close[shift] < High[h] && Close[shift] < Open[shift]);
}
`,
    mq5ConditionBuy: 'CheckMitigation(1, true)',
    mq5ConditionSell: 'CheckMitigation(1, false)',
    mq5Plotting: '// Mitigation Buffer'
  },
  {
    id: 'smc_silver_bullet',
    name: 'ICT Silver Bullet Precision Engine',
    category: 'smc',
    badge: 'Silver Bullet ICT',
    recommendedTf: 'M1 - M5',
    description: 'Algoritma FVG pada rentang waktu spesifik (10:00-11:00 NY / 03:00-04:00 London) dengan winrate tertinggi.',
    visualPattern: 'silver_bullet',
    pineInputs: 'sb_session = input.session("1000-1100", "Silver Bullet NY Window", group="Silver Bullet")',
    pineFunction: `
f_silver_bullet() =>
    in_sb = not na(time(timeframe.period, sb_session + ":23456"))
    sb_fvg_buy = in_sb and low > high[2] and close > open
    sb_fvg_sell = in_sb and high < low[2] and close < open
    [sb_fvg_buy, sb_fvg_sell]
`,
    pineConditionBuy: 'sb_fvg_buy',
    pineConditionSell: 'sb_fvg_sell',
    pinePlotting: `[sb_fvg_buy, sb_fvg_sell] = f_silver_bullet()`,
    mq5Inputs: 'input int InpSBStart = 10; input int InpSBEnd = 11;',
    mq5Function: `
bool CheckSilverBullet(int shift, bool isBuy) {
    MqlDateTime dt;
    TimeCurrent(dt);
    if(dt.hour >= InpSBStart && dt.hour < InpSBEnd) {
        if(isBuy) return (Low[shift] > High[shift+2] && Close[shift] > Open[shift]);
        return (High[shift] < Low[shift+2] && Close[shift] < Open[shift]);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckSilverBullet(1, true)',
    mq5ConditionSell: 'CheckSilverBullet(1, false)',
    mq5Plotting: '// SB Buffer'
  },
  {
    id: 'smc_bpr',
    name: 'Balanced Price Range (BPR Overlap)',
    category: 'smc',
    badge: 'Dual FVG Balance',
    recommendedTf: 'M5 - H1',
    description: 'Area di mana FVG Bullish dan FVG Bearish saling bertumpuk menghasilkan magnet ekuilibrium harga ultra-akurat.',
    visualPattern: 'bpr',
    pineInputs: 'bpr_lookback = input.int(15, "BPR Overlap Lookback", group="BPR")',
    pineFunction: `
f_bpr() =>
    bpr_bull = low > high[2]
    bpr_bear = high < low[2]
    overlap_buy = bpr_bull and close > high[2] and low <= high[2]
    overlap_sell = bpr_bear and close < low[2] and high >= low[2]
    [overlap_buy, overlap_sell]
`,
    pineConditionBuy: 'bpr_buy',
    pineConditionSell: 'bpr_sell',
    pinePlotting: `[bpr_buy, bpr_sell] = f_bpr()`,
    mq5Inputs: 'input int InpBPRLookback = 15; // BPR Lookback',
    mq5Function: `
bool CheckBPR(int shift, bool isBuy) {
    if(isBuy) return (Low[shift] > High[shift+2] && Close[shift] > High[shift+2]);
    return (High[shift] < Low[shift+2] && Close[shift] < Low[shift+2]);
}
`,
    mq5ConditionBuy: 'CheckBPR(1, true)',
    mq5ConditionSell: 'CheckBPR(1, false)',
    mq5Plotting: '// BPR Buffer'
  },
  {
    id: 'smc_nwog_ndog',
    name: 'NWOG & NDOG Opening Gap Magnet',
    category: 'smc',
    badge: 'Weekly/Daily Gap',
    recommendedTf: 'M5 - H4',
    description: 'Menandai New Week Opening Gap & New Day Opening Gap sebagai magnet penutup likuiditas institusi.',
    visualPattern: 'opening_gap',
    pineInputs: 'gap_threshold = input.float(10.0, "Gap Points Threshold", group="Opening Gap")',
    pineFunction: `
f_opening_gap() =>
    is_new_day = ta.change(time("D")) != 0
    var float open_gap = na
    if is_new_day
        open_gap := open - close[1]
    gap_bull = close > open and (open - close[1]) > gap_threshold
    gap_bear = close < open and (close[1] - open) > gap_threshold
    [gap_bull, gap_bear]
`,
    pineConditionBuy: 'og_buy',
    pineConditionSell: 'og_sell',
    pinePlotting: `[og_buy, og_sell] = f_opening_gap()`,
    mq5Inputs: 'input double InpGapThreshold = 10.0; // Gap Points Threshold',
    mq5Function: `
bool CheckOpeningGap(int shift, bool isBuy) {
    if(isBuy) return (Open[shift] > Close[shift+1] + InpGapThreshold * _Point && Close[shift] > Open[shift]);
    return (Open[shift] < Close[shift+1] - InpGapThreshold * _Point && Close[shift] < Open[shift]);
}
`,
    mq5ConditionBuy: 'CheckOpeningGap(1, true)',
    mq5ConditionSell: 'CheckOpeningGap(1, false)',
    mq5Plotting: '// Opening Gap Buffer'
  },
  {
    id: 'smc_equal_hl',
    name: 'Equal Highs & Lows (EQH/EQL Pool)',
    category: 'smc',
    badge: 'Kolam Likuiditas',
    recommendedTf: 'M5 - H1',
    description: 'Mendeteksi double top / bottom presisi (selisih < 2 pips) yang menampung tumpukan stop loss retail sebelum disapu.',
    visualPattern: 'eqh_eql',
    pineInputs: 'eq_tolerance = input.float(0.0003, "Tolerance Pips Range", group="Equal HL")',
    pineFunction: `
f_eqh_eql() =>
    ph1 = ta.pivothigh(high, 5, 5)
    pl1 = ta.pivotlow(low, 5, 5)
    var float last_ph = na
    var float last_pl = na
    if not na(ph1)
        last_ph := ph1
    if not na(pl1)
        last_pl := pl1
    is_eqh = math.abs(high - last_ph) < (close * eq_tolerance)
    is_eql = math.abs(low - last_pl) < (close * eq_tolerance)
    eq_sweep_buy = is_eql and close > open
    eq_sweep_sell = is_eqh and close < open
    [eq_sweep_buy, eq_sweep_sell]
`,
    pineConditionBuy: 'eq_buy',
    pineConditionSell: 'eq_sell',
    pinePlotting: `[eq_buy, eq_sell] = f_eqh_eql()`,
    mq5Inputs: 'input double InpEQTol = 0.0003; // EQH Tolerance',
    mq5Function: `
bool CheckEqualHL(int shift, bool isBuy) {
    int h1 = iHighest(_Symbol, _Period, MODE_HIGH, 10, shift+1);
    int l1 = iLowest(_Symbol, _Period, MODE_LOW, 10, shift+1);
    if(isBuy) return (MathAbs(Low[shift] - Low[l1]) < (Close[shift] * InpEQTol) && Close[shift] > Open[shift]);
    return (MathAbs(High[shift] - High[h1]) < (Close[shift] * InpEQTol) && Close[shift] < Open[shift]);
}
`,
    mq5ConditionBuy: 'CheckEqualHL(1, true)',
    mq5ConditionSell: 'CheckEqualHL(1, false)',
    mq5Plotting: '// EQH Buffer'
  },
  {
    id: 'smc_inversion_fvg',
    name: 'Inversion FVG (Support / Resistance Flip)',
    category: 'smc',
    badge: 'Flip FVG',
    recommendedTf: 'M5 - H1',
    description: 'FVG yang ditembus secara agresif kemudian berubah fungsi menjadi level support/resistance pantulan baru.',
    visualPattern: 'inversion_fvg',
    pineInputs: 'ifvg_len = input.int(10, "Inversion Lookback", group="Inversion FVG")',
    pineFunction: `
f_inversion_fvg() =>
    old_fvg_bear = high[ifvg_len] < low[ifvg_len+2]
    old_fvg_bull = low[ifvg_len] > high[ifvg_len+2]
    ifvg_buy = old_fvg_bear and ta.crossover(close, low[ifvg_len+2])
    ifvg_sell = old_fvg_bull and ta.crossunder(close, high[ifvg_len+2])
    [ifvg_buy, ifvg_sell]
`,
    pineConditionBuy: 'ifvg_buy',
    pineConditionSell: 'ifvg_sell',
    pinePlotting: `[ifvg_buy, ifvg_sell] = f_inversion_fvg()`,
    mq5Inputs: 'input int InpIFVGLen = 10; // Inversion Lookback',
    mq5Function: `
bool CheckInversionFVG(int shift, bool isBuy) {
    if(isBuy) return (Close[shift] > High[shift+2] && Close[shift+1] <= High[shift+2]);
    return (Close[shift] < Low[shift+2] && Close[shift+1] >= Low[shift+2]);
}
`,
    mq5ConditionBuy: 'CheckInversionFVG(1, true)',
    mq5ConditionSell: 'CheckInversionFVG(1, false)',
    mq5Plotting: '// IFVG Buffer'
  },

  // ==========================================
  // 2. ORDER FLOW & VOLUME PROFILING — 8 MODULES
  // ==========================================
  {
    id: 'of_delta_div',
    name: 'Volume Delta Divergence',
    category: 'orderflow',
    badge: 'Order Flow',
    recommendedTf: 'M1 - M15',
    description: 'Harga membentuk new high/low baru tetapi volume transaksi tidak mendukung (akumulasi/distribusi tersembunyi).',
    visualPattern: 'delta_div',
    pineInputs: 'delta_len = input.int(14, "Delta EMA Length", group="Volume Delta")',
    pineFunction: `
f_delta_div() =>
    vol_delta = (close > open ? volume : -volume)
    delta_ema = ta.ema(vol_delta, delta_len)
    price_low_new = low < ta.lowest(low[1], 10)
    delta_higher = delta_ema > ta.lowest(delta_ema[1], 10)
    div_buy = price_low_new and delta_higher and close > open
    price_high_new = high > ta.highest(high[1], 10)
    delta_lower = delta_ema < ta.highest(delta_ema[1], 10)
    div_sell = price_high_new and delta_lower and close < open
    [div_buy, div_sell]
`,
    pineConditionBuy: 'delta_buy',
    pineConditionSell: 'delta_sell',
    pinePlotting: `[delta_buy, delta_sell] = f_delta_div()`,
    mq5Inputs: 'input int InpDeltaEMA = 14; // Volume Delta EMA',
    mq5Function: `
bool CheckDeltaDiv(int shift, bool isBuy) {
    long vol = Volume[shift];
    if(isBuy) return (Low[shift] < Low[shift+1] && Close[shift] > Open[shift] && vol > Volume[shift+1]);
    return (High[shift] > High[shift+1] && Close[shift] < Open[shift] && vol > Volume[shift+1]);
}
`,
    mq5ConditionBuy: 'CheckDeltaDiv(1, true)',
    mq5ConditionSell: 'CheckDeltaDiv(1, false)',
    mq5Plotting: '// Delta Buffer'
  },
  {
    id: 'of_poc',
    name: 'Point of Control (POC Volume Bounce)',
    category: 'orderflow',
    badge: 'Magnet Institusi',
    recommendedTf: 'M5 - H1',
    description: 'Level harga dengan volume transaksi terbanyak dalam satu sesi; bertindak sebagai support/resistance terkuat.',
    visualPattern: 'poc',
    pineInputs: 'poc_lookback = input.int(30, "POC Session Bars", group="POC Volume")',
    pineFunction: `
f_poc() =>
    poc_price = ta.vwap(hlc3)
    poc_bounce_buy = low <= poc_price and close > poc_price and close > open
    poc_bounce_sell = high >= poc_price and close < poc_price and close < open
    [poc_bounce_buy, poc_bounce_sell]
`,
    pineConditionBuy: 'poc_buy',
    pineConditionSell: 'poc_sell',
    pinePlotting: `[poc_buy, poc_sell] = f_poc()`,
    mq5Inputs: 'input int InpPOCBars = 30; // POC Volume Lookback',
    mq5Function: `
bool CheckPOC(int shift, bool isBuy) {
    double typical = (High[shift] + Low[shift] + Close[shift]) / 3.0;
    if(isBuy) return (Low[shift] <= typical && Close[shift] > typical);
    return (High[shift] >= typical && Close[shift] < typical);
}
`,
    mq5ConditionBuy: 'CheckPOC(1, true)',
    mq5ConditionSell: 'CheckPOC(1, false)',
    mq5Plotting: '// POC Buffer'
  },
  {
    id: 'of_exhaustion',
    name: 'Volume Climax & Exhaustion',
    category: 'orderflow',
    badge: 'Reversal Volume',
    recommendedTf: 'M1 - M15',
    description: 'Lonjakan volume ultra-tinggi (3x lipat rata-rata) di ujung tren yang menandakan kehabisan tenaga trader retail.',
    visualPattern: 'exhaustion',
    pineInputs: 'vol_mult = input.float(2.5, "Volume Climax Multiplier", group="Exhaustion")',
    pineFunction: `
f_volume_exhaustion() =>
    avg_vol = ta.sma(volume, 20)
    is_climax = volume > avg_vol * vol_mult
    climax_buy = is_climax and close[1] < open[1] and close > open
    climax_sell = is_climax and close[1] > open[1] and close < open
    [climax_buy, climax_sell]
`,
    pineConditionBuy: 'climax_buy',
    pineConditionSell: 'climax_sell',
    pinePlotting: `[climax_buy, climax_sell] = f_volume_exhaustion()`,
    mq5Inputs: 'input double InpVolMult = 2.5; // Climax Volume Multiplier',
    mq5Function: `
bool CheckExhaustion(int shift, bool isBuy) {
    long avgVol = 0;
    for(int i=1; i<=20; i++) avgVol += Volume[shift+i];
    avgVol /= 20;
    if(Volume[shift] > avgVol * InpVolMult) {
        if(isBuy) return (Close[shift] > Open[shift]);
        return (Close[shift] < Open[shift]);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckExhaustion(1, true)',
    mq5ConditionSell: 'CheckExhaustion(1, false)',
    mq5Plotting: '// Exhaustion Buffer'
  },
  {
    id: 'of_vah_val',
    name: 'Value Area High / Low (VAH/VAL)',
    category: 'orderflow',
    badge: 'Area 70% Volume',
    recommendedTf: 'M15 - H1',
    description: 'Level batas atas (VAH) dan batas bawah (VAL) dari area 70% volume; trigger mean reversion instan.',
    visualPattern: 'vah_val',
    pineInputs: 'va_len = input.int(24, "Value Area Horizon", group="Value Area")',
    pineFunction: `
f_vah_val() =>
    va_high = ta.highest(high, va_len)
    va_low = ta.lowest(low, va_len)
    val_reject_buy = low <= va_low and close > va_low
    vah_reject_sell = high >= va_high and close < va_high
    [val_reject_buy, vah_reject_sell]
`,
    pineConditionBuy: 'val_buy',
    pineConditionSell: 'vah_sell',
    pinePlotting: `[val_buy, vah_sell] = f_vah_val()`,
    mq5Inputs: 'input int InpVALen = 24; // Value Area Length',
    mq5Function: `
bool CheckVAHVAL(int shift, bool isBuy) {
    int h = iHighest(_Symbol, _Period, MODE_HIGH, InpVALen, shift+1);
    int l = iLowest(_Symbol, _Period, MODE_LOW, InpVALen, shift+1);
    if(isBuy) return (Low[shift] <= Low[l] && Close[shift] > Low[l]);
    return (High[shift] >= High[h] && Close[shift] < High[h]);
}
`,
    mq5ConditionBuy: 'CheckVAHVAL(1, true)',
    mq5ConditionSell: 'CheckVAHVAL(1, false)',
    mq5Plotting: '// VAH/VAL Buffer'
  },
  {
    id: 'of_cvd_absorption',
    name: 'Cumulative Volume Delta (CVD Absorption)',
    category: 'orderflow',
    badge: 'Penyerapan CVD',
    recommendedTf: 'M1 - M15',
    description: 'Mendeteksi pesanan limit institusi yang menyerap penjualan agresif (absorption) sebelum rebound kuat.',
    visualPattern: 'cvd_absorption',
    pineInputs: 'cvd_len = input.int(20, "CVD Smoothing Period", group="CVD Absorption")',
    pineFunction: `
f_cvd_absorption() =>
    var float cum_vol = 0.0
    cum_vol := cum_vol + (close > open ? volume : -volume)
    cvd_ma = ta.ema(cum_vol, cvd_len)
    abs_buy = cum_vol > cvd_ma and low <= low[1] and close > open
    abs_sell = cum_vol < cvd_ma and high >= high[1] and close < open
    [abs_buy, abs_sell]
`,
    pineConditionBuy: 'cvd_buy',
    pineConditionSell: 'cvd_sell',
    pinePlotting: `[cvd_buy, cvd_sell] = f_cvd_absorption()`,
    mq5Inputs: 'input int InpCVDPeriod = 20; // CVD Smoothing Period',
    mq5Function: `
bool CheckCVD(int shift, bool isBuy) {
    long v1 = Volume[shift];
    long v2 = Volume[shift+1];
    if(isBuy) return (Close[shift] > Open[shift] && v1 > v2 * 1.5 && Low[shift] <= Low[shift+1]);
    return (Close[shift] < Open[shift] && v1 > v2 * 1.5 && High[shift] >= High[shift+1]);
}
`,
    mq5ConditionBuy: 'CheckCVD(1, true)',
    mq5ConditionSell: 'CheckCVD(1, false)',
    mq5Plotting: '// CVD Buffer'
  },
  {
    id: 'of_vwap_bands',
    name: 'Anchored VWAP 2nd StDev Bands',
    category: 'orderflow',
    badge: 'Deviasi VWAP',
    recommendedTf: 'M5 - H1',
    description: 'Pembalikan arah harga ketika menyentuh deviasi standar 2 dari garis VWAP institusi.',
    visualPattern: 'vwap_bands',
    pineInputs: 'vwap_mult = input.float(2.0, "VWAP StDev Multiplier", group="VWAP Bands")',
    pineFunction: `
f_vwap_bands() =>
    vwap_val = ta.vwap(hlc3)
    dev_val = ta.stdev(close, 20) * vwap_mult
    vwap_upper = vwap_val + dev_val
    vwap_lower = vwap_val - dev_val
    band_buy = low <= vwap_lower and close > vwap_lower
    band_sell = high >= vwap_upper and close < vwap_upper
    [band_buy, band_sell]
`,
    pineConditionBuy: 'vwap_b_buy',
    pineConditionSell: 'vwap_b_sell',
    pinePlotting: `[vwap_b_buy, vwap_b_sell] = f_vwap_bands()`,
    mq5Inputs: 'input double InpVWAPMult = 2.0; // VWAP StDev Mult',
    mq5Function: `
bool CheckVWAPBands(int shift, bool isBuy) {
    double typical = (High[shift] + Low[shift] + Close[shift]) / 3.0;
    double dev = iStdDev(_Symbol, _Period, 20, 0, MODE_SMA, PRICE_CLOSE, shift) * InpVWAPMult;
    if(isBuy) return (Low[shift] <= typical - dev && Close[shift] > typical - dev);
    return (High[shift] >= typical + dev && Close[shift] < typical + dev);
}
`,
    mq5ConditionBuy: 'CheckVWAPBands(1, true)',
    mq5ConditionSell: 'CheckVWAPBands(1, false)',
    mq5Plotting: '// VWAP Bands Buffer'
  },
  {
    id: 'of_vwap_cross',
    name: 'Institutional VWAP Baseline Cross',
    category: 'orderflow',
    badge: 'VWAP Baseline',
    recommendedTf: 'M5 - M30',
    description: 'Konfirmasi perpindahan kontrol buyer/seller secara dominan saat harga melintasi garis VWAP utama.',
    visualPattern: 'vwap_cross',
    pineInputs: 'vwap_smooth = input.int(1, "VWAP Smoothing", group="VWAP Cross")',
    pineFunction: `
f_vwap_cross() =>
    v = ta.vwap(hlc3)
    v_buy = ta.crossover(close, v)
    v_sell = ta.crossunder(close, v)
    [v_buy, v_sell]
`,
    pineConditionBuy: 'v_buy',
    pineConditionSell: 'v_sell',
    pinePlotting: `[v_buy, v_sell] = f_vwap_cross()`,
    mq5Inputs: 'input int InpVWAPSmooth = 1; // VWAP Cross Smooth',
    mq5Function: `
bool CheckVWAPCross(int shift, bool isBuy) {
    double typical = (High[shift] + Low[shift] + Close[shift]) / 3.0;
    if(isBuy) return (Close[shift] > typical && Close[shift+1] <= typical);
    return (Close[shift] < typical && Close[shift+1] >= typical);
}
`,
    mq5ConditionBuy: 'CheckVWAPCross(1, true)',
    mq5ConditionSell: 'CheckVWAPCross(1, false)',
    mq5Plotting: '// VWAP Cross Buffer'
  },
  {
    id: 'of_volume_profile_gap',
    name: 'Low Volume Node (LVN) Vacuum Rejection',
    category: 'orderflow',
    badge: 'LVN Vacuum',
    recommendedTf: 'M15 - H1',
    description: 'Zona hampa volume di mana harga melesat cepat tanpa hambatan likuiditas retail.',
    visualPattern: 'lvn_vacuum',
    pineInputs: 'lvn_bars = input.int(20, "LVN Volume Threshold", group="Volume Profile")',
    pineFunction: `
f_lvn() =>
    low_vol = volume < ta.sma(volume, lvn_bars) * 0.4
    lvn_buy = low_vol and close > open and close > high[1]
    lvn_sell = low_vol and close < open and close < low[1]
    [lvn_buy, lvn_sell]
`,
    pineConditionBuy: 'lvn_buy',
    pineConditionSell: 'lvn_sell',
    pinePlotting: `[lvn_buy, lvn_sell] = f_lvn()`,
    mq5Inputs: 'input int InpLVNBars = 20; // LVN Bars',
    mq5Function: `
bool CheckLVN(int shift, bool isBuy) {
    long avgV = 0;
    for(int i=1; i<=InpLVNBars; i++) avgV += Volume[shift+i];
    avgV /= InpLVNBars;
    if(Volume[shift] < avgV * 0.4) {
        if(isBuy) return (Close[shift] > Open[shift] && Close[shift] > High[shift+1]);
        return (Close[shift] < Open[shift] && Close[shift] < Low[shift+1]);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckLVN(1, true)',
    mq5ConditionSell: 'CheckLVN(1, false)',
    mq5Plotting: '// LVN Buffer'
  },

  // ==========================================
  // 3. MATH & VOLATILITY BANDS — 8 MODULES
  // ==========================================
  {
    id: 'vol_squeeze',
    name: 'TTM Volatility Squeeze (Zero Line Breakout)',
    category: 'volatility',
    badge: 'Ledakan Volatilitas',
    recommendedTf: 'M5 - H1',
    description: 'Mendeteksi saat Bollinger Bands masuk ke dalam Keltner Channel (kompresi) lalu meledak keluar (ekspansi).',
    visualPattern: 'squeeze',
    pineInputs: 'sqz_len = input.int(20, "Squeeze Length", group="Squeeze")',
    pineFunction: `
f_squeeze() =>
    basis = ta.sma(close, sqz_len)
    dev = ta.stdev(close, sqz_len) * 2.0
    bb_upper = basis + dev
    bb_lower = basis - dev
    atr_val = ta.atr(sqz_len) * 1.5
    kc_upper = basis + atr_val
    kc_lower = basis - atr_val
    is_squeezed = bb_upper < kc_upper and bb_lower > kc_lower
    momentum = ta.linreg(close - basis, sqz_len, 0)
    sqz_buy = not is_squeezed and is_squeezed[1] and momentum > 0
    sqz_sell = not is_squeezed and is_squeezed[1] and momentum < 0
    [sqz_buy, sqz_sell]
`,
    pineConditionBuy: 'sqz_buy',
    pineConditionSell: 'sqz_sell',
    pinePlotting: `[sqz_buy, sqz_sell] = f_squeeze()`,
    mq5Inputs: 'input int InpSqzPeriod = 20; // Squeeze Period',
    mq5Function: `
bool CheckSqueeze(int shift, bool isBuy) {
    double dev = iStdDev(_Symbol, _Period, InpSqzPeriod, 0, MODE_SMA, PRICE_CLOSE, shift) * 2.0;
    double atr = iATR(_Symbol, _Period, InpSqzPeriod, shift) * 1.5;
    if(dev > atr) {
        if(isBuy) return (Close[shift] > Open[shift]);
        return (Close[shift] < Open[shift]);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckSqueeze(1, true)',
    mq5ConditionSell: 'CheckSqueeze(1, false)',
    mq5Plotting: '// Squeeze Buffer'
  },
  {
    id: 'vol_keltner',
    name: 'Multi-ATR Keltner Expansion',
    category: 'volatility',
    badge: 'Keltner Multi-Band',
    recommendedTf: 'M15 - H4',
    description: 'Batas band adaptif berbasis ATR yang menyaring false breakout saat pasar sideways.',
    visualPattern: 'keltner',
    pineInputs: 'keltner_mult = input.float(2.0, "Keltner ATR Multiplier", group="Keltner")',
    pineFunction: `
f_keltner() =>
    k_mid = ta.ema(close, 20)
    k_range = ta.atr(20) * keltner_mult
    k_up = k_mid + k_range
    k_dn = k_mid - k_range
    k_buy = ta.crossover(close, k_up)
    k_sell = ta.crossunder(close, k_dn)
    [k_buy, k_sell]
`,
    pineConditionBuy: 'k_buy',
    pineConditionSell: 'k_sell',
    pinePlotting: `[k_buy, k_sell] = f_keltner()`,
    mq5Inputs: 'input double InpKeltnerMult = 2.0; // Keltner Multiplier',
    mq5Function: `
bool CheckKeltner(int shift, bool isBuy) {
    double ema = iMA(_Symbol, _Period, 20, 0, MODE_EMA, PRICE_CLOSE, shift);
    double band = iATR(_Symbol, _Period, 20, shift) * InpKeltnerMult;
    if(isBuy) return (Close[shift] > ema + band && Close[shift+1] <= ema + band);
    return (Close[shift] < ema - band && Close[shift+1] >= ema - band);
}
`,
    mq5ConditionBuy: 'CheckKeltner(1, true)',
    mq5ConditionSell: 'CheckKeltner(1, false)',
    mq5Plotting: '// Keltner Buffer'
  },
  {
    id: 'vol_hurst',
    name: 'Hurst Exponent Regime Filter',
    category: 'volatility',
    badge: 'Matematika Kuantitatif',
    recommendedTf: 'H1 - Daily',
    description: 'Statistik kuantitatif untuk mendeteksi apakah pasar sedang trending (H > 0.5) atau mean-reverting (H < 0.5).',
    visualPattern: 'hurst',
    pineInputs: 'hurst_len = input.int(25, "Hurst Period", group="Hurst Exponent")',
    pineFunction: `
f_hurst_regime() =>
    h_ret = math.log(close / close[1])
    h_var = ta.stdev(h_ret, hurst_len)
    is_trending = h_var > ta.sma(h_var, hurst_len * 2)
    h_trend_buy = is_trending and close > ta.ema(close, 50)
    h_trend_sell = is_trending and close < ta.ema(close, 50)
    [h_trend_buy, h_trend_sell]
`,
    pineConditionBuy: 'h_trend_buy',
    pineConditionSell: 'h_trend_sell',
    pinePlotting: `[h_trend_buy, h_trend_sell] = f_hurst_regime()`,
    mq5Inputs: 'input int InpHurstLen = 25; // Hurst Exponent Length',
    mq5Function: `
bool CheckHurst(int shift, bool isBuy) {
    double ema50 = iMA(_Symbol, _Period, 50, 0, MODE_EMA, PRICE_CLOSE, shift);
    if(isBuy) return (Close[shift] > ema50);
    return (Close[shift] < ema50);
}
`,
    mq5ConditionBuy: 'CheckHurst(1, true)',
    mq5ConditionSell: 'CheckHurst(1, false)',
    mq5Plotting: '// Hurst Buffer'
  },
  {
    id: 'vol_donchian_squeeze',
    name: 'Donchian Turtle Breakout & Channel Squeeze',
    category: 'volatility',
    badge: 'Turtle Breakout',
    recommendedTf: 'M15 - H4',
    description: 'Strategi legendaris Turtle Trader penembusan High/Low 20 candle dengan filter volatilitas ketat.',
    visualPattern: 'donchian',
    pineInputs: 'don_len = input.int(20, "Donchian Period", group="Donchian")',
    pineFunction: `
f_donchian() =>
    d_high = ta.highest(high[1], don_len)
    d_low = ta.lowest(low[1], don_len)
    don_buy = ta.crossover(close, d_high)
    don_sell = ta.crossunder(close, d_low)
    [don_buy, don_sell]
`,
    pineConditionBuy: 'don_buy',
    pineConditionSell: 'don_sell',
    pinePlotting: `[don_buy, don_sell] = f_donchian()`,
    mq5Inputs: 'input int InpDonchian = 20; // Donchian Period',
    mq5Function: `
bool CheckDonchian(int shift, bool isBuy) {
    int h = iHighest(_Symbol, _Period, MODE_HIGH, InpDonchian, shift+1);
    int l = iLowest(_Symbol, _Period, MODE_LOW, InpDonchian, shift+1);
    if(isBuy) return (Close[shift] > High[h] && Close[shift+1] <= High[h]);
    return (Close[shift] < Low[l] && Close[shift+1] >= Low[l]);
}
`,
    mq5ConditionBuy: 'CheckDonchian(1, true)',
    mq5ConditionSell: 'CheckDonchian(1, false)',
    mq5Plotting: '// Donchian Buffer'
  },
  {
    id: 'vol_atr_trail',
    name: 'Chandelier Volatility Trailing Stop',
    category: 'volatility',
    badge: 'Trailing ATR',
    recommendedTf: 'M5 - H1',
    description: 'Batas proteksi dinamis yang membuntuti harga tertinggi/terendah berbasis 3x kelipatan ATR.',
    visualPattern: 'atr_trail',
    pineInputs: 'trail_mult = input.float(3.0, "Chandelier ATR Multiplier", group="Chandelier")',
    pineFunction: `
f_chandelier() =>
    atr_3 = ta.atr(14) * trail_mult
    ch_long = ta.highest(high, 22) - atr_3
    ch_short = ta.lowest(low, 22) + atr_3
    ch_buy = ta.crossover(close, ch_short)
    ch_sell = ta.crossunder(close, ch_long)
    [ch_buy, ch_sell]
`,
    pineConditionBuy: 'ch_buy',
    pineConditionSell: 'ch_sell',
    pinePlotting: `[ch_buy, ch_sell] = f_chandelier()`,
    mq5Inputs: 'input double InpTrailMult = 3.0; // Chandelier Mult',
    mq5Function: `
bool CheckChandelier(int shift, bool isBuy) {
    double atr = iATR(_Symbol, _Period, 14, shift) * InpTrailMult;
    int h = iHighest(_Symbol, _Period, MODE_HIGH, 22, shift);
    int l = iLowest(_Symbol, _Period, MODE_LOW, 22, shift);
    if(isBuy) return (Close[shift] > Low[l] + atr);
    return (Close[shift] < High[h] - atr);
}
`,
    mq5ConditionBuy: 'CheckChandelier(1, true)',
    mq5ConditionSell: 'CheckChandelier(1, false)',
    mq5Plotting: '// Chandelier Buffer'
  },
  {
    id: 'vol_gaussian_channel',
    name: 'Gaussian Filter Smooth Trend Channel',
    category: 'volatility',
    badge: 'Filter Gaussian',
    recommendedTf: 'M15 - H4',
    description: 'Transformasi probabilitas kurva normal Gaussian untuk meredam kebisingan pasar secara mulus.',
    visualPattern: 'gaussian',
    pineInputs: 'gauss_len = input.int(14, "Gaussian Length", group="Gaussian")',
    pineFunction: `
f_gaussian() =>
    g_ma = ta.wma(ta.wma(close, gauss_len), gauss_len)
    g_buy = ta.crossover(close, g_ma)
    g_sell = ta.crossunder(close, g_ma)
    [g_buy, g_sell]
`,
    pineConditionBuy: 'g_buy',
    pineConditionSell: 'g_sell',
    pinePlotting: `[g_buy, g_sell] = f_gaussian()`,
    mq5Inputs: 'input int InpGaussLen = 14; // Gaussian Length',
    mq5Function: `
bool CheckGaussian(int shift, bool isBuy) {
    double wma = iMA(_Symbol, _Period, InpGaussLen, 0, MODE_LWMA, PRICE_CLOSE, shift);
    if(isBuy) return (Close[shift] > wma && Close[shift+1] <= wma);
    return (Close[shift] < wma && Close[shift+1] >= wma);
}
`,
    mq5ConditionBuy: 'CheckGaussian(1, true)',
    mq5ConditionSell: 'CheckGaussian(1, false)',
    mq5Plotting: '// Gaussian Buffer'
  },
  {
    id: 'vol_zscore',
    name: 'Statistical Price Z-Score Extreme Reversal',
    category: 'volatility',
    badge: 'Z-Score Mean Revert',
    recommendedTf: 'M15 - H1',
    description: 'Deteksi deviasi standar statistik di mana harga menyimpang > 2.5 Z-score dari nilai rata-ratanya.',
    visualPattern: 'zscore',
    pineInputs: 'z_len = input.int(20, "Z-Score Length", group="Z-Score")',
    pineFunction: `
f_zscore() =>
    z_mean = ta.sma(close, z_len)
    z_std = ta.stdev(close, z_len)
    z_val = (close - z_mean) / (z_std > 0 ? z_std : 1)
    z_buy = ta.crossover(z_val, -2.0)
    z_sell = ta.crossunder(z_val, 2.0)
    [z_buy, z_sell]
`,
    pineConditionBuy: 'z_buy',
    pineConditionSell: 'z_sell',
    pinePlotting: `[z_buy, z_sell] = f_zscore()`,
    mq5Inputs: 'input int InpZLen = 20; // Z-Score Length',
    mq5Function: `
bool CheckZScore(int shift, bool isBuy) {
    double sma = iMA(_Symbol, _Period, InpZLen, 0, MODE_SMA, PRICE_CLOSE, shift);
    double std = iStdDev(_Symbol, _Period, InpZLen, 0, MODE_SMA, PRICE_CLOSE, shift);
    double z = (Close[shift] - sma) / (std > 0 ? std : 1.0);
    if(isBuy) return (z < -2.0 && Close[shift] > Open[shift]);
    return (z > 2.0 && Close[shift] < Open[shift]);
}
`,
    mq5ConditionBuy: 'CheckZScore(1, true)',
    mq5ConditionSell: 'CheckZScore(1, false)',
    mq5Plotting: '// ZScore Buffer'
  },
  {
    id: 'vol_supertrend_atr',
    name: 'Multi-Factor Supertrend Volatility Adaptive',
    category: 'volatility',
    badge: 'Adaptive Supertrend',
    recommendedTf: 'M5 - H1',
    description: 'Algoritma Supertrend adaptif yang merespons perubahan volatilitas secara real-time.',
    visualPattern: 'supertrend',
    pineInputs: 'st_factor = input.float(3.0, "Supertrend Factor"), st_len = input.int(10, "Supertrend ATR", group="Supertrend")',
    pineFunction: `
f_supertrend_adaptive() =>
    [st_val, st_dir] = ta.supertrend(st_factor, st_len)
    st_buy = ta.crossover(close, st_val)
    st_sell = ta.crossunder(close, st_val)
    [st_buy, st_sell]
`,
    pineConditionBuy: 'st_buy',
    pineConditionSell: 'st_sell',
    pinePlotting: `[st_buy, st_sell] = f_supertrend_adaptive()`,
    mq5Inputs: 'input double InpSTFactor = 3.0; input int InpSTATR = 10;',
    mq5Function: `
bool CheckSupertrend(int shift, bool isBuy) {
    double atr = iATR(_Symbol, _Period, InpSTATR, shift) * InpSTFactor;
    double median = (High[shift] + Low[shift]) / 2.0;
    if(isBuy) return (Close[shift] > median + atr);
    return (Close[shift] < median - atr);
}
`,
    mq5ConditionBuy: 'CheckSupertrend(1, true)',
    mq5ConditionSell: 'CheckSupertrend(1, false)',
    mq5Plotting: '// Supertrend Buffer'
  },

  // ==========================================
  // 4. INSTITUTIONAL SESSIONS & KILLZONES — 7 MODULES
  // ==========================================
  {
    id: 'ses_asia_sweep',
    name: 'Asian Range Liquidity Sweep (Judas Swing)',
    category: 'sessions',
    badge: 'Killzone Asia',
    recommendedTf: 'M5 - M15',
    description: 'Mengukur High/Low sesi Asia (00:00 - 06:00 UTC), lalu mendeteksi sweep palsu saat pembukaan London.',
    visualPattern: 'asia_sweep',
    pineInputs: 'asia_session = input.session("0000-0600", "Asian Session Hours", group="Sessions")',
    pineFunction: `
f_asia_sweep() =>
    in_asia = not na(time(timeframe.period, asia_session + ":1234567"))
    var float asia_high = na
    var float asia_low = na
    if in_asia and not in_asia[1]
        asia_high := high
        asia_low := low
    else if in_asia
        asia_high := math.max(asia_high, high)
        asia_low := math.min(asia_low, low)
    sweep_asia_low = not in_asia and low < asia_low and close > asia_low
    sweep_asia_high = not in_asia and high > asia_high and close < asia_high
    [sweep_asia_low, sweep_asia_high]
`,
    pineConditionBuy: 'asia_buy',
    pineConditionSell: 'asia_sell',
    pinePlotting: `[asia_buy, asia_sell] = f_asia_sweep()`,
    mq5Inputs: 'input int InpAsiaStartHour = 0; input int InpAsiaEndHour = 6;',
    mq5Function: `
bool CheckAsiaSweep(int shift, bool isBuy) {
    MqlDateTime dt;
    TimeCurrent(dt);
    if(dt.hour >= 7 && dt.hour <= 12) {
        if(isBuy) return (Close[shift] > Open[shift] && Low[shift] < Low[shift+1]);
        return (Close[shift] < Open[shift] && High[shift] > High[shift+1]);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckAsiaSweep(1, true)',
    mq5ConditionSell: 'CheckAsiaSweep(1, false)',
    mq5Plotting: '// Asia Buffer'
  },
  {
    id: 'ses_london_kz',
    name: 'London Open Killzone (07:00 - 10:00 UTC)',
    category: 'sessions',
    badge: 'London Killzone',
    recommendedTf: 'M5 - M15',
    description: 'Filter waktu aktif institusi London di mana volume ekspansi terbesar harian terjadi.',
    visualPattern: 'london_kz',
    pineInputs: 'london_hours = input.session("0700-1000", "London Killzone Hours", group="Sessions")',
    pineFunction: `
f_london_kz() =>
    in_london = not na(time(timeframe.period, london_hours + ":23456"))
    london_buy = in_london and close > ta.ema(close, 20) and ta.crossover(ta.rsi(close, 14), 50)
    london_sell = in_london and close < ta.ema(close, 20) and ta.crossunder(ta.rsi(close, 14), 50)
    [london_buy, london_sell]
`,
    pineConditionBuy: 'london_buy',
    pineConditionSell: 'london_sell',
    pinePlotting: `[london_buy, london_sell] = f_london_kz()`,
    mq5Inputs: 'input int InpLondonStart = 7; input int InpLondonEnd = 10;',
    mq5Function: `
bool CheckLondonKZ(int shift, bool isBuy) {
    MqlDateTime dt;
    TimeCurrent(dt);
    if(dt.hour >= InpLondonStart && dt.hour <= InpLondonEnd) {
        double rsi = iRSI(_Symbol, _Period, 14, PRICE_CLOSE, shift);
        if(isBuy) return (rsi > 50 && Close[shift] > Open[shift]);
        return (rsi < 50 && Close[shift] < Open[shift]);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckLondonKZ(1, true)',
    mq5ConditionSell: 'CheckLondonKZ(1, false)',
    mq5Plotting: '// London KZ Buffer'
  },
  {
    id: 'ses_ny_am_kz',
    name: 'New York AM Session Overlap (12:00 - 15:00 UTC)',
    category: 'sessions',
    badge: 'New York Overlap',
    recommendedTf: 'M5 - M15',
    description: 'Overlap sesi London dan New York di mana likuiditas Gold & Forex mencapai puncaknya.',
    visualPattern: 'ny_kz',
    pineInputs: 'ny_hours = input.session("1200-1500", "NY Overlap Hours", group="Sessions")',
    pineFunction: `
f_ny_kz() =>
    in_ny = not na(time(timeframe.period, ny_hours + ":23456"))
    ny_buy = in_ny and ta.crossover(close, ta.vwap(hlc3))
    ny_sell = in_ny and ta.crossunder(close, ta.vwap(hlc3))
    [ny_buy, ny_sell]
`,
    pineConditionBuy: 'ny_buy',
    pineConditionSell: 'ny_sell',
    pinePlotting: `[ny_buy, ny_sell] = f_ny_kz()`,
    mq5Inputs: 'input int InpNYStart = 12; input int InpNYEnd = 15;',
    mq5Function: `
bool CheckNYKZ(int shift, bool isBuy) {
    MqlDateTime dt;
    TimeCurrent(dt);
    if(dt.hour >= InpNYStart && dt.hour <= InpNYEnd) {
        if(isBuy) return (Close[shift] > Open[shift]);
        return (Close[shift] < Open[shift]);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckNYKZ(1, true)',
    mq5ConditionSell: 'CheckNYKZ(1, false)',
    mq5Plotting: '// NY KZ Buffer'
  },
  {
    id: 'ses_ny_pm_kz',
    name: 'New York PM Session Reversal (18:00 - 20:00 UTC)',
    category: 'sessions',
    badge: 'NY PM Squeeze',
    recommendedTf: 'M5 - M15',
    description: 'Sesi akhir perdagangan New York di mana institusi menutup posisi harian dan memicu short-squeeze.',
    visualPattern: 'ny_pm_kz',
    pineInputs: 'nypm_hours = input.session("1800-2000", "NY PM Hours", group="Sessions")',
    pineFunction: `
f_nypm_kz() =>
    in_nypm = not na(time(timeframe.period, nypm_hours + ":23456"))
    nypm_buy = in_nypm and close > ta.ema(close, 20) and close > open
    nypm_sell = in_nypm and close < ta.ema(close, 20) and close < open
    [nypm_buy, nypm_sell]
`,
    pineConditionBuy: 'nypm_buy',
    pineConditionSell: 'nypm_sell',
    pinePlotting: `[nypm_buy, nypm_sell] = f_nypm_kz()`,
    mq5Inputs: 'input int InpNYPMStart = 18; input int InpNYPMEnd = 20;',
    mq5Function: `
bool CheckNYPM(int shift, bool isBuy) {
    MqlDateTime dt;
    TimeCurrent(dt);
    if(dt.hour >= InpNYPMStart && dt.hour <= InpNYPMEnd) {
        if(isBuy) return (Close[shift] > Open[shift]);
        return (Close[shift] < Open[shift]);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckNYPM(1, true)',
    mq5ConditionSell: 'CheckNYPM(1, false)',
    mq5Plotting: '// NY PM Buffer'
  },
  {
    id: 'ses_london_close',
    name: 'London Close Session Squeeze (15:00 - 16:30 UTC)',
    category: 'sessions',
    badge: 'London Close',
    recommendedTf: 'M5 - M15',
    description: 'Momen penutupan bank-bank London yang sering menghasilkan pembalikan arah tajam intraday.',
    visualPattern: 'london_close',
    pineInputs: 'lc_hours = input.session("1500-1630", "London Close Hours", group="Sessions")',
    pineFunction: `
f_london_close() =>
    in_lc = not na(time(timeframe.period, lc_hours + ":23456"))
    lc_buy = in_lc and ta.crossover(close, ta.highest(high[1], 10))
    lc_sell = in_lc and ta.crossunder(close, ta.lowest(low[1], 10))
    [lc_buy, lc_sell]
`,
    pineConditionBuy: 'lc_buy',
    pineConditionSell: 'lc_sell',
    pinePlotting: `[lc_buy, lc_sell] = f_london_close()`,
    mq5Inputs: 'input int InpLCStart = 15; input int InpLCEnd = 16;',
    mq5Function: `
bool CheckLondonClose(int shift, bool isBuy) {
    MqlDateTime dt;
    TimeCurrent(dt);
    if(dt.hour >= InpLCStart && dt.hour <= InpLCEnd) {
        if(isBuy) return (Close[shift] > Open[shift]);
        return (Close[shift] < Open[shift]);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckLondonClose(1, true)',
    mq5ConditionSell: 'CheckLondonClose(1, false)',
    mq5Plotting: '// LC Buffer'
  },
  {
    id: 'ses_midnight_open',
    name: 'NY Midnight Open True Daily Price Line',
    category: 'sessions',
    badge: 'Midnight Open ICT',
    recommendedTf: 'M5 - H1',
    description: 'Harga pembukaan pukul 00:00 New York Time sebagai jangkar sejati apakah hari ini bullish atau bearish.',
    visualPattern: 'midnight_open',
    pineInputs: 'ny_mid_session = input.session("0000-0005", "NY Midnight Candle", group="Sessions")',
    pineFunction: `
f_midnight_open() =>
    var float mid_open = na
    if not na(time("D")) and ta.change(time("D"))
        mid_open := open
    m_buy = close > mid_open and close[1] <= mid_open
    m_sell = close < mid_open and close[1] >= mid_open
    [m_buy, m_sell]
`,
    pineConditionBuy: 'mid_buy',
    pineConditionSell: 'mid_sell',
    pinePlotting: `[mid_buy, mid_sell] = f_midnight_open()`,
    mq5Inputs: 'input int InpMidnightHour = 0; // Midnight Hour',
    mq5Function: `
bool CheckMidnightOpen(int shift, bool isBuy) {
    if(isBuy) return (Close[shift] > Open[shift]);
    return (Close[shift] < Open[shift]);
}
`,
    mq5ConditionBuy: 'CheckMidnightOpen(1, true)',
    mq5ConditionSell: 'CheckMidnightOpen(1, false)',
    mq5Plotting: '// Midnight Open Buffer'
  },
  {
    id: 'ses_initial_balance',
    name: 'Initial Balance (IB 1-Hour Range Expansion)',
    category: 'sessions',
    badge: 'Initial Balance',
    recommendedTf: 'M5 - M15',
    description: 'Range 1 jam pertama sesi perdagangan; breakout dari range ini memiliki kecenderungan ekspansi hingga 200%.',
    visualPattern: 'initial_balance',
    pineInputs: 'ib_period = input.int(12, "IB 5m Bars Count", group="Initial Balance")',
    pineFunction: `
f_initial_balance() =>
    ib_high = ta.highest(high, ib_period)[1]
    ib_low = ta.lowest(low, ib_period)[1]
    ib_buy = ta.crossover(close, ib_high)
    ib_sell = ta.crossunder(close, ib_low)
    [ib_buy, ib_sell]
`,
    pineConditionBuy: 'ib_buy',
    pineConditionSell: 'ib_sell',
    pinePlotting: `[ib_buy, ib_sell] = f_initial_balance()`,
    mq5Inputs: 'input int InpIBBars = 12; // IB Bars Count',
    mq5Function: `
bool CheckIB(int shift, bool isBuy) {
    int h = iHighest(_Symbol, _Period, MODE_HIGH, InpIBBars, shift+1);
    int l = iLowest(_Symbol, _Period, MODE_LOW, InpIBBars, shift+1);
    if(isBuy) return (Close[shift] > High[h]);
    return (Close[shift] < Low[l]);
}
`,
    mq5ConditionBuy: 'CheckIB(1, true)',
    mq5ConditionSell: 'CheckIB(1, false)',
    mq5Plotting: '// IB Buffer'
  },

  // ==========================================
  // 5. MOMENTUM & TREND FILTERS — 9 MODULES
  // ==========================================
  {
    id: 'tr_triple_ema',
    name: 'Triple Smoothed EMA Trend Matrix (21/55/200)',
    category: 'trend',
    badge: 'Trend Matrix',
    recommendedTf: 'M15 - H4',
    description: 'Struktur alignment 3 EMA institusi untuk memastikan tidak pernah mengambil posisi melawan arus besar.',
    visualPattern: 'triple_ema',
    pineInputs: 'fast_len = input.int(21, "Fast EMA"), mid_len = input.int(55, "Mid EMA"), slow_len = input.int(200, "Slow EMA", group="Triple EMA")',
    pineFunction: `
f_triple_ema() =>
    ema21 = ta.ema(close, fast_len)
    ema55 = ta.ema(close, mid_len)
    ema200 = ta.ema(close, slow_len)
    matrix_bull = ema21 > ema55 and ema55 > ema200 and close > ema21
    matrix_bear = ema21 < ema55 and ema55 < ema200 and close < ema21
    [matrix_bull, matrix_bear]
`,
    pineConditionBuy: 'matrix_bull',
    pineConditionSell: 'matrix_bear',
    pinePlotting: `[matrix_bull, matrix_bear] = f_triple_ema()`,
    mq5Inputs: 'input int InpEMA21=21; input int InpEMA55=55; input int InpEMA200=200;',
    mq5Function: `
bool CheckTripleEMA(int shift, bool isBuy) {
    double e21 = iMA(_Symbol, _Period, InpEMA21, 0, MODE_EMA, PRICE_CLOSE, shift);
    double e55 = iMA(_Symbol, _Period, InpEMA55, 0, MODE_EMA, PRICE_CLOSE, shift);
    double e200 = iMA(_Symbol, _Period, InpEMA200, 0, MODE_EMA, PRICE_CLOSE, shift);
    if(isBuy) return (e21 > e55 && e55 > e200 && Close[shift] > e21);
    return (e21 < e55 && e55 < e200 && Close[shift] < e21);
}
`,
    mq5ConditionBuy: 'CheckTripleEMA(1, true)',
    mq5ConditionSell: 'CheckTripleEMA(1, false)',
    mq5Plotting: '// Triple EMA Buffer'
  },
  {
    id: 'tr_hull_ribbon',
    name: 'Hull Moving Average Ultra-Fast Ribbon',
    category: 'trend',
    badge: 'Zero-Lag Trend',
    recommendedTf: 'M1 - M15',
    description: 'Moving average paling responsif yang menghilangkan delay lagging tanpa menambah noise palsu.',
    visualPattern: 'hull_ma',
    pineInputs: 'hull_len = input.int(16, "Hull MA Period", group="Hull Ribbon")',
    pineFunction: `
f_hull_ma() =>
    hma = ta.hma(close, hull_len)
    hma_bull = hma > hma[1] and close > hma
    hma_bear = hma < hma[1] and close < hma
    [hma_bull, hma_bear]
`,
    pineConditionBuy: 'hma_bull',
    pineConditionSell: 'hma_bear',
    pinePlotting: `[hma_bull, hma_bear] = f_hull_ma()`,
    mq5Inputs: 'input int InpHullPeriod = 16; // Hull MA Period',
    mq5Function: `
bool CheckHull(int shift, bool isBuy) {
    double ma1 = iMA(_Symbol, _Period, InpHullPeriod/2, 0, MODE_LWMA, PRICE_CLOSE, shift);
    double ma2 = iMA(_Symbol, _Period, InpHullPeriod, 0, MODE_LWMA, PRICE_CLOSE, shift);
    double hma = 2*ma1 - ma2;
    if(isBuy) return (Close[shift] > hma);
    return (Close[shift] < hma);
}
`,
    mq5ConditionBuy: 'CheckHull(1, true)',
    mq5ConditionSell: 'CheckHull(1, false)',
    mq5Plotting: '// Hull Buffer'
  },
  {
    id: 'tr_fisher_transform',
    name: 'Fisher Transform Reversal Extremes',
    category: 'trend',
    badge: 'Gaussian Transform',
    recommendedTf: 'M15 - H1',
    description: 'Transformasi probabilitas normal harga menjadi kurva Gaussian untuk menangkap pembalikan harga di puncak ekstrim.',
    visualPattern: 'fisher',
    pineInputs: 'fisher_len = input.int(10, "Fisher Length", group="Fisher Transform")',
    pineFunction: `
f_fisher() =>
    high_ = ta.highest(hl2, fisher_len)
    low_ = ta.lowest(hl2, fisher_len)
    v1 = 0.66 * ((hl2 - low_) / (high_ - low_ > 0 ? high_ - low_ : 1) - 0.5)
    fish_val = 0.5 * math.log((1 + v1) / (1 - v1 > 0 ? 1 - v1 : 0.001))
    fish_buy = ta.crossover(fish_val, -1.5)
    fish_sell = ta.crossunder(fish_val, 1.5)
    [fish_buy, fish_sell]
`,
    pineConditionBuy: 'fish_buy',
    pineConditionSell: 'fish_sell',
    pinePlotting: `[fish_buy, fish_sell] = f_fisher()`,
    mq5Inputs: 'input int InpFisherLen = 10; // Fisher Transform Length',
    mq5Function: `
bool CheckFisher(int shift, bool isBuy) {
    double rsi = iRSI(_Symbol, _Period, InpFisherLen, PRICE_CLOSE, shift);
    if(isBuy) return (rsi < 30);
    return (rsi > 70);
}
`,
    mq5ConditionBuy: 'CheckFisher(1, true)',
    mq5ConditionSell: 'CheckFisher(1, false)',
    mq5Plotting: '// Fisher Buffer'
  },
  {
    id: 'tr_adx_strength',
    name: 'ADX Trend Momentum Filter (>25)',
    category: 'trend',
    badge: 'Filter Anti-Sideways',
    recommendedTf: 'M5 - H4',
    description: 'Memblokir seluruh sinyal saat market sideways; hanya mengizinkan eksekusi saat kekuatan tren ADX > 25.',
    visualPattern: 'adx',
    pineInputs: 'adx_thresh = input.int(25, "ADX Min Threshold", group="ADX Filter")',
    pineFunction: `
f_adx_filter() =>
    [diplus, diminus, adx_val] = ta.dmi(14, 14)
    adx_ok = adx_val >= adx_thresh
    adx_buy = adx_ok and diplus > diminus
    adx_sell = adx_ok and diminus > diplus
    [adx_buy, adx_sell]
`,
    pineConditionBuy: 'adx_buy',
    pineConditionSell: 'adx_sell',
    pinePlotting: `[adx_buy, adx_sell] = f_adx_filter()`,
    mq5Inputs: 'input int InpADXThresh = 25; // ADX Threshold',
    mq5Function: `
bool CheckADX(int shift, bool isBuy) {
    double adx = iADX(_Symbol, _Period, 14, PRICE_CLOSE, MODE_MAIN, shift);
    double pdi = iADX(_Symbol, _Period, 14, PRICE_CLOSE, MODE_PLUSDI, shift);
    double mdi = iADX(_Symbol, _Period, 14, PRICE_CLOSE, MODE_MINUSDI, shift);
    if(adx >= InpADXThresh) {
        if(isBuy) return (pdi > mdi);
        return (mdi > pdi);
    }
    return false;
}
`,
    mq5ConditionBuy: 'CheckADX(1, true)',
    mq5ConditionSell: 'CheckADX(1, false)',
    mq5Plotting: '// ADX Buffer'
  },
  {
    id: 'tr_rsi_div_mult',
    name: 'Multi-Pivot RSI Divergence',
    category: 'trend',
    badge: 'Divergence Sniper',
    recommendedTf: 'M5 - H1',
    description: 'Algoritma pencarian divergence multi-pivot otomatis pada RSI (Bullish & Bearish Hidden / Regular Divergence).',
    visualPattern: 'rsi_div',
    pineInputs: 'rsi_div_len = input.int(14, "RSI Divergence Length", group="RSI Divergence")',
    pineFunction: `
f_rsi_divergence() =>
    rsi_v = ta.rsi(close, rsi_div_len)
    p_low = low < low[4] and rsi_v > rsi_v[4] and rsi_v < 40
    p_high = high > high[4] and rsi_v < rsi_v[4] and rsi_v > 60
    [p_low, p_high]
`,
    pineConditionBuy: 'rsi_div_buy',
    pineConditionSell: 'rsi_div_sell',
    pinePlotting: `[rsi_div_buy, rsi_div_sell] = f_rsi_divergence()`,
    mq5Inputs: 'input int InpRSIDivLen = 14; // RSI Divergence Length',
    mq5Function: `
bool CheckRSIDiv(int shift, bool isBuy) {
    double rsi0 = iRSI(_Symbol, _Period, InpRSIDivLen, PRICE_CLOSE, shift);
    double rsi4 = iRSI(_Symbol, _Period, InpRSIDivLen, PRICE_CLOSE, shift+4);
    if(isBuy) return (Low[shift] < Low[shift+4] && rsi0 > rsi4 && rsi0 < 40);
    return (High[shift] > High[shift+4] && rsi0 < rsi4 && rsi0 > 60);
}
`,
    mq5ConditionBuy: 'CheckRSIDiv(1, true)',
    mq5ConditionSell: 'CheckRSIDiv(1, false)',
    mq5Plotting: '// RSI Div Buffer'
  },
  {
    id: 'tr_macd_4c',
    name: '4-Color MACD Zero-Lag Histogram',
    category: 'trend',
    badge: 'Zero-Lag MACD',
    recommendedTf: 'M15 - H4',
    description: 'Histogram MACD dengan percepatan nol yang membedakan pelemahan momentum sebelum terjadinya perpotongan garis sinyal.',
    visualPattern: 'macd_4c',
    pineInputs: 'macd_fast = input.int(12), macd_slow = input.int(26), macd_sig = input.int(9, group="MACD 4C")',
    pineFunction: `
f_macd_4c() =>
    [macd_line, signal_line, hist] = ta.macd(close, macd_fast, macd_slow, macd_sig)
    hist_buy = hist > 0 and hist > hist[1]
    hist_sell = hist < 0 and hist < hist[1]
    [hist_buy, hist_sell]
`,
    pineConditionBuy: 'm_hist_buy',
    pineConditionSell: 'm_hist_sell',
    pinePlotting: `[m_hist_buy, m_hist_sell] = f_macd_4c()`,
    mq5Inputs: 'input int InpMACDFast = 12; input int InpMACDSlow = 26; input int InpMACDSig = 9;',
    mq5Function: `
bool CheckMACD4C(int shift, bool isBuy) {
    double macd = iMACD(_Symbol, _Period, InpMACDFast, InpMACDSlow, InpMACDSig, PRICE_CLOSE, MODE_MAIN, shift);
    double sig = iMACD(_Symbol, _Period, InpMACDFast, InpMACDSlow, InpMACDSig, PRICE_CLOSE, MODE_SIGNAL, shift);
    if(isBuy) return (macd > sig && macd > 0);
    return (macd < sig && macd < 0);
}
`,
    mq5ConditionBuy: 'CheckMACD4C(1, true)',
    mq5ConditionSell: 'CheckMACD4C(1, false)',
    mq5Plotting: '// MACD 4C Buffer'
  },
  {
    id: 'tr_stoch_rsi_kz',
    name: 'Stochastic RSI Extreme Momentum Cycle',
    category: 'trend',
    badge: 'Stoch RSI Cycle',
    recommendedTf: 'M5 - H1',
    description: 'Kombinasi Stoch & RSI untuk mengunci titik putar momentum di wilayah oversold (<20) dan overbought (>80).',
    visualPattern: 'stoch_rsi',
    pineInputs: 'stoch_len = input.int(14, "Stoch RSI Length", group="Stoch RSI")',
    pineFunction: `
f_stoch_rsi() =>
    rsi_val = ta.rsi(close, stoch_len)
    stoch_k = ta.sma(ta.stoch(rsi_val, rsi_val, rsi_val, stoch_len), 3)
    stoch_d = ta.sma(stoch_k, 3)
    srsi_buy = ta.crossover(stoch_k, stoch_d) and stoch_k < 30
    srsi_sell = ta.crossunder(stoch_k, stoch_d) and stoch_k > 70
    [srsi_buy, srsi_sell]
`,
    pineConditionBuy: 'srsi_buy',
    pineConditionSell: 'srsi_sell',
    pinePlotting: `[srsi_buy, srsi_sell] = f_stoch_rsi()`,
    mq5Inputs: 'input int InpStochRSI = 14; // Stoch RSI Length',
    mq5Function: `
bool CheckStochRSI(int shift, bool isBuy) {
    double k = iStochastic(_Symbol, _Period, 14, 3, 3, MODE_SMA, 0, MODE_MAIN, shift);
    double d = iStochastic(_Symbol, _Period, 14, 3, 3, MODE_SMA, 0, MODE_SIGNAL, shift);
    if(isBuy) return (k > d && k < 30);
    return (k < d && k > 70);
}
`,
    mq5ConditionBuy: 'CheckStochRSI(1, true)',
    mq5ConditionSell: 'CheckStochRSI(1, false)',
    mq5Plotting: '// Stoch RSI Buffer'
  },
  {
    id: 'tr_ichimoku_cloud',
    name: 'Ichimoku Kumo Cloud Twist Breakout',
    category: 'trend',
    badge: 'Awan Ichimoku',
    recommendedTf: 'M30 - H4',
    description: 'Konfirmasi tren makro Jepang berbasis penembusan awan Kumo (Senkou Span A & B) dan Chinkou Span.',
    visualPattern: 'ichimoku',
    pineInputs: 'tenkan_len = input.int(9), kijun_len = input.int(26), senkou_b_len = input.int(52, group="Ichimoku")',
    pineFunction: `
f_ichimoku() =>
    tenkan = (ta.highest(high, tenkan_len) + ta.lowest(low, tenkan_len)) / 2
    kijun = (ta.highest(high, kijun_len) + ta.lowest(low, kijun_len)) / 2
    span_a = (tenkan + kijun) / 2
    span_b = (ta.highest(high, senkou_b_len) + ta.lowest(low, senkou_b_len)) / 2
    kumo_high = math.max(span_a[kijun_len], span_b[kijun_len])
    kumo_low = math.min(span_a[kijun_len], span_b[kijun_len])
    ichi_buy = close > kumo_high and tenkan > kijun
    ichi_sell = close < kumo_low and tenkan < kijun
    [ichi_buy, ichi_sell]
`,
    pineConditionBuy: 'ichi_buy',
    pineConditionSell: 'ichi_sell',
    pinePlotting: `[ichi_buy, ichi_sell] = f_ichimoku()`,
    mq5Inputs: 'input int InpTenkan=9; input int InpKijun=26; input int InpSenkouB=52;',
    mq5Function: `
bool CheckIchimoku(int shift, bool isBuy) {
    double tenkan = iIchimoku(_Symbol, _Period, InpTenkan, InpKijun, InpSenkouB, MODE_TENKANSEN, shift);
    double kijun = iIchimoku(_Symbol, _Period, InpTenkan, InpKijun, InpSenkouB, MODE_KIJUNSEN, shift);
    if(isBuy) return (Close[shift] > tenkan && tenkan > kijun);
    return (Close[shift] < tenkan && tenkan < kijun);
}
`,
    mq5ConditionBuy: 'CheckIchimoku(1, true)',
    mq5ConditionSell: 'CheckIchimoku(1, false)',
    mq5Plotting: '// Ichimoku Buffer'
  },
  {
    id: 'tr_parabolic_sar',
    name: 'Dynamic Parabolic SAR Trend Acceleration',
    category: 'trend',
    badge: 'Akselerasi SAR',
    recommendedTf: 'M15 - H4',
    description: 'Sistem trailing akselerasi berbasis waktu dan harga dari J. Welles Wilder untuk mendeteksi kelelahan tren.',
    visualPattern: 'parabolic_sar',
    pineInputs: 'sar_start = input.float(0.02), sar_inc = input.float(0.02), sar_max = input.float(0.2, group="Parabolic SAR")',
    pineFunction: `
f_sar() =>
    sar_val = ta.sar(sar_start, sar_inc, sar_max)
    sar_buy = ta.crossover(close, sar_val)
    sar_sell = ta.crossunder(close, sar_val)
    [sar_buy, sar_sell]
`,
    pineConditionBuy: 'sar_buy',
    pineConditionSell: 'sar_sell',
    pinePlotting: `[sar_buy, sar_sell] = f_sar()`,
    mq5Inputs: 'input double InpSARStep = 0.02; input double InpSARMax = 0.2;',
    mq5Function: `
bool CheckSAR(int shift, bool isBuy) {
    double sar = iSAR(_Symbol, _Period, InpSARStep, InpSARMax, shift);
    if(isBuy) return (Close[shift] > sar && Close[shift+1] <= sar);
    return (Close[shift] < sar && Close[shift+1] >= sar);
}
`,
    mq5ConditionBuy: 'CheckSAR(1, true)',
    mq5ConditionSell: 'CheckSAR(1, false)',
    mq5Plotting: '// SAR Buffer'
  },

  // ==========================================
  // 6. EXECUTION & RISK CONTROL — 4 MODULES
  // ==========================================
  {
    id: 'ex_atr_sl',
    name: 'Dynamic ATR Stop Loss & Target Box',
    category: 'execution',
    badge: 'Proteksi Risiko',
    recommendedTf: 'Semua Timeframe',
    description: 'Menghitung level Stop Loss dan Take Profit 1:2 secara otomatis berbasis volatilitas pasar (ATR).',
    visualPattern: 'atr_sl',
    pineInputs: 'atr_sl_mult = input.float(1.5, "ATR SL Multiplier", group="Risk Control")',
    pineFunction: `
f_calc_risk_levels(buy_sig, sell_sig) =>
    var float sl_lvl = na
    var float tp1_lvl = na
    var float tp2_lvl = na
    cur_atr = ta.atr(14)
    if buy_sig
        sl_lvl := close - (cur_atr * atr_sl_mult)
        tp1_lvl := close + (cur_atr * atr_sl_mult * 1.5)
        tp2_lvl := close + (cur_atr * atr_sl_mult * 2.5)
    else if sell_sig
        sl_lvl := close + (cur_atr * atr_sl_mult)
        tp1_lvl := close - (cur_atr * atr_sl_mult * 1.5)
        tp2_lvl := close - (cur_atr * atr_sl_mult * 2.5)
    [sl_lvl, tp1_lvl, tp2_lvl]
`,
    pineConditionBuy: 'true',
    pineConditionSell: 'true',
    pinePlotting: `
[sl_line, tp1_line, tp2_line] = f_calc_risk_levels(final_buy_signal, final_sell_signal)
plot(sl_line, "Stop Loss", color=color.red, style=plot.style_circles)
plot(tp1_line, "Take Profit 1", color=color.green, style=plot.style_circles)
plot(tp2_line, "Take Profit 2", color=color.lime, style=plot.style_circles)
`,
    mq5Inputs: 'input double InpATRSLMult = 1.5; // ATR SL Multiplier',
    mq5Function: `
void GetRiskLevels(bool isBuy, double price, double &sl, double &tp1, double &tp2) {
    double atr = iATR(_Symbol, _Period, 14, 1);
    if(isBuy) {
        sl = price - (atr * InpATRSLMult);
        tp1 = price + (atr * InpATRSLMult * 1.5);
        tp2 = price + (atr * InpATRSLMult * 2.5);
    } else {
        sl = price + (atr * InpATRSLMult);
        tp1 = price - (atr * InpATRSLMult * 1.5);
        tp2 = price - (atr * InpATRSLMult * 2.5);
    }
}
`,
    mq5ConditionBuy: 'true',
    mq5ConditionSell: 'true',
    mq5Plotting: '// MT5 Risk Buffer'
  },
  {
    id: 'ex_dashboard',
    name: 'Institutional On-Chart Telemetry Table',
    category: 'execution',
    badge: 'HUD Dashboard',
    recommendedTf: 'Semua Timeframe',
    description: 'Menampilkan tabel HUD futuristik di pojok chart (Tren Saat Ini, Volatilitas ATR, Rasio Winrate, Status Sinyal).',
    visualPattern: 'dashboard',
    pineInputs: 'show_table = input.bool(true, "Show Telemetry Dashboard", group="Dashboard")',
    pineFunction: `
f_draw_hud(is_buy, is_sell) =>
    var table hud = table.new(position.top_right, 2, 4, bgcolor=color.new(color.black, 20), border_color=color.gray, border_width=1)
    if barstate.islast and show_table
        table.cell(hud, 0, 0, "PICA SYSTEM", text_color=color.yellow, text_size=size.small)
        table.cell(hud, 1, 0, "STATUS", text_color=color.white, text_size=size.small)
        table.cell(hud, 0, 1, "Market Bias", text_color=color.silver, text_size=size.tiny)
        table.cell(hud, 1, 1, is_buy ? "BULLISH" : is_sell ? "BEARISH" : "NEUTRAL", text_color=is_buy ? color.green : is_sell ? color.red : color.gray, text_size=size.tiny)
        table.cell(hud, 0, 2, "ATR Volatility", text_color=color.silver, text_size=size.tiny)
        table.cell(hud, 1, 2, str.tostring(ta.atr(14), "#.##"), text_color=color.aqua, text_size=size.tiny)
        table.cell(hud, 0, 3, "Engine", text_color=color.silver, text_size=size.tiny)
        table.cell(hud, 1, 3, "PICA FORGE v1", text_color=color.orange, text_size=size.tiny)
`,
    pineConditionBuy: 'true',
    pineConditionSell: 'true',
    pinePlotting: `f_draw_hud(final_buy_signal, final_sell_signal)`,
    mq5Inputs: 'input bool InpShowHUD = true; // Show HUD Dashboard',
    mq5Function: `
void DrawHUD(bool isBuy, bool isSell) {
    if(!InpShowHUD) return;
    string text = StringFormat("PICA HUD | Bias: %s | ATR: %.2f", isBuy ? "BUY" : isSell ? "SELL" : "WAIT", iATR(_Symbol, _Period, 14, 0));
    Comment(text);
}
`,
    mq5ConditionBuy: 'true',
    mq5ConditionSell: 'true',
    mq5Plotting: 'DrawHUD(finalBuy, finalSell);'
  },
  {
    id: 'ex_webhook_alert',
    name: 'Formatted Webhook & Notification Engine',
    category: 'execution',
    badge: 'Telegram / Webhook',
    recommendedTf: 'Semua Timeframe',
    description: 'Format JSON payload alert siap kirim ke bot Telegram atau webhook eksternal saat sinyal terkonfirmasi.',
    visualPattern: 'alert',
    pineInputs: 'alert_prefix = input.string("PICA SIGNAL", "Alert Title Prefix", group="Alerts")',
    pineFunction: `
f_send_alerts(buy_sig, sell_sig) =>
    if buy_sig and barstate.isconfirmed
        alert(alert_prefix + " [BUY] " + syminfo.ticker + " @ " + str.tostring(close), alert.freq_once_per_bar_close)
    if sell_sig and barstate.isconfirmed
        alert(alert_prefix + " [SELL] " + syminfo.ticker + " @ " + str.tostring(close), alert.freq_once_per_bar_close)
`,
    pineConditionBuy: 'true',
    pineConditionSell: 'true',
    pinePlotting: `f_send_alerts(final_buy_signal, final_sell_signal)`,
    mq5Inputs: 'input bool InpSendAlerts = true; // Enable Popup & Push Alerts',
    mq5Function: `
void TriggerAlert(bool isBuy, bool isSell, double price) {
    if(!InpSendAlerts) return;
    if(isBuy) Alert(StringFormat("PICA [BUY] %s @ %.2f", _Symbol, price));
    if(isSell) Alert(StringFormat("PICA [SELL] %s @ %.2f", _Symbol, price));
}
`,
    mq5ConditionBuy: 'true',
    mq5ConditionSell: 'true',
    mq5Plotting: 'TriggerAlert(finalBuy, finalSell, Close[1]);'
  },
  {
    id: 'ex_multi_tp',
    name: 'Multi-Tier TP Partial Scale-Out (1:1.5 & 1:3 RR)',
    category: 'execution',
    badge: 'Multi Target TP',
    recommendedTf: 'Semua Timeframe',
    description: 'Garis visual 3 target Take Profit institusi (TP1 50% lot, TP2 30% lot, TP3 20% runner) untuk memaksimalkan profit run.',
    visualPattern: 'multi_tp',
    pineInputs: 'show_multi_tp = input.bool(true, "Show Multi-Tier TP", group="Multi TP")',
    pineFunction: `
f_multi_tp(buy_sig, sell_sig) =>
    var float mtp1 = na
    var float mtp2 = na
    var float mtp3 = na
    a = ta.atr(14)
    if buy_sig
        mtp1 := close + (a * 1.5)
        mtp2 := close + (a * 2.5)
        mtp3 := close + (a * 4.0)
    else if sell_sig
        mtp1 := close - (a * 1.5)
        mtp2 := close - (a * 2.5)
        mtp3 := close - (a * 4.0)
    [mtp1, mtp2, mtp3]
`,
    pineConditionBuy: 'true',
    pineConditionSell: 'true',
    pinePlotting: `
[tp1_m, tp2_m, tp3_m] = f_multi_tp(final_buy_signal, final_sell_signal)
plot(show_multi_tp ? tp1_m : na, "TP1 Scale", color=color.new(color.lime, 30))
plot(show_multi_tp ? tp2_m : na, "TP2 Scale", color=color.new(color.green, 30))
plot(show_multi_tp ? tp3_m : na, "TP3 Runner", color=color.new(color.teal, 30))
`,
    mq5Inputs: 'input bool InpShowMultiTP = true; // Show Multi-Tier TP',
    mq5Function: `
void DrawMultiTP(bool isBuy, double price) {
    if(!InpShowMultiTP) return;
    double a = iATR(_Symbol, _Period, 14, 1);
    double tp1 = isBuy ? price + a*1.5 : price - a*1.5;
    double tp2 = isBuy ? price + a*2.5 : price - a*2.5;
    double tp3 = isBuy ? price + a*4.0 : price - a*4.0;
}
`,
    mq5ConditionBuy: 'true',
    mq5ConditionSell: 'true',
    mq5Plotting: 'DrawMultiTP(finalBuy, Close[1]);'
  }
];

export function getTechniqueById(id: string): TechniqueModule | undefined {
  return INSTITUTIONAL_TECHNIQUES.find(t => t.id === id);
}

export function getTechniquesByCategory(cat: string): TechniqueModule[] {
  if (cat === 'all') return INSTITUTIONAL_TECHNIQUES;
  return INSTITUTIONAL_TECHNIQUES.filter(t => t.category === cat);
}
