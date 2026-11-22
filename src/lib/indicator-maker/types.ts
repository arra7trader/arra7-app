// Types for PICA INDICATOR MAKER (TradingView v5 & MetaTrader 5)

export type PlatformTarget = 'tradingview' | 'mt5';

export type TechniqueCategory = 
  | 'smc' 
  | 'orderflow' 
  | 'volatility' 
  | 'sessions' 
  | 'trend' 
  | 'execution';

export interface TechniqueModule {
  id: string;
  name: string;
  category: TechniqueCategory;
  badge: string;
  recommendedTf: string;
  description: string;
  visualPattern: string; // SVG path or pattern type
  pineFunction: string;
  pineInputs: string;
  pineConditionBuy: string;
  pineConditionSell: string;
  pinePlotting: string;
  mq5Function: string;
  mq5Inputs: string;
  mq5ConditionBuy: string;
  mq5ConditionSell: string;
  mq5Plotting: string;
}

export interface GeneratedScriptResult {
  platform: PlatformTarget;
  code: string;
  filename: string;
  selectedTechniques: string[];
  generatedAt: string;
  cooldownUntil: string;
  dailyRemaining: number;
}

export interface IndicatorMakerStats {
  totalSold: number;
  maxEarlyBirdSlots: number;
  remainingEarlyBirdSlots: number;
  isEarlyBirdActive: boolean;
  earlyBirdPrice: number;
  regularMonthlyPrice: number;
}
