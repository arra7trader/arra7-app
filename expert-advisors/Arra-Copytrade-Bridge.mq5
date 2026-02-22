//+------------------------------------------------------------------+
//|                                       ARRA-Copytrade-Bridge.mq5  |
//|                              ARRA Quantum AI - Copytrade Bridge  |
//|              MT4/MT5 bridge for ARRA signal polling + execution  |
//+------------------------------------------------------------------+
#property copyright   "ARRA Quantum AI"
#property link        "https://arra.ai"
#property version     "1.10"
#property description "EA Bridge: poll API signal ARRA dan eksekusi otomatis."

#include <Trade\Trade.mqh>

//--- Input Parameters
input string LicenseKey           = "";                               // License key dari dashboard ARRA
input string ApiBaseUrl           = "https://arra7-app.vercel.app";  // URL web ARRA
input string BridgeSecret         = "";                               // Optional: CT_BRIDGE_EA_SECRET untuk signed requests
input double FixedLotSize         = 0.01;                             // Lot size per order
input double MaxDrawdownPct       = 20.0;                             // Max drawdown % sebelum EA stop
input int    PollIntervalSec      = 10;                               // Polling interval (detik)
input int    HttpTimeoutMs        = 10000;                            // HTTP timeout (ms)
input int    MaxSignalRetryPerId  = 3;                                // Retry eksekusi per signal ID
input bool   EnableLogging        = true;                             // Print log detail

//--- Runtime
CTrade   trade;
datetime lastPollTime = 0;
double   initialBalance = 0.0;

//--- Persistence
string PROCESSED_IDS_FILE = "ARRA_CopytradeBridge_processed_ids.txt";
int    MAX_PROCESSED_IDS  = 300;

//--- In-memory caches
string processedSignalIds[];
string failedSignalIds[];
int    failedSignalAttempts[];

//+------------------------------------------------------------------+
//| Expert initialization                                             |
//+------------------------------------------------------------------+
int OnInit()
{
   MathSrand((uint)(GetTickCount() ^ (uint)TimeLocal()));

   if(LicenseKey == "" || StringLen(LicenseKey) < 10)
   {
      Alert("ARRA Bridge: license key tidak valid. Isi dari dashboard ARRA.");
      return INIT_PARAMETERS_INCORRECT;
   }

   initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   LoadProcessedSignalIds();

   if(!ValidateLicenseKey())
   {
      Alert("ARRA Bridge: license invalid atau saldo habis.");
      return INIT_FAILED;
   }

   if(EnableLogging)
   {
      Print("ARRA Bridge aktif. Polling setiap ", PollIntervalSec, " detik.");
      if(StringLen(BridgeSecret) > 0)
         Print("ARRA Bridge security mode: signed requests enabled.");
      else
         Print("ARRA Bridge security mode: legacy unsigned (BridgeSecret kosong).");
   }

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization                                           |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   SaveProcessedSignalIds();
   Print("ARRA Bridge dihentikan. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   datetime now = TimeCurrent();
   if(now - lastPollTime < PollIntervalSec)
      return;

   lastPollTime = now;

   if(CheckMaxDrawdown())
      return;

   PollAndExecute();
}

//+------------------------------------------------------------------+
//| Validate license key                                              |
//+------------------------------------------------------------------+
bool ValidateLicenseKey()
{
   string result = "";
   int statusCode = RequestValidation(result);
   if(statusCode != 200)
   {
      if(EnableLogging) Print("Validate failed. HTTP: ", statusCode, " Body: ", result);
      return false;
   }

   if(StringFind(result, "\"isSubscribed\":true") < 0)
   {
      if(EnableLogging) Print("License found but inactive subscription/balance. Response: ", result);
      return false;
   }

   if(EnableLogging) Print("License key valid and subscribed.");
   return true;
}

//+------------------------------------------------------------------+
//| Poll API and execute new signals                                  |
//+------------------------------------------------------------------+
void PollAndExecute()
{
   string response = "";
   int statusCode = RequestValidation(response);
   if(statusCode != 200)
   {
      if(EnableLogging) Print("Poll validate failed. HTTP: ", statusCode, " Body: ", response);
      return;
   }

   if(StringFind(response, "\"isSubscribed\":false") >= 0)
   {
      if(EnableLogging) Print("Bridge credits exhausted. Waiting topup.");
      return;
   }

   ParseAndExecuteSignals(response);
}

//+------------------------------------------------------------------+
//| Parse signals array and process each object                       |
//+------------------------------------------------------------------+
void ParseAndExecuteSignals(string jsonResponse)
{
   int signalsKey = StringFind(jsonResponse, "\"signals\":");
   if(signalsKey < 0)
   {
      if(EnableLogging) Print("No signals key found in payload.");
      return;
   }

   int arrayStart = StringFind(jsonResponse, "[", signalsKey);
   if(arrayStart < 0)
      return;

   int arrayEnd = FindMatchingBracket(jsonResponse, arrayStart, '[', ']');
   if(arrayEnd < 0)
      return;

   int cursor = arrayStart + 1;
   int executedCount = 0;

   while(true)
   {
      int objStart = StringFind(jsonResponse, "{", cursor);
      if(objStart < 0 || objStart > arrayEnd)
         break;

      int objEnd = FindMatchingBracket(jsonResponse, objStart, '{', '}');
      if(objEnd < 0 || objEnd > arrayEnd)
         break;

      string signalObject = StringSubstr(jsonResponse, objStart, objEnd - objStart + 1);
      if(ProcessSignalObject(signalObject))
         executedCount++;

      cursor = objEnd + 1;
   }

   if(EnableLogging)
   {
      if(executedCount > 0)
         Print("Signal batch processed. Executed count: ", executedCount);
      else
         Print("No executable signal in current batch.");
   }
}

//+------------------------------------------------------------------+
//| Process one signal object                                         |
//+------------------------------------------------------------------+
bool ProcessSignalObject(string signalJson)
{
   string id       = ExtractJsonValue(signalJson, "\"id\":", 0);
   string pair     = ExtractJsonValue(signalJson, "\"pair\":", 0);
   string type     = ExtractJsonValue(signalJson, "\"type\":", 0);
   string entryStr = ExtractJsonValue(signalJson, "\"entry_price\":", 0);
   string tpStr    = ExtractJsonValue(signalJson, "\"tp\":", 0);
   string slStr    = ExtractJsonValue(signalJson, "\"sl\":", 0);

   id   = Trim(id);
   pair = Trim(pair);
   type = Trim(type);
   StringToUpper(pair);
   StringToUpper(type);

   if(id == "" || pair == "" || type == "")
      return false;

   if(IsSignalProcessed(id))
   {
      if(EnableLogging) Print("Skip processed signal: ", id);
      return false;
   }

   int currentRetries = GetFailedAttempt(id);
   if(currentRetries >= MaxSignalRetryPerId)
   {
      if(EnableLogging) Print("Max retries reached. Mark signal processed: ", id);
      MarkSignalProcessed(id);
      return false;
   }

   double entryPrice = StringToDouble(entryStr);
   double tp         = StringToDouble(tpStr);
   double sl         = StringToDouble(slStr);

   if(EnableLogging)
      Print("New signal: ", id, " | ", pair, " ", type, " entry=", entryPrice, " tp=", tp, " sl=", sl);

   bool success = ExecuteSignal(pair, type, tp, sl);
   if(success)
   {
      MarkSignalProcessed(id);
      ClearFailedAttempt(id);
      ReportExecution("SUCCESS", 0.0, pair, id, "signal executed");
      return true;
   }

   int attempts = RegisterFailedAttempt(id);
   ReportExecution("FAILED", 0.0, pair, id, "execution failed attempt=" + IntegerToString(attempts));
   if(attempts >= MaxSignalRetryPerId)
   {
      if(EnableLogging) Print("Marking failed signal as processed after retries: ", id);
      MarkSignalProcessed(id);
   }
   return false;
}

//+------------------------------------------------------------------+
//| Execute trading signal                                            |
//+------------------------------------------------------------------+
bool ExecuteSignal(string pair, string type, double tp, double sl)
{
   if(!SymbolSelect(pair, true))
   {
      if(EnableLogging) Print("SymbolSelect failed: ", pair);
      return false;
   }

   ENUM_ORDER_TYPE orderType;
   if(type == "BUY" || type == "BUY MARKET")
      orderType = ORDER_TYPE_BUY;
   else if(type == "SELL" || type == "SELL MARKET")
      orderType = ORDER_TYPE_SELL;
   else
   {
      if(EnableLogging) Print("Unsupported order type: ", type);
      return false;
   }

   double price = (orderType == ORDER_TYPE_BUY) ? SymbolInfoDouble(pair, SYMBOL_ASK) : SymbolInfoDouble(pair, SYMBOL_BID);
   if(price <= 0.0)
   {
      if(EnableLogging) Print("Failed to get price for symbol: ", pair);
      return false;
   }

   int digits = (int)SymbolInfoInteger(pair, SYMBOL_DIGITS);
   tp = NormalizeDouble(tp, digits);
   sl = NormalizeDouble(sl, digits);

   trade.SetExpertMagicNumber(202600);
   bool opened = trade.PositionOpen(pair, orderType, FixedLotSize, price, sl, tp, "ARRA Bridge");
   if(opened)
   {
      if(EnableLogging) Print("Order executed: ", pair, " ", type, " lot=", DoubleToString(FixedLotSize, 2), " @", DoubleToString(price, digits));
      return true;
   }

   if(EnableLogging) Print("Order failed: ", trade.ResultRetcodeDescription());
   return false;
}

//+------------------------------------------------------------------+
//| Report execution to API                                           |
//+------------------------------------------------------------------+
void ReportExecution(string status, double profit, string pair, string clientTradeId, string note)
{
   string url = ApiBaseUrl + "/api/copytrade-bridge/trade/log";

   string payload =
      "{\"licenseKey\":\"" + EscapeJson(LicenseKey) +
      "\",\"status\":\"" + EscapeJson(status) +
      "\",\"profit\":" + DoubleToString(profit, 2) +
      ",\"pair\":\"" + EscapeJson(pair) +
      "\",\"clientTradeId\":\"" + EscapeJson(clientTradeId) +
      "\",\"note\":\"" + EscapeJson(note) + "\"}";

   string headers = "";
   if(!BuildRequestHeaders(payload, headers))
   {
      if(EnableLogging) Print("Failed to build request headers for execution report.");
      return;
   }

   string response = "";
   int code = SendHttpPost(url, headers, payload, response);
   if(EnableLogging) Print("Report execution HTTP=", code, " body=", response);
}

//+------------------------------------------------------------------+
//| Drawdown guard                                                    |
//+------------------------------------------------------------------+
bool CheckMaxDrawdown()
{
   if(initialBalance <= 0.0)
      return false;

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double drawdown = ((initialBalance - equity) / initialBalance) * 100.0;
   if(drawdown < MaxDrawdownPct)
      return false;

   Print("Max drawdown reached: ", DoubleToString(drawdown, 2), "%. EA removed.");
   ExpertRemove();
   return true;
}

//+------------------------------------------------------------------+
//| Request validate endpoint (GET legacy or signed POST)            |
//+------------------------------------------------------------------+
int RequestValidation(string &responseBody)
{
   if(StringLen(BridgeSecret) == 0)
   {
      string url = ApiBaseUrl + "/api/copytrade-bridge/user/validate?licenseKey=" + EscapeQuery(LicenseKey);
      return SendHttpGet(url, responseBody);
   }

   string url = ApiBaseUrl + "/api/copytrade-bridge/user/validate";
   string payload = "{\"licenseKey\":\"" + EscapeJson(LicenseKey) + "\"}";
   string headers = "";
   if(!BuildRequestHeaders(payload, headers))
      return -1;

   return SendHttpPost(url, headers, payload, responseBody);
}

//+------------------------------------------------------------------+
//| Build common request headers                                      |
//+------------------------------------------------------------------+
bool BuildRequestHeaders(string body, string &headers)
{
   headers = "Content-Type: application/json\r\n";
   if(StringLen(BridgeSecret) == 0)
      return true;

   long timestampMs = (long)TimeGMT() * 1000;
   string timestamp = StringFormat("%I64d", timestampMs);
   string nonce = GenerateNonce();
   string signPayload = timestamp + "." + nonce + "." + body;
   string signature = HmacSha256Hex(BridgeSecret, signPayload);
   if(signature == "")
      return false;

   headers += "x-ct-signature: " + signature + "\r\n";
   headers += "x-ct-timestamp: " + timestamp + "\r\n";
   headers += "x-ct-nonce: " + nonce + "\r\n";
   return true;
}

//+------------------------------------------------------------------+
//| HTTP GET helper                                                   |
//+------------------------------------------------------------------+
int SendHttpGet(string url, string &responseBody)
{
   char post[];
   char result[];
   string responseHeaders = "";
   ResetLastError();
   int code = WebRequest("GET", url, "", HttpTimeoutMs, post, result, responseHeaders);
   if(code > 0)
      responseBody = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   else
      responseBody = "";

   if(code == -1 && EnableLogging)
      Print("WebRequest GET error: ", GetLastError(), " url=", url);

   return code;
}

//+------------------------------------------------------------------+
//| HTTP POST helper                                                  |
//+------------------------------------------------------------------+
int SendHttpPost(string url, string headers, string payload, string &responseBody)
{
   char postData[];
   StringToCharArray(payload, postData, 0, StringLen(payload), CP_UTF8);

   char result[];
   string responseHeaders = "";
   ResetLastError();
   int code = WebRequest("POST", url, headers, HttpTimeoutMs, postData, result, responseHeaders);
   if(code > 0)
      responseBody = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   else
      responseBody = "";

   if(code == -1 && EnableLogging)
      Print("WebRequest POST error: ", GetLastError(), " url=", url);

   return code;
}

//+------------------------------------------------------------------+
//| Utility: find matching bracket with quote awareness               |
//+------------------------------------------------------------------+
int FindMatchingBracket(string text, int openPos, int openChar, int closeChar)
{
   int depth = 0;
   bool inString = false;
   int len = StringLen(text);

   for(int i = openPos; i < len; i++)
   {
      int ch = StringGetCharacter(text, i);
      bool escaped = (i > 0 && StringGetCharacter(text, i - 1) == '\\');
      if(ch == '"' && !escaped)
      {
         inString = !inString;
         continue;
      }
      if(inString)
         continue;

      if(ch == openChar)
         depth++;
      else if(ch == closeChar)
      {
         depth--;
         if(depth == 0)
            return i;
      }
   }
   return -1;
}

//+------------------------------------------------------------------+
//| Utility: JSON value extractor                                     |
//+------------------------------------------------------------------+
string ExtractJsonValue(string json, string key, int startPos)
{
   int keyPos = StringFind(json, key, startPos);
   if(keyPos < 0) return "";

   int valueStart = keyPos + StringLen(key);
   while(valueStart < StringLen(json) && StringGetCharacter(json, valueStart) == ' ')
      valueStart++;

   int firstChar = StringGetCharacter(json, valueStart);
   if(firstChar == '"')
   {
      valueStart++;
      int valueEnd = valueStart;
      while(valueEnd < StringLen(json))
      {
         int ch = StringGetCharacter(json, valueEnd);
         bool escaped = (valueEnd > valueStart && StringGetCharacter(json, valueEnd - 1) == '\\');
         if(ch == '"' && !escaped)
            break;
         valueEnd++;
      }
      if(valueEnd >= StringLen(json)) return "";
      return StringSubstr(json, valueStart, valueEnd - valueStart);
   }

   int valueEnd = valueStart;
   while(valueEnd < StringLen(json))
   {
      int c = StringGetCharacter(json, valueEnd);
      if(c == ',' || c == '}' || c == ']' || c == ' ')
         break;
      valueEnd++;
   }
   return StringSubstr(json, valueStart, valueEnd - valueStart);
}

//+------------------------------------------------------------------+
//| Utility: trim spaces                                              |
//+------------------------------------------------------------------+
string Trim(string value)
{
   int len = StringLen(value);
   if(len <= 0) return "";

   int start = 0;
   int end = len - 1;
   while(start <= end && StringGetCharacter(value, start) <= 32) start++;
   while(end >= start && StringGetCharacter(value, end) <= 32) end--;
   if(end < start) return "";
   return StringSubstr(value, start, end - start + 1);
}

//+------------------------------------------------------------------+
//| Utility: JSON escape                                              |
//+------------------------------------------------------------------+
string EscapeJson(string value)
{
   string out = "";
   int len = StringLen(value);
   for(int i = 0; i < len; i++)
   {
      int ch = StringGetCharacter(value, i);
      if(ch == '\\') out += "\\\\";
      else if(ch == '"') out += "\\\"";
      else if(ch == '\n') out += "\\n";
      else if(ch == '\r') out += "\\r";
      else if(ch == '\t') out += "\\t";
      else out += StringSubstr(value, i, 1);
   }
   return out;
}

//+------------------------------------------------------------------+
//| Utility: URL query escape (minimal)                               |
//+------------------------------------------------------------------+
string EscapeQuery(string value)
{
   string out = "";
   int len = StringLen(value);
   for(int i = 0; i < len; i++)
   {
      int ch = StringGetCharacter(value, i);
      if(ch == ' ')
         out += "%20";
      else if(ch == '+')
         out += "%2B";
      else if(ch == '&')
         out += "%26";
      else if(ch == '=')
         out += "%3D";
      else if(ch == '?')
         out += "%3F";
      else
         out += StringSubstr(value, i, 1);
   }
   return out;
}

//+------------------------------------------------------------------+
//| Utility: nonce generator                                          |
//+------------------------------------------------------------------+
string GenerateNonce()
{
   long stamp = (long)TimeGMT() * 1000;
   uint rnd1 = (uint)MathRand();
   uint rnd2 = (uint)GetTickCount();
   return StringFormat("%I64d", stamp) + "-" + IntegerToString((int)rnd1) + "-" + IntegerToString((int)rnd2);
}

//+------------------------------------------------------------------+
//| Utility: utf8 bytes conversion                                    |
//+------------------------------------------------------------------+
void StringToUtf8Bytes(string text, uchar &bytes[])
{
   ArrayResize(bytes, 0);
   StringToCharArray(text, bytes, 0, -1, CP_UTF8);
   int n = ArraySize(bytes);
   if(n > 0 && bytes[n - 1] == 0)
      ArrayResize(bytes, n - 1);
}

//+------------------------------------------------------------------+
//| Utility: concat bytes                                             |
//+------------------------------------------------------------------+
void ConcatBytes(const uchar &a[], const uchar &b[], uchar &out[])
{
   int na = ArraySize(a);
   int nb = ArraySize(b);
   ArrayResize(out, na + nb);
   for(int i = 0; i < na; i++) out[i] = a[i];
   for(int j = 0; j < nb; j++) out[na + j] = b[j];
}

//+------------------------------------------------------------------+
//| Utility: SHA-256                                                  |
//+------------------------------------------------------------------+
bool Sha256Bytes(const uchar &data[], uchar &digest[])
{
   uchar key[];
   ArrayResize(key, 0);
   int encoded = CryptEncode(CRYPT_HASH_SHA256, data, key, digest);
   return (encoded > 0);
}

//+------------------------------------------------------------------+
//| Utility: bytes to hex                                             |
//+------------------------------------------------------------------+
string BytesToHex(const uchar &data[])
{
   string out = "";
   int n = ArraySize(data);
   for(int i = 0; i < n; i++)
      out += StringFormat("%02x", (int)data[i]);
   return out;
}

//+------------------------------------------------------------------+
//| Utility: HMAC-SHA256 hex                                          |
//+------------------------------------------------------------------+
string HmacSha256Hex(string keyText, string message)
{
   uchar keyBytes[];
   uchar msgBytes[];
   StringToUtf8Bytes(keyText, keyBytes);
   StringToUtf8Bytes(message, msgBytes);

   if(ArraySize(keyBytes) > 64)
   {
      uchar keyHash[];
      if(!Sha256Bytes(keyBytes, keyHash))
         return "";
      ArrayResize(keyBytes, ArraySize(keyHash));
      ArrayCopy(keyBytes, keyHash, 0, 0, WHOLE_ARRAY);
   }

   uchar keyBlock[];
   ArrayResize(keyBlock, 64);
   ArrayInitialize(keyBlock, 0);
   int copyLen = MathMin(ArraySize(keyBytes), 64);
   for(int i = 0; i < copyLen; i++)
      keyBlock[i] = keyBytes[i];

   uchar oPad[], iPad[];
   ArrayResize(oPad, 64);
   ArrayResize(iPad, 64);
   for(int j = 0; j < 64; j++)
   {
      oPad[j] = (uchar)(keyBlock[j] ^ 0x5c);
      iPad[j] = (uchar)(keyBlock[j] ^ 0x36);
   }

   uchar innerInput[];
   ConcatBytes(iPad, msgBytes, innerInput);

   uchar innerHash[];
   if(!Sha256Bytes(innerInput, innerHash))
      return "";

   uchar outerInput[];
   ConcatBytes(oPad, innerHash, outerInput);

   uchar outerHash[];
   if(!Sha256Bytes(outerInput, outerHash))
      return "";

   return BytesToHex(outerHash);
}

//+------------------------------------------------------------------+
//| Processed signal persistence                                      |
//+------------------------------------------------------------------+
void LoadProcessedSignalIds()
{
   ArrayResize(processedSignalIds, 0);

   int handle = FileOpen(PROCESSED_IDS_FILE, FILE_READ | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(handle == INVALID_HANDLE)
   {
      if(EnableLogging) Print("Processed IDs file not found (first run).");
      return;
   }

   while(!FileIsEnding(handle))
   {
      string line = Trim(FileReadString(handle));
      if(line == "")
         continue;

      int n = ArraySize(processedSignalIds);
      ArrayResize(processedSignalIds, n + 1);
      processedSignalIds[n] = line;
   }

   FileClose(handle);
   if(EnableLogging) Print("Loaded processed signals: ", ArraySize(processedSignalIds));
}

void SaveProcessedSignalIds()
{
   int handle = FileOpen(PROCESSED_IDS_FILE, FILE_WRITE | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(handle == INVALID_HANDLE)
   {
      if(EnableLogging) Print("Failed to save processed IDs file.");
      return;
   }

   int n = ArraySize(processedSignalIds);
   for(int i = 0; i < n; i++)
      FileWriteString(handle, processedSignalIds[i] + "\r\n");

   FileClose(handle);
}

bool IsSignalProcessed(string signalId)
{
   int n = ArraySize(processedSignalIds);
   for(int i = 0; i < n; i++)
      if(processedSignalIds[i] == signalId)
         return true;
   return false;
}

void MarkSignalProcessed(string signalId)
{
   if(signalId == "" || IsSignalProcessed(signalId))
      return;

   int n = ArraySize(processedSignalIds);
   ArrayResize(processedSignalIds, n + 1);
   processedSignalIds[n] = signalId;

   int total = ArraySize(processedSignalIds);
   if(total > MAX_PROCESSED_IDS)
   {
      int removeCount = total - MAX_PROCESSED_IDS;
      for(int i = 0; i < MAX_PROCESSED_IDS; i++)
         processedSignalIds[i] = processedSignalIds[i + removeCount];
      ArrayResize(processedSignalIds, MAX_PROCESSED_IDS);
   }

   SaveProcessedSignalIds();
}

//+------------------------------------------------------------------+
//| Failed attempt cache                                              |
//+------------------------------------------------------------------+
int FindFailedIndex(string signalId)
{
   int n = ArraySize(failedSignalIds);
   for(int i = 0; i < n; i++)
      if(failedSignalIds[i] == signalId)
         return i;
   return -1;
}

int GetFailedAttempt(string signalId)
{
   int idx = FindFailedIndex(signalId);
   if(idx < 0) return 0;
   return failedSignalAttempts[idx];
}

int RegisterFailedAttempt(string signalId)
{
   int idx = FindFailedIndex(signalId);
   if(idx >= 0)
   {
      failedSignalAttempts[idx]++;
      return failedSignalAttempts[idx];
   }

   int n = ArraySize(failedSignalIds);
   ArrayResize(failedSignalIds, n + 1);
   ArrayResize(failedSignalAttempts, n + 1);
   failedSignalIds[n] = signalId;
   failedSignalAttempts[n] = 1;
   return 1;
}

void ClearFailedAttempt(string signalId)
{
   int idx = FindFailedIndex(signalId);
   if(idx < 0) return;

   int n = ArraySize(failedSignalIds);
   for(int i = idx; i < n - 1; i++)
   {
      failedSignalIds[i] = failedSignalIds[i + 1];
      failedSignalAttempts[i] = failedSignalAttempts[i + 1];
   }
   ArrayResize(failedSignalIds, n - 1);
   ArrayResize(failedSignalAttempts, n - 1);
}
//+------------------------------------------------------------------+
