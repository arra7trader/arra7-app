//+------------------------------------------------------------------+
//|                                ARRA7_Asian_Sweep_Reversal_EA.mq4 |
//|                                        Copyright 2024, ARRA7    |
//|                                   https://arra7-app.vercel.app  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, ARRA7 Trading"
#property link      "https://arra7-app.vercel.app"
#property version   "1.00"
#property strict
#property description "Asian Session Liquidity Sweep Reversal Strategy"
#property description "Mark Asian High/Low, wait for London/NY sweep, entry on reversal"

//--- Input Parameters
input string   InpSettings = "=== Trading Settings ===";
input double   InpRiskPercent = 1.0;              // Risk per trade (%)
input double   InpMaxLotSize = 1.0;               // Maximum lot size
input int      InpMagicNumber = 7779999;          // Magic Number
input int      InpMaxTradesPerDay = 2;            // Max trades per day

input string   InpAsian = "=== Asian Session (WIB) ===";
input int      InpAsianStartHour = 0;             // Asian session start hour (WIB)
input int      InpAsianEndHour = 8;               // Asian session end hour (WIB)

input string   InpSweep = "=== Sweep Settings ===";
input int      InpMinSweepPips = 5;               // Min sweep beyond range (pips)
input int      InpMaxSweepPips = 30;              // Max sweep (avoid breakout)
input double   InpWickPercent = 60;               // Min wick % for reversal

input string   InpSLTP = "=== SL/TP Settings ===";
input bool     InpUseRangeTP = true;              // TP at opposite side of range
input int      InpFixedTPPips = 40;               // Fixed TP if not using range
input int      InpSLPips = 25;                    // Stop loss beyond sweep

//--- Global Variables
double asianHigh = 0;
double asianLow = 0;
bool asianRangeSet = false;
bool highSwept = false;
bool lowSwept = false;
int todayTrades = 0;
datetime lastTradeDate = 0;
datetime rangeSetDate = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("=================================");
    Print("ARRA7 Asian Sweep Reversal EA v1.0");
    Print("Liquidity Sweep Trading Strategy");
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
    ObjectsDeleteAll(0, "ARRA7_AS_");
    Print("Asian Sweep EA stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
    // Reset daily
    if(TimeDay(TimeCurrent()) != TimeDay(lastTradeDate))
    {
        todayTrades = 0;
        lastTradeDate = TimeCurrent();
    }
    
    // Get WIB hour
    int wibHour = GetWIBHour();
    
    // Track Asian session range
    TrackAsianRange(wibHour);
    
    // Draw range on chart
    DrawAsianRange();
    
    // Check for existing position
    if(HasOpenPosition())
    {
        ManagePosition();
        UpdateDashboard();
        return;
    }
    
    // Check max trades
    if(todayTrades >= InpMaxTradesPerDay)
    {
        UpdateDashboard();
        return;
    }
    
    // Only trade after Asian session ends
    if(wibHour >= InpAsianStartHour && wibHour < InpAsianEndHour)
    {
        UpdateDashboard();
        return;
    }
    
    // Check for sweep and reversal
    if(asianRangeSet)
    {
        CheckForSweepReversal();
    }
    
    UpdateDashboard();
}

//+------------------------------------------------------------------+
//| Get WIB hour (UTC+7)                                               |
//+------------------------------------------------------------------+
int GetWIBHour()
{
    return (TimeHour(TimeCurrent()) + 7) % 24;
}

//+------------------------------------------------------------------+
//| Track Asian session high/low                                       |
//+------------------------------------------------------------------+
void TrackAsianRange(int wibHour)
{
    // Reset range at start of new Asian session
    if(wibHour == InpAsianStartHour && TimeDay(TimeCurrent()) != TimeDay(rangeSetDate))
    {
        asianHigh = High[0];
        asianLow = Low[0];
        asianRangeSet = false;
        highSwept = false;
        lowSwept = false;
        Print("New Asian session started. Tracking range...");
    }
    
    // Update range during Asian session
    if(wibHour >= InpAsianStartHour && wibHour < InpAsianEndHour)
    {
        if(High[0] > asianHigh) asianHigh = High[0];
        if(Low[0] < asianLow) asianLow = Low[0];
    }
    
    // Mark range as complete when Asian session ends
    if(wibHour == InpAsianEndHour && !asianRangeSet)
    {
        asianRangeSet = true;
        rangeSetDate = TimeCurrent();
        Print("Asian range set: High=", asianHigh, " Low=", asianLow);
        Print("Range size: ", (asianHigh - asianLow) / Point / 10, " pips");
    }
}

//+------------------------------------------------------------------+
//| Draw Asian range on chart                                          |
//+------------------------------------------------------------------+
void DrawAsianRange()
{
    if(asianHigh == 0 || asianLow == 0) return;
    
    string highLineName = "ARRA7_AS_HighLine";
    string lowLineName = "ARRA7_AS_LowLine";
    
    // Delete old lines
    ObjectDelete(0, highLineName);
    ObjectDelete(0, lowLineName);
    
    if(asianRangeSet)
    {
        // Draw high line
        ObjectCreate(0, highLineName, OBJ_HLINE, 0, 0, asianHigh);
        ObjectSetInteger(0, highLineName, OBJPROP_COLOR, highSwept ? clrGray : clrOrangeRed);
        ObjectSetInteger(0, highLineName, OBJPROP_STYLE, STYLE_DASH);
        ObjectSetInteger(0, highLineName, OBJPROP_WIDTH, 1);
        ObjectSetString(0, highLineName, OBJPROP_TEXT, "Asian High: " + DoubleToStr(asianHigh, (int)MarketInfo(Symbol(), MODE_DIGITS)));
        
        // Draw low line
        ObjectCreate(0, lowLineName, OBJ_HLINE, 0, 0, asianLow);
        ObjectSetInteger(0, lowLineName, OBJPROP_COLOR, lowSwept ? clrGray : clrLimeGreen);
        ObjectSetInteger(0, lowLineName, OBJPROP_STYLE, STYLE_DASH);
        ObjectSetInteger(0, lowLineName, OBJPROP_WIDTH, 1);
        ObjectSetString(0, lowLineName, OBJPROP_TEXT, "Asian Low: " + DoubleToStr(asianLow, (int)MarketInfo(Symbol(), MODE_DIGITS)));
    }
}

//+------------------------------------------------------------------+
//| Check for sweep and reversal signal                                |
//+------------------------------------------------------------------+
void CheckForSweepReversal()
{
    double minSweep = InpMinSweepPips * Point * 10;
    double maxSweep = InpMaxSweepPips * Point * 10;
    
    // Check for HIGH sweep (Bearish initially, but reversal = BUY signal if close back below)
    // Actually: Sweep high + close below = SELL continuation
    // Sweep low + close above = BUY continuation
    
    // Let's implement: Sweep = stop hunt, then reversal
    
    // LOW SWEEP (Bullish reversal)
    // Price went below Asian low but closed back above
    if(!lowSwept)
    {
        double sweepAmount = asianLow - Low[1];
        if(sweepAmount >= minSweep && sweepAmount <= maxSweep && Close[1] > asianLow)
        {
            // Check wick percentage (rejection)
            double totalRange = High[1] - Low[1];
            double lowerWick = MathMin(Open[1], Close[1]) - Low[1];
            double wickPercent = (totalRange > 0) ? (lowerWick / totalRange) * 100 : 0;
            
            if(wickPercent >= InpWickPercent)
            {
                lowSwept = true;
                Print("LOW SWEEP detected! Bullish reversal signal");
                ExecuteTrade(1); // BUY
            }
        }
    }
    
    // HIGH SWEEP (Bearish reversal)
    // Price went above Asian high but closed back below
    if(!highSwept)
    {
        double sweepAmount = High[1] - asianHigh;
        if(sweepAmount >= minSweep && sweepAmount <= maxSweep && Close[1] < asianHigh)
        {
            // Check wick percentage (rejection)
            double totalRange = High[1] - Low[1];
            double upperWick = High[1] - MathMax(Open[1], Close[1]);
            double wickPercent = (totalRange > 0) ? (upperWick / totalRange) * 100 : 0;
            
            if(wickPercent >= InpWickPercent)
            {
                highSwept = true;
                Print("HIGH SWEEP detected! Bearish reversal signal");
                ExecuteTrade(-1); // SELL
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Execute trade                                                       |
//+------------------------------------------------------------------+
void ExecuteTrade(int signal)
{
    double lotSize = CalculateLotSize();
    double sl, tp;
    double rangeSize = asianHigh - asianLow;
    int ticket = 0;
    
    if(signal == 1) // BUY (after low sweep)
    {
        sl = Low[1] - InpSLPips * Point * 10;
        tp = InpUseRangeTP ? asianHigh : Ask + InpFixedTPPips * Point * 10;
        
        ticket = OrderSend(Symbol(), OP_BUY, lotSize, Ask, 3, sl, tp,
                          "ARRA7 Asian Sweep BUY", InpMagicNumber, 0, clrGreen);
    }
    else if(signal == -1) // SELL (after high sweep)
    {
        sl = High[1] + InpSLPips * Point * 10;
        tp = InpUseRangeTP ? asianLow : Bid - InpFixedTPPips * Point * 10;
        
        ticket = OrderSend(Symbol(), OP_SELL, lotSize, Bid, 3, sl, tp,
                          "ARRA7 Asian Sweep SELL", InpMagicNumber, 0, clrRed);
    }
    
    if(ticket > 0)
    {
        todayTrades++;
        Print("Order executed! Ticket: ", ticket);
        Alert("🌏 Asian Sweep ", (signal == 1 ? "BUY" : "SELL"), " executed!");
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
                double rangeSize = asianHigh - asianLow;
                
                // Move to BE after 50% of range
                if(OrderType() == OP_BUY)
                {
                    double currentProfit = Bid - openPrice;
                    if(currentProfit >= rangeSize * 0.5 && OrderStopLoss() < openPrice)
                    {
                        OrderModify(OrderTicket(), openPrice, openPrice + 3 * Point * 10, OrderTakeProfit(), 0, clrBlue);
                    }
                }
                else if(OrderType() == OP_SELL)
                {
                    double currentProfit = openPrice - Ask;
                    if(currentProfit >= rangeSize * 0.5 && OrderStopLoss() > openPrice)
                    {
                        OrderModify(OrderTicket(), openPrice, openPrice - 3 * Point * 10, OrderTakeProfit(), 0, clrBlue);
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
    
    ObjectCreate(0, "ARRA7_AS_BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
    ObjectSetInteger(0, "ARRA7_AS_BG", OBJPROP_XDISTANCE, x);
    ObjectSetInteger(0, "ARRA7_AS_BG", OBJPROP_YDISTANCE, y);
    ObjectSetInteger(0, "ARRA7_AS_BG", OBJPROP_XSIZE, width);
    ObjectSetInteger(0, "ARRA7_AS_BG", OBJPROP_YSIZE, height);
    ObjectSetInteger(0, "ARRA7_AS_BG", OBJPROP_BGCOLOR, C'20,22,30');
    ObjectSetInteger(0, "ARRA7_AS_BG", OBJPROP_BORDER_COLOR, C'50,50,70');
    ObjectSetInteger(0, "ARRA7_AS_BG", OBJPROP_CORNER, CORNER_LEFT_UPPER);
    
    CreateLabel("ARRA7_AS_Title", "🌏 Asian Sweep Reversal", x + 10, y + 10, clrWhite, 10);
    CreateLabel("ARRA7_AS_Session", "Session: -", x + 10, y + 35, clrGray, 8);
    CreateLabel("ARRA7_AS_High", "Asian High: -", x + 10, y + 55, clrOrangeRed, 8);
    CreateLabel("ARRA7_AS_Low", "Asian Low: -", x + 10, y + 75, clrLimeGreen, 8);
    CreateLabel("ARRA7_AS_Range", "Range: - pips", x + 10, y + 95, clrWhite, 8);
    CreateLabel("ARRA7_AS_Status", "Status: Waiting...", x + 10, y + 115, clrYellow, 8);
    CreateLabel("ARRA7_AS_Trades", "Trades: 0/2", x + 10, y + 135, clrWhite, 8);
    CreateLabel("ARRA7_AS_Footer", "arra7-app.vercel.app", x + 10, y + 170, clrDodgerBlue, 8);
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
    int wibHour = GetWIBHour();
    bool isAsianSession = (wibHour >= InpAsianStartHour && wibHour < InpAsianEndHour);
    
    string sessionText = isAsianSession ? "🌙 Asian Session (Tracking)" : "☀️ London/NY (Trading)";
    ObjectSetString(0, "ARRA7_AS_Session", OBJPROP_TEXT, "Session: " + sessionText);
    
    if(asianHigh > 0)
    {
        ObjectSetString(0, "ARRA7_AS_High", OBJPROP_TEXT, "Asian High: " + DoubleToStr(asianHigh, (int)MarketInfo(Symbol(), MODE_DIGITS)) + (highSwept ? " ✓ SWEPT" : ""));
        ObjectSetString(0, "ARRA7_AS_Low", OBJPROP_TEXT, "Asian Low: " + DoubleToStr(asianLow, (int)MarketInfo(Symbol(), MODE_DIGITS)) + (lowSwept ? " ✓ SWEPT" : ""));
        ObjectSetString(0, "ARRA7_AS_Range", OBJPROP_TEXT, "Range: " + DoubleToStr((asianHigh - asianLow) / Point / 10, 1) + " pips");
    }
    
    string status;
    if(HasOpenPosition())
        status = "📊 Managing position";
    else if(todayTrades >= InpMaxTradesPerDay)
        status = "⛔ Max trades reached";
    else if(isAsianSession)
        status = "🌙 Tracking Asian range...";
    else if(!asianRangeSet)
        status = "⏳ Waiting for Asian range";
    else
        status = "🔍 Looking for sweep...";
    
    ObjectSetString(0, "ARRA7_AS_Status", OBJPROP_TEXT, "Status: " + status);
    ObjectSetString(0, "ARRA7_AS_Trades", OBJPROP_TEXT, "Trades: " + IntegerToString(todayTrades) + "/" + IntegerToString(InpMaxTradesPerDay));
    
    ChartRedraw();
}
//+------------------------------------------------------------------+
