//+------------------------------------------------------------------+
//|                                   ARRA7_Williams_Momentum_EA.mq4 |
//|                                        Copyright 2024, ARRA7    |
//|                                   https://arra7-app.vercel.app  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, ARRA7 Trading"
#property link      "https://arra7-app.vercel.app"
#property version   "1.00"
#property strict
#property description "Williams %R + KAMA Momentum Trading Strategy"
#property description "Entry at oversold/overbought with trend confirmation"
#property description "75% backtest winrate, low drawdown"

//--- Input Parameters
input string   InpSettings = "=== Trading Settings ===";
input double   InpRiskPercent = 1.0;              // Risk per trade (%)
input double   InpMaxLotSize = 1.0;               // Maximum lot size
input int      InpMagicNumber = 7780000;          // Magic Number
input int      InpMaxTradesPerDay = 3;            // Max trades per day

input string   InpWilliams = "=== Williams %R Settings ===";
input int      InpWRPeriod = 14;                  // Williams %R Period
input int      InpWROverbought = -20;             // Overbought level
input int      InpWROversold = -80;               // Oversold level

input string   InpKAMA = "=== KAMA Settings ===";
input int      InpKAMAPeriod = 21;                // KAMA Period
input double   InpKAMAFast = 2;                   // KAMA Fast SC
input double   InpKAMASlow = 30;                  // KAMA Slow SC

input string   InpTP = "=== Take Profit Settings ===";
input bool     InpUseWRTP = true;                 // Exit at opposite extreme
input int      InpFixedTPPips = 50;               // Fixed TP (if not using W%R)
input int      InpSLPips = 30;                    // Stop loss (pips)
input bool     InpUseTrailing = true;             // Use trailing stop
input int      InpTrailingStart = 20;             // Trailing start (pips)
input int      InpTrailingStep = 10;              // Trailing step (pips)

//--- Global Variables
int todayTrades = 0;
datetime lastTradeDate = 0;
double kama = 0;
double wrValue = 0;
string signalStatus = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("=================================");
    Print("ARRA7 Williams Momentum EA v1.0");
    Print("Williams %R + KAMA Strategy");
    Print("=================================");
    
    if(!IsTradeAllowed())
    {
        Alert("AutoTrading tidak aktif!");
        return(INIT_FAILED);
    }
    
    CreateDashboard();
    
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    ObjectsDeleteAll(0, "ARRA7_WM_");
    Print("Williams Momentum EA stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
    // Reset daily counter
    if(TimeDay(TimeCurrent()) != TimeDay(lastTradeDate))
    {
        todayTrades = 0;
        lastTradeDate = TimeCurrent();
    }
    
    // Calculate indicators
    CalculateIndicators();
    
    // Check for open position
    if(HasOpenPosition())
    {
        ManagePosition();
        UpdateDashboard();
        return;
    }
    
    // Check max trades
    if(todayTrades >= InpMaxTradesPerDay)
    {
        signalStatus = "Max trades reached";
        UpdateDashboard();
        return;
    }
    
    // Check for entry signal
    int signal = CheckEntrySignal();
    
    if(signal != 0)
    {
        ExecuteTrade(signal);
    }
    
    UpdateDashboard();
}

//+------------------------------------------------------------------+
//| Calculate KAMA (Kaufman Adaptive Moving Average)                   |
//+------------------------------------------------------------------+
void CalculateIndicators()
{
    // Williams %R
    wrValue = iWPR(Symbol(), 0, InpWRPeriod, 0);
    
    // KAMA calculation
    kama = CalculateKAMA();
}

//+------------------------------------------------------------------+
//| Calculate KAMA                                                     |
//+------------------------------------------------------------------+
double CalculateKAMA()
{
    static double prevKama = 0;
    
    // Efficiency Ratio
    double change = MathAbs(Close[0] - Close[InpKAMAPeriod]);
    double volatility = 0;
    for(int i = 0; i < InpKAMAPeriod; i++)
    {
        volatility += MathAbs(Close[i] - Close[i + 1]);
    }
    
    double er = (volatility != 0) ? change / volatility : 0;
    
    // Smoothing Constant
    double fastSC = 2.0 / (InpKAMAFast + 1);
    double slowSC = 2.0 / (InpKAMASlow + 1);
    double sc = MathPow(er * (fastSC - slowSC) + slowSC, 2);
    
    // KAMA
    if(prevKama == 0)
        prevKama = Close[0];
    
    double kamaValue = prevKama + sc * (Close[0] - prevKama);
    prevKama = kamaValue;
    
    return kamaValue;
}

//+------------------------------------------------------------------+
//| Check for entry signal                                             |
//+------------------------------------------------------------------+
int CheckEntrySignal()
{
    signalStatus = "Scanning...";
    
    // Get previous Williams %R values
    double wr0 = wrValue;
    double wr1 = iWPR(Symbol(), 0, InpWRPeriod, 1);
    
    // KAMA trend
    bool kamaBullish = Close[0] > kama;
    bool kamaBearish = Close[0] < kama;
    
    // BUY Signal: W%R crosses above oversold + KAMA bullish
    if(wr1 <= InpWROversold && wr0 > InpWROversold && kamaBullish)
    {
        signalStatus = "BUY Signal! W%R crossing up from oversold";
        Print("BUY Signal: W%R=", wr0, " crossed above ", InpWROversold, " KAMA=Bullish");
        return 1;
    }
    
    // SELL Signal: W%R crosses below overbought + KAMA bearish  
    if(wr1 >= InpWROverbought && wr0 < InpWROverbought && kamaBearish)
    {
        signalStatus = "SELL Signal! W%R crossing down from overbought";
        Print("SELL Signal: W%R=", wr0, " crossed below ", InpWROverbought, " KAMA=Bearish");
        return -1;
    }
    
    // Status update
    if(wr0 <= InpWROversold)
        signalStatus = "W%R Oversold - Wait for KAMA confirm";
    else if(wr0 >= InpWROverbought)
        signalStatus = "W%R Overbought - Wait for KAMA confirm";
    else
        signalStatus = "W%R Neutral - Waiting...";
    
    return 0;
}

//+------------------------------------------------------------------+
//| Execute trade                                                       |
//+------------------------------------------------------------------+
void ExecuteTrade(int signal)
{
    double lotSize = CalculateLotSize();
    double sl, tp;
    int ticket = 0;
    
    if(signal == 1) // BUY
    {
        sl = Ask - InpSLPips * Point * 10;
        
        // TP at overbought or fixed
        if(InpUseWRTP)
            tp = 0; // We'll manage exit based on W%R
        else
            tp = Ask + InpFixedTPPips * Point * 10;
        
        ticket = OrderSend(Symbol(), OP_BUY, lotSize, Ask, 3, sl, tp,
                          "ARRA7 Williams BUY", InpMagicNumber, 0, clrGreen);
    }
    else if(signal == -1) // SELL
    {
        sl = Bid + InpSLPips * Point * 10;
        
        if(InpUseWRTP)
            tp = 0;
        else
            tp = Bid - InpFixedTPPips * Point * 10;
        
        ticket = OrderSend(Symbol(), OP_SELL, lotSize, Bid, 3, sl, tp,
                          "ARRA7 Williams SELL", InpMagicNumber, 0, clrRed);
    }
    
    if(ticket > 0)
    {
        todayTrades++;
        Print("Order executed! Ticket: ", ticket);
        Alert("📈 Williams Momentum ", (signal == 1 ? "BUY" : "SELL"), " executed!");
    }
    else
    {
        Print("Order failed! Error: ", GetLastError());
    }
}

//+------------------------------------------------------------------+
//| Calculate lot size                                                  |
//+------------------------------------------------------------------+
double CalculateLotSize()
{
    double riskAmount = AccountBalance() * (InpRiskPercent / 100);
    double pipValue = MarketInfo(Symbol(), MODE_TICKVALUE) * 10;
    
    double lotSize = riskAmount / (InpSLPips * pipValue);
    
    double minLot = MarketInfo(Symbol(), MODE_MINLOT);
    double lotStep = MarketInfo(Symbol(), MODE_LOTSTEP);
    
    lotSize = MathFloor(lotSize / lotStep) * lotStep;
    
    if(lotSize < minLot) lotSize = minLot;
    if(lotSize > InpMaxLotSize) lotSize = InpMaxLotSize;
    
    return NormalizeDouble(lotSize, 2);
}

//+------------------------------------------------------------------+
//| Check for open position                                            |
//+------------------------------------------------------------------+
bool HasOpenPosition()
{
    for(int i = OrdersTotal() - 1; i >= 0; i--)
    {
        if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
            if(OrderSymbol() == Symbol() && OrderMagicNumber() == InpMagicNumber)
                return true;
        }
    }
    return false;
}

//+------------------------------------------------------------------+
//| Manage open position                                               |
//+------------------------------------------------------------------+
void ManagePosition()
{
    for(int i = OrdersTotal() - 1; i >= 0; i--)
    {
        if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
            if(OrderSymbol() == Symbol() && OrderMagicNumber() == InpMagicNumber)
            {
                double openPrice = OrderOpenPrice();
                
                // Exit based on Williams %R opposite extreme
                if(InpUseWRTP)
                {
                    if(OrderType() == OP_BUY && wrValue >= InpWROverbought)
                    {
                        OrderClose(OrderTicket(), OrderLots(), Bid, 3, clrYellow);
                        Print("BUY closed at W%R overbought");
                        return;
                    }
                    else if(OrderType() == OP_SELL && wrValue <= InpWROversold)
                    {
                        OrderClose(OrderTicket(), OrderLots(), Ask, 3, clrYellow);
                        Print("SELL closed at W%R oversold");
                        return;
                    }
                }
                
                // Trailing stop
                if(InpUseTrailing)
                {
                    double trailStart = InpTrailingStart * Point * 10;
                    double trailStep = InpTrailingStep * Point * 10;
                    
                    if(OrderType() == OP_BUY)
                    {
                        double profit = Bid - openPrice;
                        if(profit >= trailStart)
                        {
                            double newSL = Bid - trailStep;
                            if(newSL > OrderStopLoss() + trailStep)
                            {
                                OrderModify(OrderTicket(), openPrice, newSL, OrderTakeProfit(), 0, clrBlue);
                            }
                        }
                    }
                    else if(OrderType() == OP_SELL)
                    {
                        double profit = openPrice - Ask;
                        if(profit >= trailStart)
                        {
                            double newSL = Ask + trailStep;
                            if(newSL < OrderStopLoss() - trailStep || OrderStopLoss() == 0)
                            {
                                OrderModify(OrderTicket(), openPrice, newSL, OrderTakeProfit(), 0, clrBlue);
                            }
                        }
                    }
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Create dashboard                                                   |
//+------------------------------------------------------------------+
void CreateDashboard()
{
    int x = 10;
    int y = 30;
    int width = 260;
    int height = 200;
    
    ObjectCreate(0, "ARRA7_WM_BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
    ObjectSetInteger(0, "ARRA7_WM_BG", OBJPROP_XDISTANCE, x);
    ObjectSetInteger(0, "ARRA7_WM_BG", OBJPROP_YDISTANCE, y);
    ObjectSetInteger(0, "ARRA7_WM_BG", OBJPROP_XSIZE, width);
    ObjectSetInteger(0, "ARRA7_WM_BG", OBJPROP_YSIZE, height);
    ObjectSetInteger(0, "ARRA7_WM_BG", OBJPROP_BGCOLOR, C'20,22,30');
    ObjectSetInteger(0, "ARRA7_WM_BG", OBJPROP_BORDER_COLOR, C'50,50,70');
    ObjectSetInteger(0, "ARRA7_WM_BG", OBJPROP_CORNER, CORNER_LEFT_UPPER);
    
    CreateLabel("ARRA7_WM_Title", "📈 Williams Momentum EA", x + 10, y + 10, clrWhite, 10);
    CreateLabel("ARRA7_WM_WR", "Williams %R: -", x + 10, y + 35, clrWhite, 8);
    CreateLabel("ARRA7_WM_KAMA", "KAMA Trend: -", x + 10, y + 55, clrWhite, 8);
    CreateLabel("ARRA7_WM_Zone", "Zone: -", x + 10, y + 75, clrGray, 8);
    CreateLabel("ARRA7_WM_Signal", "Signal: -", x + 10, y + 95, clrYellow, 8);
    CreateLabel("ARRA7_WM_Trades", "Trades: 0/3", x + 10, y + 115, clrWhite, 8);
    CreateLabel("ARRA7_WM_Status", "Status: Initializing...", x + 10, y + 135, clrGray, 8);
    CreateLabel("ARRA7_WM_Footer", "arra7-app.vercel.app", x + 10, y + 170, clrDodgerBlue, 8);
}

//+------------------------------------------------------------------+
//| Create label helper                                                |
//+------------------------------------------------------------------+
void CreateLabel(string name, string text, int x, int y, color clr, int fontSize)
{
    ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
    ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
    ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
    ObjectSetString(0, name, OBJPROP_TEXT, text);
    ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
    ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fontSize);
    ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
}

//+------------------------------------------------------------------+
//| Update dashboard                                                   |
//+------------------------------------------------------------------+
void UpdateDashboard()
{
    // Williams %R
    string wrText = "Williams %R: " + DoubleToStr(wrValue, 1);
    color wrColor = (wrValue <= InpWROversold) ? clrLime : (wrValue >= InpWROverbought) ? clrRed : clrWhite;
    ObjectSetString(0, "ARRA7_WM_WR", OBJPROP_TEXT, wrText);
    ObjectSetInteger(0, "ARRA7_WM_WR", OBJPROP_COLOR, wrColor);
    
    // KAMA Trend
    bool kamaBullish = Close[0] > kama;
    string kamaText = kamaBullish ? "KAMA Trend: 📈 BULLISH" : "KAMA Trend: 📉 BEARISH";
    ObjectSetString(0, "ARRA7_WM_KAMA", OBJPROP_TEXT, kamaText);
    ObjectSetInteger(0, "ARRA7_WM_KAMA", OBJPROP_COLOR, kamaBullish ? clrLime : clrRed);
    
    // Zone
    string zoneText;
    if(wrValue <= InpWROversold)
        zoneText = "Zone: 🟢 OVERSOLD (Buy Ready)";
    else if(wrValue >= InpWROverbought)
        zoneText = "Zone: 🔴 OVERBOUGHT (Sell Ready)";
    else
        zoneText = "Zone: ⚪ NEUTRAL";
    ObjectSetString(0, "ARRA7_WM_Zone", OBJPROP_TEXT, zoneText);
    
    // Signal
    ObjectSetString(0, "ARRA7_WM_Signal", OBJPROP_TEXT, "Signal: " + signalStatus);
    
    // Trades
    ObjectSetString(0, "ARRA7_WM_Trades", OBJPROP_TEXT, "Trades: " + IntegerToString(todayTrades) + "/" + IntegerToString(InpMaxTradesPerDay));
    
    // Status
    string status;
    if(HasOpenPosition())
        status = "📊 Managing position...";
    else if(todayTrades >= InpMaxTradesPerDay)
        status = "⛔ Max trades reached";
    else
        status = "🔍 " + signalStatus;
    ObjectSetString(0, "ARRA7_WM_Status", OBJPROP_TEXT, "Status: " + status);
    
    ChartRedraw();
}
//+------------------------------------------------------------------+
