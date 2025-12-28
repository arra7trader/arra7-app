//+------------------------------------------------------------------+
//|                                ARRA7_Silver_Bullet_Scalper_EA.mq4 |
//|                                        Copyright 2024, ARRA7    |
//|                                   https://arra7-app.vercel.app  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, ARRA7 Trading"
#property link      "https://arra7-app.vercel.app"
#property version   "1.00"
#property strict
#property description "ICT Silver Bullet Strategy - Time-based FVG Scalping"
#property description "Trading window: NY AM Session (22:00-23:00 WIB)"

//--- Input Parameters
input string   InpSettings = "=== Trading Settings ===";
input double   InpRiskPercent = 1.0;              // Risk per trade (%)
input double   InpMaxLotSize = 1.0;               // Maximum lot size
input int      InpTargetPips = 30;                // Target profit (pips)
input int      InpStopLossPips = 20;              // Stop loss (pips)
input int      InpMaxTradesPerDay = 2;            // Max trades per day
input int      InpMagicNumber = 7778888;          // Magic Number

input string   InpKillZone = "=== Kill Zone Settings (WIB) ===";
input bool     InpUseLondon = true;               // Trade London Open (15:00-16:00)
input bool     InpUseNYAM = true;                 // Trade NY AM (22:00-23:00) ⭐ BEST
input bool     InpUseNYPM = true;                 // Trade NY PM (02:00-03:00)

input string   InpFVG = "=== FVG Settings ===";
input int      InpFVGMinPips = 5;                 // Min FVG size (pips)
input bool     InpUseHTFFilter = true;            // Use HTF trend filter
input ENUM_TIMEFRAMES InpHTFTimeframe = PERIOD_H1; // HTF Timeframe

input string   InpNews = "=== News Filter ===";
input bool     InpUseNewsFilter = true;           // Avoid high impact news
input int      InpNewsMinutesBefore = 30;         // Minutes before news to stop
input int      InpNewsMinutesAfter = 30;          // Minutes after news to resume

//--- Global Variables
int todayTrades = 0;
datetime lastTradeDate = 0;
bool inKillZone = false;
string currentKillZone = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("=================================");
    Print("ARRA7 Silver Bullet Scalper EA v1.0");
    Print("ICT Strategy - Time-based FVG Scalping");
    Print("=================================");
    
    if(!IsTradeAllowed())
    {
        Alert("AutoTrading tidak aktif!");
        return(INIT_FAILED);
    }
    
    // Validate symbol
    if(StringFind(Symbol(), "XAU") < 0 && StringFind(Symbol(), "GBP") < 0 && StringFind(Symbol(), "EUR") < 0)
    {
        Print("Warning: Strategy works best on XAUUSD, GBPUSD, EURUSD");
    }
    
    // Create dashboard
    CreateDashboard();
    
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    ObjectsDeleteAll(0, "ARRA7_SB_");
    Print("Silver Bullet Scalper EA stopped");
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
    
    // Check if we have pending orders
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
    
    // Check if in Kill Zone
    CheckKillZone();
    
    if(!inKillZone)
    {
        UpdateDashboard();
        return;
    }
    
    // Check for FVG setup
    int signal = CheckFVGSetup();
    
    if(signal != 0)
    {
        ExecuteTrade(signal);
    }
    
    UpdateDashboard();
}

//+------------------------------------------------------------------+
//| Check if currently in Kill Zone (WIB timezone)                     |
//+------------------------------------------------------------------+
void CheckKillZone()
{
    // Get WIB hour (UTC+7)
    // MetaTrader server is usually UTC, so add 7 hours
    int serverHour = TimeHour(TimeCurrent());
    int wibHour = (serverHour + 7) % 24;
    
    inKillZone = false;
    currentKillZone = "";
    
    // London Open: 15:00-16:00 WIB (08:00-09:00 UTC)
    if(InpUseLondon && wibHour == 15)
    {
        inKillZone = true;
        currentKillZone = "London Open (15:00 WIB)";
    }
    
    // NY AM Session: 22:00-23:00 WIB (15:00-16:00 UTC) - BEST
    if(InpUseNYAM && wibHour == 22)
    {
        inKillZone = true;
        currentKillZone = "NY AM ⭐ BEST (22:00 WIB)";
    }
    
    // NY PM Session: 02:00-03:00 WIB (19:00-20:00 UTC previous day)
    if(InpUseNYPM && wibHour == 2)
    {
        inKillZone = true;
        currentKillZone = "NY PM (02:00 WIB)";
    }
}

//+------------------------------------------------------------------+
//| Check for FVG (Fair Value Gap) setup                               |
//+------------------------------------------------------------------+
int CheckFVGSetup()
{
    // Bullish FVG: Low[0] > High[2] (gap up)
    // Bearish FVG: High[0] < Low[2] (gap down)
    
    double minFVGSize = InpFVGMinPips * Point * 10;
    
    // Check HTF trend if enabled
    bool htfBullish = true;
    bool htfBearish = true;
    
    if(InpUseHTFFilter)
    {
        double htfMA = iMA(Symbol(), InpHTFTimeframe, 50, 0, MODE_EMA, PRICE_CLOSE, 0);
        double htfClose = iClose(Symbol(), InpHTFTimeframe, 0);
        
        htfBullish = htfClose > htfMA;
        htfBearish = htfClose < htfMA;
    }
    
    // Check for Bullish FVG
    if(Low[0] > High[2] && (Low[0] - High[2]) >= minFVGSize && htfBullish)
    {
        Print("Bullish FVG detected! Gap: ", (Low[0] - High[2]) / Point, " pips");
        return 1; // BUY signal
    }
    
    // Check for Bearish FVG
    if(High[0] < Low[2] && (Low[2] - High[0]) >= minFVGSize && htfBearish)
    {
        Print("Bearish FVG detected! Gap: ", (Low[2] - High[0]) / Point, " pips");
        return -1; // SELL signal
    }
    
    return 0; // No signal
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
        sl = Ask - InpStopLossPips * Point * 10;
        tp = Ask + InpTargetPips * Point * 10;
        
        ticket = OrderSend(Symbol(), OP_BUY, lotSize, Ask, 3, sl, tp,
                          "ARRA7 Silver Bullet BUY", InpMagicNumber, 0, clrGreen);
    }
    else if(signal == -1) // SELL
    {
        sl = Bid + InpStopLossPips * Point * 10;
        tp = Bid - InpTargetPips * Point * 10;
        
        ticket = OrderSend(Symbol(), OP_SELL, lotSize, Bid, 3, sl, tp,
                          "ARRA7 Silver Bullet SELL", InpMagicNumber, 0, clrRed);
    }
    
    if(ticket > 0)
    {
        todayTrades++;
        Print("Order executed! Ticket: ", ticket, " in ", currentKillZone);
        Alert("🎯 Silver Bullet ", (signal == 1 ? "BUY" : "SELL"), " executed in ", currentKillZone);
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
    
    double lotSize = riskAmount / (InpStopLossPips * pipValue);
    
    // Normalize
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
//| Manage open position (trailing, BE, etc)                           |
//+------------------------------------------------------------------+
void ManagePosition()
{
    for(int i = OrdersTotal() - 1; i >= 0; i--)
    {
        if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
            if(OrderSymbol() == Symbol() && OrderMagicNumber() == InpMagicNumber)
            {
                double profit = OrderProfit();
                double openPrice = OrderOpenPrice();
                
                // Move to breakeven after 50% of target
                if(OrderType() == OP_BUY)
                {
                    double currentProfit = (Bid - openPrice) / Point / 10;
                    if(currentProfit >= InpTargetPips * 0.5 && OrderStopLoss() < openPrice)
                    {
                        OrderModify(OrderTicket(), openPrice, openPrice + 5 * Point * 10, OrderTakeProfit(), 0, clrBlue);
                        Print("Moved to breakeven +5 pips");
                    }
                }
                else if(OrderType() == OP_SELL)
                {
                    double currentProfit = (openPrice - Ask) / Point / 10;
                    if(currentProfit >= InpTargetPips * 0.5 && OrderStopLoss() > openPrice)
                    {
                        OrderModify(OrderTicket(), openPrice, openPrice - 5 * Point * 10, OrderTakeProfit(), 0, clrBlue);
                        Print("Moved to breakeven +5 pips");
                    }
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Create dashboard                                                    |
//+------------------------------------------------------------------+
void CreateDashboard()
{
    int x = 10;
    int y = 30;
    int width = 260;
    int height = 180;
    
    // Background
    ObjectCreate(0, "ARRA7_SB_BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
    ObjectSetInteger(0, "ARRA7_SB_BG", OBJPROP_XDISTANCE, x);
    ObjectSetInteger(0, "ARRA7_SB_BG", OBJPROP_YDISTANCE, y);
    ObjectSetInteger(0, "ARRA7_SB_BG", OBJPROP_XSIZE, width);
    ObjectSetInteger(0, "ARRA7_SB_BG", OBJPROP_YSIZE, height);
    ObjectSetInteger(0, "ARRA7_SB_BG", OBJPROP_BGCOLOR, C'20,22,30');
    ObjectSetInteger(0, "ARRA7_SB_BG", OBJPROP_BORDER_COLOR, C'50,50,70');
    ObjectSetInteger(0, "ARRA7_SB_BG", OBJPROP_CORNER, CORNER_LEFT_UPPER);
    
    CreateLabel("ARRA7_SB_Title", "🎯 Silver Bullet Scalper", x + 10, y + 10, clrWhite, 10);
    CreateLabel("ARRA7_SB_KZ", "Kill Zone: Waiting...", x + 10, y + 35, clrGray, 8);
    CreateLabel("ARRA7_SB_HTF", "HTF Trend: -", x + 10, y + 55, clrGray, 8);
    CreateLabel("ARRA7_SB_Trades", "Trades Today: 0/2", x + 10, y + 75, clrWhite, 8);
    CreateLabel("ARRA7_SB_Status", "Status: Scanning...", x + 10, y + 95, clrYellow, 8);
    CreateLabel("ARRA7_SB_Time", "WIB: --:--", x + 10, y + 115, clrGray, 8);
    CreateLabel("ARRA7_SB_Footer", "arra7-app.vercel.app", x + 10, y + 150, clrDodgerBlue, 8);
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
    int serverHour = TimeHour(TimeCurrent());
    int serverMinute = TimeMinute(TimeCurrent());
    int wibHour = (serverHour + 7) % 24;
    
    // Kill Zone status
    string kzText = inKillZone ? "🟢 " + currentKillZone : "⏳ Waiting for Kill Zone...";
    color kzColor = inKillZone ? clrLime : clrGray;
    ObjectSetString(0, "ARRA7_SB_KZ", OBJPROP_TEXT, "Kill Zone: " + (inKillZone ? currentKillZone : "Waiting"));
    ObjectSetInteger(0, "ARRA7_SB_KZ", OBJPROP_COLOR, kzColor);
    
    // HTF Trend
    double htfMA = iMA(Symbol(), InpHTFTimeframe, 50, 0, MODE_EMA, PRICE_CLOSE, 0);
    double htfClose = iClose(Symbol(), InpHTFTimeframe, 0);
    string htfText = htfClose > htfMA ? "📈 BULLISH" : "📉 BEARISH";
    ObjectSetString(0, "ARRA7_SB_HTF", OBJPROP_TEXT, "HTF Trend: " + htfText);
    ObjectSetInteger(0, "ARRA7_SB_HTF", OBJPROP_COLOR, htfClose > htfMA ? clrLime : clrRed);
    
    // Trades
    ObjectSetString(0, "ARRA7_SB_Trades", OBJPROP_TEXT, "Trades Today: " + IntegerToString(todayTrades) + "/" + IntegerToString(InpMaxTradesPerDay));
    
    // Status
    string status;
    if(todayTrades >= InpMaxTradesPerDay)
        status = "⛔ Max trades reached";
    else if(HasOpenPosition())
        status = "📊 Managing position...";
    else if(inKillZone)
        status = "🔍 Looking for FVG...";
    else
        status = "⏳ Waiting for Kill Zone";
    ObjectSetString(0, "ARRA7_SB_Status", OBJPROP_TEXT, "Status: " + status);
    
    // WIB Time
    ObjectSetString(0, "ARRA7_SB_Time", OBJPROP_TEXT, "WIB: " + StringFormat("%02d:%02d", wibHour, serverMinute));
    
    ChartRedraw();
}
//+------------------------------------------------------------------+
