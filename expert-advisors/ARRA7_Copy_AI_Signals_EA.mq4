//+------------------------------------------------------------------+
//|                                    ARRA7_Copy_AI_Signals_EA.mq4 |
//|                                        Copyright 2024, ARRA7    |
//|                                   https://arra7-app.vercel.app  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, ARRA7 Trading"
#property link      "https://arra7-app.vercel.app"
#property version   "1.00"
#property strict
#property description "Auto-execute trading signals from ARRA7 AI Analysis"

//--- Input Parameters
input string   InpAPIEndpoint = "https://arra7-app.vercel.app/api/signals"; // API Endpoint
input string   InpAPIKey = "";                    // API Key (from VVIP subscription)
input double   InpRiskPercent = 1.0;              // Risk per trade (%)
input double   InpMaxLotSize = 1.0;               // Maximum lot size
input double   InpMinLotSize = 0.01;              // Minimum lot size
input int      InpSlippage = 3;                   // Max slippage (pips)
input int      InpMagicNumber = 7777777;          // Magic Number
input bool     InpAutoExecute = true;             // Auto execute signals
input bool     InpShowDashboard = true;           // Show dashboard on chart
input int      InpCheckInterval = 60;             // Check interval (seconds)

//--- Global Variables
datetime lastCheckTime = 0;
int totalSignals = 0;
int executedSignals = 0;
int pendingSignals = 0;
string lastSignalTime = "";
string lastSignalSymbol = "";
string lastSignalDirection = "";
double lastSignalEntry = 0;
double lastSignalSL = 0;
double lastSignalTP = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("=================================");
    Print("ARRA7 Copy AI Signals EA v1.0");
    Print("https://arra7-app.vercel.app");
    Print("=================================");
    
    if(InpAPIKey == "")
    {
        Alert("Warning: API Key tidak diisi. EA akan berjalan dalam mode DEMO.");
        Print("API Key kosong - Running in DEMO mode");
    }
    
    // Check if trading is allowed
    if(!IsTradeAllowed())
    {
        Alert("Trading tidak diizinkan. Pastikan AutoTrading diaktifkan.");
        return(INIT_FAILED);
    }
    
    // Create dashboard
    if(InpShowDashboard)
        CreateDashboard();
    
    Print("EA initialized successfully. Checking for signals every ", InpCheckInterval, " seconds");
    
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    // Clean up dashboard
    ObjectsDeleteAll(0, "ARRA7_");
    Print("ARRA7 Copy AI Signals EA stopped. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
    // Check signals at specified interval
    if(TimeCurrent() - lastCheckTime >= InpCheckInterval)
    {
        lastCheckTime = TimeCurrent();
        CheckForSignals();
        
        if(InpShowDashboard)
            UpdateDashboard();
    }
}

//+------------------------------------------------------------------+
//| Check for new signals from API                                     |
//+------------------------------------------------------------------+
void CheckForSignals()
{
    if(InpAPIKey == "")
    {
        // Demo mode - generate sample signals for testing
        DemoSignal();
        return;
    }
    
    // Real API call would go here
    // For now, we simulate the API response
    string response = CallAPI(InpAPIEndpoint);
    
    if(response != "")
    {
        ProcessSignalResponse(response);
    }
}

//+------------------------------------------------------------------+
//| Demo signal for testing without API                                |
//+------------------------------------------------------------------+
void DemoSignal()
{
    // This is a demo function - in real use, signals come from API
    static datetime lastDemoTime = 0;
    
    // Generate demo signal every 5 minutes
    if(TimeCurrent() - lastDemoTime < 300)
        return;
    
    lastDemoTime = TimeCurrent();
    
    // Demo signal data
    lastSignalTime = TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES);
    lastSignalSymbol = Symbol();
    
    // Random direction for demo
    if(MathRand() % 2 == 0)
    {
        lastSignalDirection = "BUY";
        lastSignalEntry = Ask;
        lastSignalSL = lastSignalEntry - 500 * Point;
        lastSignalTP = lastSignalEntry + 1000 * Point;
    }
    else
    {
        lastSignalDirection = "SELL";
        lastSignalEntry = Bid;
        lastSignalSL = lastSignalEntry + 500 * Point;
        lastSignalTP = lastSignalEntry - 1000 * Point;
    }
    
    totalSignals++;
    pendingSignals++;
    
    Print("DEMO Signal: ", lastSignalDirection, " ", lastSignalSymbol, " @ ", lastSignalEntry);
    
    // Auto execute if enabled
    if(InpAutoExecute)
    {
        ExecuteSignal();
    }
}

//+------------------------------------------------------------------+
//| Call API endpoint                                                   |
//+------------------------------------------------------------------+
string CallAPI(string url)
{
    // Note: MQL4/5 has limited HTTP support
    // For production, use WebRequest or external service
    
    string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + InpAPIKey;
    char data[];
    char result[];
    string resultHeaders;
    
    int timeout = 5000;
    int res = WebRequest("GET", url, headers, timeout, data, result, resultHeaders);
    
    if(res == -1)
    {
        int error = GetLastError();
        if(error == 4060)
        {
            Print("URL tidak diizinkan. Tambahkan ke Tools > Options > Expert Advisors");
        }
        else
        {
            Print("WebRequest error: ", error);
        }
        return "";
    }
    
    return CharArrayToString(result);
}

//+------------------------------------------------------------------+
//| Process API response                                               |
//+------------------------------------------------------------------+
void ProcessSignalResponse(string response)
{
    // Parse JSON response
    // Expected format: {"symbol":"XAUUSD","direction":"BUY","entry":2650.50,"sl":2640.00,"tp":2670.00}
    
    // Simple JSON parsing (for production, use proper JSON library)
    if(StringFind(response, "symbol") < 0)
        return;
    
    // Extract values from JSON
    lastSignalSymbol = ExtractJSONValue(response, "symbol");
    lastSignalDirection = ExtractJSONValue(response, "direction");
    lastSignalEntry = StringToDouble(ExtractJSONValue(response, "entry"));
    lastSignalSL = StringToDouble(ExtractJSONValue(response, "sl"));
    lastSignalTP = StringToDouble(ExtractJSONValue(response, "tp"));
    lastSignalTime = TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES);
    
    totalSignals++;
    pendingSignals++;
    
    Print("New Signal: ", lastSignalDirection, " ", lastSignalSymbol, " Entry: ", lastSignalEntry);
    
    if(InpAutoExecute)
    {
        ExecuteSignal();
    }
}

//+------------------------------------------------------------------+
//| Extract value from JSON string                                     |
//+------------------------------------------------------------------+
string ExtractJSONValue(string json, string key)
{
    int start = StringFind(json, "\"" + key + "\"");
    if(start < 0) return "";
    
    start = StringFind(json, ":", start);
    if(start < 0) return "";
    
    start++;
    while(StringGetCharacter(json, start) == ' ' || StringGetCharacter(json, start) == '"')
        start++;
    
    int end = start;
    while(end < StringLen(json))
    {
        ushort c = StringGetCharacter(json, end);
        if(c == ',' || c == '}' || c == '"')
            break;
        end++;
    }
    
    return StringSubstr(json, start, end - start);
}

//+------------------------------------------------------------------+
//| Execute trading signal                                             |
//+------------------------------------------------------------------+
void ExecuteSignal()
{
    if(lastSignalSymbol == "" || lastSignalDirection == "")
    {
        Print("Invalid signal data");
        return;
    }
    
    // Check if symbol matches current chart
    if(lastSignalSymbol != Symbol())
    {
        Print("Signal for different symbol: ", lastSignalSymbol);
        // Could implement multi-symbol trading here
    }
    
    // Calculate lot size based on risk
    double lotSize = CalculateLotSize(lastSignalEntry, lastSignalSL);
    
    if(lotSize < InpMinLotSize)
        lotSize = InpMinLotSize;
    if(lotSize > InpMaxLotSize)
        lotSize = InpMaxLotSize;
    
    // Execute trade
    int ticket = 0;
    
    if(lastSignalDirection == "BUY")
    {
        ticket = OrderSend(Symbol(), OP_BUY, lotSize, Ask, InpSlippage, lastSignalSL, lastSignalTP, 
                          "ARRA7 AI Signal", InpMagicNumber, 0, clrGreen);
    }
    else if(lastSignalDirection == "SELL")
    {
        ticket = OrderSend(Symbol(), OP_SELL, lotSize, Bid, InpSlippage, lastSignalSL, lastSignalTP, 
                          "ARRA7 AI Signal", InpMagicNumber, 0, clrRed);
    }
    
    if(ticket > 0)
    {
        executedSignals++;
        pendingSignals--;
        Print("Order executed! Ticket: ", ticket, " Lot: ", lotSize);
        Alert("ARRA7 Signal Executed: ", lastSignalDirection, " ", Symbol(), " @ ", DoubleToStr(lotSize, 2), " lots");
    }
    else
    {
        int error = GetLastError();
        Print("Order failed! Error: ", error, " - ", ErrorDescription(error));
    }
}

//+------------------------------------------------------------------+
//| Calculate lot size based on risk percentage                        |
//+------------------------------------------------------------------+
double CalculateLotSize(double entryPrice, double stopLoss)
{
    double riskAmount = AccountBalance() * (InpRiskPercent / 100);
    double pipValue = MarketInfo(Symbol(), MODE_TICKVALUE);
    double pipSize = MarketInfo(Symbol(), MODE_TICKSIZE);
    
    double slPips = MathAbs(entryPrice - stopLoss) / pipSize;
    
    if(slPips == 0)
        slPips = 50; // Default 50 pips if SL not set
    
    double lotSize = riskAmount / (slPips * pipValue);
    
    // Normalize lot size
    double minLot = MarketInfo(Symbol(), MODE_MINLOT);
    double lotStep = MarketInfo(Symbol(), MODE_LOTSTEP);
    
    lotSize = MathFloor(lotSize / lotStep) * lotStep;
    
    if(lotSize < minLot)
        lotSize = minLot;
    
    return NormalizeDouble(lotSize, 2);
}

//+------------------------------------------------------------------+
//| Get error description                                              |
//+------------------------------------------------------------------+
string ErrorDescription(int error)
{
    switch(error)
    {
        case 0:   return "No error";
        case 1:   return "No error but result unknown";
        case 2:   return "Common error";
        case 3:   return "Invalid trade parameters";
        case 4:   return "Trade server is busy";
        case 5:   return "Old version of client terminal";
        case 6:   return "No connection with trade server";
        case 7:   return "Not enough rights";
        case 8:   return "Too frequent requests";
        case 9:   return "Malfunctional trade operation";
        case 64:  return "Account disabled";
        case 65:  return "Invalid account";
        case 128: return "Trade timeout";
        case 129: return "Invalid price";
        case 130: return "Invalid stops";
        case 131: return "Invalid trade volume";
        case 132: return "Market is closed";
        case 133: return "Trade is disabled";
        case 134: return "Not enough money";
        case 135: return "Price changed";
        case 136: return "Off quotes";
        case 137: return "Broker is busy";
        case 138: return "Requote";
        case 139: return "Order is locked";
        case 140: return "Long positions only allowed";
        case 141: return "Too many requests";
        case 145: return "Modification denied because order is too close to market";
        case 146: return "Trade context is busy";
        case 147: return "Expirations are denied by broker";
        case 148: return "Too many open and pending orders";
        default:  return "Unknown error";
    }
}

//+------------------------------------------------------------------+
//| Create dashboard on chart                                          |
//+------------------------------------------------------------------+
void CreateDashboard()
{
    int x = 10;
    int y = 30;
    int width = 280;
    int height = 200;
    
    // Background
    ObjectCreate(0, "ARRA7_BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
    ObjectSetInteger(0, "ARRA7_BG", OBJPROP_XDISTANCE, x);
    ObjectSetInteger(0, "ARRA7_BG", OBJPROP_YDISTANCE, y);
    ObjectSetInteger(0, "ARRA7_BG", OBJPROP_XSIZE, width);
    ObjectSetInteger(0, "ARRA7_BG", OBJPROP_YSIZE, height);
    ObjectSetInteger(0, "ARRA7_BG", OBJPROP_BGCOLOR, C'20,22,30');
    ObjectSetInteger(0, "ARRA7_BG", OBJPROP_BORDER_TYPE, BORDER_FLAT);
    ObjectSetInteger(0, "ARRA7_BG", OBJPROP_BORDER_COLOR, C'50,50,70');
    ObjectSetInteger(0, "ARRA7_BG", OBJPROP_CORNER, CORNER_LEFT_UPPER);
    
    // Title
    CreateLabel("ARRA7_Title", "🤖 ARRA7 Copy AI Signals", x + 10, y + 10, clrWhite, 10);
    CreateLabel("ARRA7_Status", "Status: Menunggu signal...", x + 10, y + 35, clrGray, 8);
    
    // Stats
    CreateLabel("ARRA7_Total", "Total Signals: 0", x + 10, y + 60, clrWhite, 8);
    CreateLabel("ARRA7_Executed", "Executed: 0", x + 10, y + 80, clrLime, 8);
    CreateLabel("ARRA7_Pending", "Pending: 0", x + 10, y + 100, clrYellow, 8);
    
    // Last Signal
    CreateLabel("ARRA7_LastTitle", "── Last Signal ──", x + 10, y + 125, clrGray, 8);
    CreateLabel("ARRA7_LastSignal", "Belum ada signal", x + 10, y + 145, clrWhite, 8);
    
    // Footer
    CreateLabel("ARRA7_Footer", "arra7-app.vercel.app", x + 10, y + 175, clrDodgerBlue, 8);
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
    ObjectSetString(0, name, OBJPROP_FONT, "Arial");
    ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
}

//+------------------------------------------------------------------+
//| Update dashboard                                                   |
//+------------------------------------------------------------------+
void UpdateDashboard()
{
    string statusText = "Status: ";
    if(InpAPIKey == "")
        statusText += "🔶 Demo Mode";
    else if(pendingSignals > 0)
        statusText += "🟡 Signal tersedia!";
    else
        statusText += "🟢 Aktif - Menunggu signal...";
    
    ObjectSetString(0, "ARRA7_Status", OBJPROP_TEXT, statusText);
    ObjectSetString(0, "ARRA7_Total", OBJPROP_TEXT, "Total Signals: " + IntegerToString(totalSignals));
    ObjectSetString(0, "ARRA7_Executed", OBJPROP_TEXT, "Executed: " + IntegerToString(executedSignals));
    ObjectSetString(0, "ARRA7_Pending", OBJPROP_TEXT, "Pending: " + IntegerToString(pendingSignals));
    
    if(lastSignalSymbol != "")
    {
        string lastSignalText = lastSignalDirection + " " + lastSignalSymbol + " @ " + DoubleToStr(lastSignalEntry, (int)MarketInfo(lastSignalSymbol, MODE_DIGITS));
        ObjectSetString(0, "ARRA7_LastSignal", OBJPROP_TEXT, lastSignalText);
        ObjectSetInteger(0, "ARRA7_LastSignal", OBJPROP_COLOR, lastSignalDirection == "BUY" ? clrLime : clrRed);
    }
    
    ChartRedraw();
}
//+------------------------------------------------------------------+
