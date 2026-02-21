//+------------------------------------------------------------------+
//|                                       ARRA-Copytrade-Bridge.mq5  |
//|                              ARRA Quantum AI - Copytrade Bridge   |
//|         Hubungkan MT4/MT5 Anda dengan sinyal AI dari ARRA.       |
//+------------------------------------------------------------------+
#property copyright   "ARRA Quantum AI"
#property link        "https://arra.ai"
#property version     "1.00"
#property description "EA Bridge: Polling sinyal API ARRA dan eksekusi otomatis."

#include <Trade\Trade.mqh>

//--- Input Parameters
input string LicenseKey       = "";         // License Key dari Dashboard ARRA
input string ApiBaseUrl       = "https://arra7-app.vercel.app"; // URL API (ganti jika beda)
input double FixedLotSize     = 0.01;       // Lot Size per Order
input double MaxDrawdownPct   = 20.0;       // Max Drawdown % sebelum EA berhenti
input int    PollIntervalSec  = 10;         // Polling interval (detik)
input int    HttpTimeoutMs    = 10000;      // HTTP Request timeout (ms)
input bool   EnableLogging    = true;       // Tampilkan log detail

//--- Global variables
CTrade   trade;
datetime lastPollTime    = 0;
string   lastSignalId    = "";
double   initialBalance  = 0;

//+------------------------------------------------------------------+
//| Expert initialization                                             |
//+------------------------------------------------------------------+
int OnInit()
{
   if(LicenseKey == "" || StringLen(LicenseKey) < 10)
   {
      Alert("⚠ ARRA Bridge: License Key tidak valid! Masukkan License Key dari dashboard ARRA.");
      return INIT_PARAMETERS_INCORRECT;
   }
   
   initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   
   // Validate license key with server
   if(!ValidateLicenseKey())
   {
      Alert("⚠ ARRA Bridge: License Key tidak ditemukan atau saldo habis. Login ke dashboard ARRA untuk cek saldo.");
      return INIT_FAILED;
   }
   
   Print("✅ ARRA Bridge aktif. Polling setiap ", PollIntervalSec, " detik...");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization                                           |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("🛑 ARRA Bridge dihentikan. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   datetime now = TimeCurrent();
   if(now - lastPollTime < PollIntervalSec) return;
   lastPollTime = now;
   
   // Check drawdown
   if(CheckMaxDrawdown()) return;

   PollAndExecute();
}

//+------------------------------------------------------------------+
//| Validate License Key on startup                                   |
//+------------------------------------------------------------------+
bool ValidateLicenseKey()
{
   string url = ApiBaseUrl + "/api/copytrade-bridge/user/validate?licenseKey=" + LicenseKey;
   string result;
   int statusCode = SendHttpGet(url, result);
   
   if(statusCode != 200)
   {
      if(EnableLogging) Print("❌ Validate error, HTTP: ", statusCode);
      return false;
   }
   
   // Check isSubscribed flag in response
   if(StringFind(result, "\"isSubscribed\":true") < 0)
   {
      if(EnableLogging) Print("❌ Saldo habis atau tidak berlangganan. Response: ", result);
      return false;
   }
   
   if(EnableLogging) Print("✅ License Key valid dan saldo aktif.");
   return true;
}

//+------------------------------------------------------------------+
//| Poll API and execute any new signals                             |
//+------------------------------------------------------------------+
void PollAndExecute()
{
   string url = ApiBaseUrl + "/api/copytrade-bridge/user/validate?licenseKey=" + LicenseKey;
   string result;
   int statusCode = SendHttpGet(url, result);
   
   if(statusCode != 200)
   {
      if(EnableLogging) Print("⚠ Poll HTTP error: ", statusCode);
      return;
   }
   
   // Quick check without full JSON parsing
   if(StringFind(result, "\"isSubscribed\":false") >= 0)
   {
      if(EnableLogging) Print("⚠ Saldo habis. EA berhenti sementara.");
      return;
   }
   
   if(StringFind(result, "\"signals\":[]") >= 0 || StringFind(result, "signals") < 0)
   {
      if(EnableLogging) Print("ℹ️ Tidak ada sinyal baru.");
      return;
   }
   
   // Parse signals array
   ParseAndExecuteSignals(result);
}

//+------------------------------------------------------------------+
//| Parse signals and execute                                         |
//+------------------------------------------------------------------+
void ParseAndExecuteSignals(string jsonResponse)
{
   // Find signals array
   int signalsStart = StringFind(jsonResponse, "\"signals\":[");
   if(signalsStart < 0) return;
   
   signalsStart += 10; // Skip "signals":[
   
   // Find first signal object
   int objStart = StringFind(jsonResponse, "{", signalsStart);
   if(objStart < 0) return;
   
   // Parse first signal only (simplest approach for single-signal executions)
   string id       = ExtractJsonValue(jsonResponse, "\"id\":", objStart);
   string pair     = ExtractJsonValue(jsonResponse, "\"pair\":", objStart);
   string type     = ExtractJsonValue(jsonResponse, "\"type\":", objStart);
   string entryStr = ExtractJsonValue(jsonResponse, "\"entry_price\":", objStart);
   string tpStr    = ExtractJsonValue(jsonResponse, "\"tp\":", objStart);
   string slStr    = ExtractJsonValue(jsonResponse, "\"sl\":", objStart);
   
   if(id == "" || pair == "" || type == "") return;
   
   // Skip if we already handled this signal
   if(id == lastSignalId)
   {
      if(EnableLogging) Print("ℹ️ Sinyal sudah dieksekusi: ", id);
      return;
   }
   
   double entryPrice = StringToDouble(entryStr);
   double tp         = StringToDouble(tpStr);
   double sl         = StringToDouble(slStr);
   
   if(EnableLogging) Print("📡 Sinyal baru: ", pair, " ", type, " Entry:", entryPrice, " TP:", tp, " SL:", sl);
   
   bool success = ExecuteSignal(pair, type, tp, sl);
   lastSignalId = id;
   
   // Report execution result back to server
   double profit = 0;
   ReportExecution(success ? "SUCCESS" : "FAILED", profit);
}

//+------------------------------------------------------------------+
//| Execute a trading signal                                          |
//+------------------------------------------------------------------+
bool ExecuteSignal(string pair, string type, double tp, double sl)
{
   ENUM_ORDER_TYPE orderType;
   
   if(type == "BUY" || type == "BUY MARKET")        orderType = ORDER_TYPE_BUY;
   else if(type == "SELL" || type == "SELL MARKET")  orderType = ORDER_TYPE_SELL;
   else
   {
      if(EnableLogging) Print("⚠ Order type tidak didukung: ", type);
      return false;
   }
   
   // Get current price
   double price = 0;
   if(orderType == ORDER_TYPE_BUY)
      price = SymbolInfoDouble(pair, SYMBOL_ASK);
   else
      price = SymbolInfoDouble(pair, SYMBOL_BID);
   
   if(price <= 0)
   {
      if(EnableLogging) Print("❌ Gagal ambil harga untuk: ", pair);
      return false;
   }
   
   // Normalize SL/TP
   int digits = (int)SymbolInfoInteger(pair, SYMBOL_DIGITS);
   sl = NormalizeDouble(sl, digits);
   tp = NormalizeDouble(tp, digits);
   
   trade.SetExpertMagicNumber(202600);
   bool result = trade.PositionOpen(pair, orderType, FixedLotSize, price, sl, tp, "ARRA Bridge");
   
   if(result)
   {
      Print("✅ Order tereksekusi: ", pair, " ", type, " Lot:", FixedLotSize, " @", price);
      return true;
   }
   else
   {
      Print("❌ Order gagal: ", trade.ResultRetcodeDescription());
      return false;
   }
}

//+------------------------------------------------------------------+
//| Report execution result back to API                               |
//+------------------------------------------------------------------+
void ReportExecution(string status, double profit)
{
   string url     = ApiBaseUrl + "/api/copytrade-bridge/trade/log";
   string payload = "{\"licenseKey\":\"" + LicenseKey + "\",\"status\":\"" + status + "\",\"profit\":" + DoubleToString(profit, 2) + "}";
   string response;
   
   char postData[];
   StringToCharArray(payload, postData, 0, StringLen(payload), CP_UTF8);
   
   string headers = "Content-Type: application/json\r\n";
   char result[];
   string resultHeaders;
   
   int ret = WebRequest("POST", url, headers, HttpTimeoutMs, postData, result, resultHeaders);
   if(EnableLogging) Print("📤 Report: ", status, " | HTTP: ", ret);
}

//+------------------------------------------------------------------+
//| Check Drawdown                                                    |
//+------------------------------------------------------------------+
bool CheckMaxDrawdown()
{
   if(initialBalance <= 0) return false;
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double drawdown = ((initialBalance - equity) / initialBalance) * 100.0;
   if(drawdown >= MaxDrawdownPct)
   {
      Print("⛔ Max Drawdown ", DoubleToString(drawdown, 1), "% tercapai. EA berhenti.");
      ExpertRemove();
      return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| HTTP GET Helper                                                    |
//+------------------------------------------------------------------+
int SendHttpGet(string url, string &responseBody)
{
   char post[];
   char result[];
   string resultHeaders;
   ResetLastError();
   int ret = WebRequest("GET", url, NULL, HttpTimeoutMs, post, result, resultHeaders);
   if(ret > 0) responseBody = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   return ret;
}

//+------------------------------------------------------------------+
//| Simple JSON string value extractor                                |
//+------------------------------------------------------------------+
string ExtractJsonValue(string json, string key, int startPos)
{
   int keyPos = StringFind(json, key, startPos);
   if(keyPos < 0) return "";
   
   int valueStart = keyPos + StringLen(key);
   
   // Skip whitespace
   while(valueStart < StringLen(json) && StringGetCharacter(json, valueStart) == ' ') valueStart++;
   
   char firstChar = (char)StringGetCharacter(json, valueStart);
   
   if(firstChar == '"') {
      // String value
      valueStart++;
      int valueEnd = StringFind(json, "\"", valueStart);
      if(valueEnd < 0) return "";
      return StringSubstr(json, valueStart, valueEnd - valueStart);
   } else {
      // Number or boolean
      int valueEnd = valueStart;
      while(valueEnd < StringLen(json))
      {
         char c = (char)StringGetCharacter(json, valueEnd);
         if(c == ',' || c == '}' || c == ']' || c == ' ') break;
         valueEnd++;
      }
      return StringSubstr(json, valueStart, valueEnd - valueStart);
   }
}
//+------------------------------------------------------------------+
