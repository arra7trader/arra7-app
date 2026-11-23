// Types for PICA EA MAKER (MetaTrader 5 Expert Advisor Generator)

export type EAStyle = 'hft' | 'scalping' | 'intraday';

export type EAPair = 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'BTCUSD' | 'UNIVERSAL';

export type EACategory = 'all' | 'smc' | 'orderflow' | 'volatility' | 'sessions' | 'trend' | 'execution';

export type RiskModel = 'fixed_lot' | 'percent_equity';

export interface BacktestTelemetry {
  winRate: number; // Percentage, e.g. 73.5
  profitFactor: number; // e.g. 2.24
  maxDrawdown: number; // e.g. 4.9%
  totalTrades: number; // e.g. 240
  expectedPayoffPips: number; // e.g. 14.8 pips
  monthlyReturnEst: number; // e.g. 22.4%
  sharpeRatio: number; // e.g. 2.18
  equityCurve: { trade: number; equity: number; isWin: boolean }[];
}

export interface EAModule {
  id: string;
  name: string;
  category: string;
  style: EAStyle[];
  pairs: EAPair[];
  recommendedTf: string;
  badge: string;
  description: string;
  baseWinRate: number;
  baseProfitFactor: number;
  baseDrawdown: number;
  mq5Inputs: string;
  mq5Function: string;
  mq5ConditionBuy: string;
  mq5ConditionSell: string;
}

export interface EACompileOptions {
  customName?: string;
  style: EAStyle;
  pair: EAPair;
  moduleIds: string[];
  licenseCode?: string;
  riskModel?: RiskModel;
  fixedLot?: number;
  riskPercent?: number;
  useAtrSlTp?: boolean;
  atrMultiplierSl?: number;
  atrMultiplierTp?: number;
  useTrailingStop?: boolean;
  trailingStopPoints?: number;
  useBreakEven?: boolean;
  breakEvenTriggerPoints?: number;
  maxSpreadPoints?: number;
  magicNumber?: number;
}

export interface EACompileResult {
  code: string;
  filename: string;
  eaName: string;
  style: EAStyle;
  pair: EAPair;
  moduleNames: string[];
  telemetry: BacktestTelemetry;
  generatedAt: string;
}
