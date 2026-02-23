#property strict
#property version   "1.00"
#property description "ARRA7 Copytrade77 Bridge Test EA (legacy bridge key mode)"

#include <Trade/Trade.mqh>

input string InpBridgeBaseUrl = "https://arra7-app.vercel.app/api/copytrade-arra77/bridge";
input string InpBridgeKey = "";
input string InpSymbol = "XAUUSD";
input double InpLots = 0.01;
input int InpMagic = 770077;
input int InpPollSeconds = 3;
input int InpHeartbeatSeconds = 30;
input bool InpOneTradeAtATimeLocal = true;
input int InpMaxSpreadPoints = 80;
input int InpDeviationPoints = 50;
input int InpRequestTimeoutMs = 10000;

struct DispatchData
{
   bool has_signal;
   string reason;
   string dispatch_id;
   string symbol;
   string side;
   string order_type;
   double entry_price;
   double stop_loss;
   double take_profit_1;
};

struct PositionMap
{
   long ticket;
   string position_id;
   string symbol;
   string side;
   bool open;
};

CTrade g_trade;
ulong g_last_poll_ms = 0;
ulong g_last_heartbeat_ms = 0;
int g_idle_poll_streak = 0;
PositionMap g_positions[];

string TrimSlashRight(const string value)
{
   string out = value;
   while(StringLen(out) > 0 && StringSubstr(out, StringLen(out) - 1, 1) == "/")
      out = StringSubstr(out, 0, StringLen(out) - 1);
   return out;
}

string NormalizeText(const string value)
{
   string out = value;
   StringTrimLeft(out);
   StringTrimRight(out);
   return out;
}

string EscapeJson(const string value)
{
   string out = value;
   StringReplace(out, "\\", "\\\\");
   StringReplace(out, "\"", "\\\"");
   StringReplace(out, "\r", " ");
   StringReplace(out, "\n", " ");
   return out;
}

string BuildBridgeUrl(const string path, const bool with_key_query)
{
   string base = TrimSlashRight(InpBridgeBaseUrl);
   if(with_key_query)
      return base + path + "?bridgeKey=" + InpBridgeKey;
   return base + path;
}

bool HttpRequest(const string method, const string url, const string body, int &status_code, string &response_body)
{
   char request_data[];
   if(StringLen(body) > 0)
      StringToCharArray(body, request_data, 0, StringLen(body), CP_UTF8);
   else
      ArrayResize(request_data, 0);

   char response_data[];
   string response_headers = "";
   string headers = "Content-Type: application/json\r\nAccept: application/json\r\n";

   ResetLastError();
   status_code = WebRequest(method, url, headers, InpRequestTimeoutMs, request_data, response_data, response_headers);
   if(status_code == -1)
   {
      int err = GetLastError();
      Print("ARRA7 Bridge WebRequest failed: method=", method, " url=", url, " err=", err);
      return false;
   }

   response_body = CharArrayToString(response_data, 0, WHOLE_ARRAY, CP_UTF8);
   return true;
}

string JsonGetString(const string json, const string key)
{
   string marker = "\"" + key + "\":";
   int len = StringLen(json);
   int search_from = 0;
   while(search_from < len)
   {
      int idx = StringFind(json, marker, search_from);
      if(idx < 0)
         return "";

      idx += StringLen(marker);
      while(idx < len)
      {
         ushort ch = (ushort)StringGetCharacter(json, idx);
         if(ch == 32 || ch == 9)
         {
            idx++;
            continue;
         }
         break;
      }

      if(idx < len && (ushort)StringGetCharacter(json, idx) == 34)
      {
         idx++;
         int end = idx;
         while(end < len)
         {
            ushort ch = (ushort)StringGetCharacter(json, end);
            if(ch == 34)
            {
               ushort prev = (ushort)StringGetCharacter(json, end - 1);
               if(prev != 92)
                  break;
            }
            end++;
         }
         if(end > idx && end < len)
         {
            string out = StringSubstr(json, idx, end - idx);
            StringReplace(out, "\\\"", "\"");
            StringReplace(out, "\\\\", "\\");
            return out;
         }
      }

      search_from = idx + 1;
   }
   return "";
}

double JsonGetNumber(const string json, const string key, const double fallback)
{
   string marker = "\"" + key + "\":";
   int idx = StringFind(json, marker);
   if(idx < 0)
      return fallback;

   idx += StringLen(marker);
   int len = StringLen(json);
   while(idx < len)
   {
      ushort ch = (ushort)StringGetCharacter(json, idx);
      if(ch == 32 || ch == 9 || ch == 34)
      {
         idx++;
         continue;
      }
      break;
   }

   int end = idx;
   while(end < len)
   {
      ushort ch = (ushort)StringGetCharacter(json, end);
      bool is_number_char = ((ch >= 48 && ch <= 57) || ch == 45 || ch == 43 || ch == 46 || ch == 69 || ch == 101);
      if(!is_number_char)
         break;
      end++;
   }

   if(end <= idx)
      return fallback;

   string raw = StringSubstr(json, idx, end - idx);
   return StringToDouble(raw);
}

bool JsonGetBool(const string json, const string key, const bool fallback)
{
   string marker = "\"" + key + "\":";
   int idx = StringFind(json, marker);
   if(idx < 0)
      return fallback;

   idx += StringLen(marker);
   int len = StringLen(json);
   while(idx < len)
   {
      ushort ch = (ushort)StringGetCharacter(json, idx);
      if(ch == 32 || ch == 9)
      {
         idx++;
         continue;
      }
      break;
   }

   string tail = StringSubstr(json, idx, 5);
   if(StringFind(tail, "true", 0) == 0)
      return true;
   if(StringFind(tail, "false", 0) == 0)
      return false;
   return fallback;
}

double GetPipSize(const string symbol)
{
   string upper = symbol;
   StringToUpper(upper);
   if(StringFind(upper, "XAU", 0) >= 0 || StringFind(upper, "XAG", 0) >= 0)
      return 0.1;
   if(StringFind(upper, "JPY", 0) >= 0)
      return 0.01;
   return 0.0001;
}

int CountOpenPositions(const string symbol)
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      if((int)PositionGetInteger(POSITION_MAGIC) != InpMagic)
         continue;

      if(symbol != "" && PositionGetString(POSITION_SYMBOL) != symbol)
         continue;

      count++;
   }
   return count;
}

long FindLatestPositionTicket(const string symbol)
{
   long best_ticket = 0;
   datetime best_time = 0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      if((int)PositionGetInteger(POSITION_MAGIC) != InpMagic)
         continue;
      if(PositionGetString(POSITION_SYMBOL) != symbol)
         continue;

      datetime opened = (datetime)PositionGetInteger(POSITION_TIME);
      if(opened >= best_time)
      {
         best_time = opened;
         best_ticket = (long)PositionGetInteger(POSITION_TICKET);
      }
   }
   return best_ticket;
}

int FindPositionMapIndex(const long ticket)
{
   for(int i = 0; i < ArraySize(g_positions); i++)
   {
      if(g_positions[i].ticket == ticket)
         return i;
   }
   return -1;
}

void RememberPosition(const long ticket, const string position_id, const string symbol, const string side)
{
   int idx = FindPositionMapIndex(ticket);
   if(idx < 0)
   {
      idx = ArraySize(g_positions);
      ArrayResize(g_positions, idx + 1);
   }

   g_positions[idx].ticket = ticket;
   g_positions[idx].position_id = position_id;
   g_positions[idx].symbol = symbol;
   g_positions[idx].side = side;
   g_positions[idx].open = true;
}

bool SendBridgeLog(const string level, const string message)
{
   int status = 0;
   string response = "";
   string payload = StringFormat(
      "{\"bridgeKey\":\"%s\",\"level\":\"%s\",\"message\":\"%s\"}",
      EscapeJson(InpBridgeKey),
      EscapeJson(level),
      EscapeJson(message)
   );
   if(!HttpRequest("POST", BuildBridgeUrl("/logs", false), payload, status, response))
      return false;
   return (status >= 200 && status < 300);
}

bool SendHeartbeat()
{
   int status = 0;
   string response = "";
   string payload = StringFormat(
      "{\"bridgeKey\":\"%s\",\"mt5Login\":\"%I64d\",\"broker\":\"%s\",\"server\":\"%s\",\"symbol\":\"%s\",\"timeframe\":\"%s\",\"eaVersion\":\"1.0.0-test\"}",
      EscapeJson(InpBridgeKey),
      (long)AccountInfoInteger(ACCOUNT_LOGIN),
      EscapeJson(AccountInfoString(ACCOUNT_COMPANY)),
      EscapeJson(AccountInfoString(ACCOUNT_SERVER)),
      EscapeJson(InpSymbol),
      EscapeJson(EnumToString((ENUM_TIMEFRAMES)Period()))
   );

   if(!HttpRequest("POST", BuildBridgeUrl("/heartbeat", false), payload, status, response))
      return false;
   if(status < 200 || status >= 300)
   {
      Print("ARRA7 Bridge heartbeat failed. code=", status, " body=", response);
      return false;
   }
   return true;
}

bool ParseDispatchResponse(const string response, DispatchData &out_dispatch)
{
   out_dispatch.has_signal = JsonGetBool(response, "hasSignal", false);
   out_dispatch.reason = JsonGetString(response, "reason");

   if(!out_dispatch.has_signal)
      return true;

   out_dispatch.dispatch_id = JsonGetString(response, "dispatchId");
   out_dispatch.symbol = JsonGetString(response, "symbol");
   out_dispatch.side = JsonGetString(response, "side");
   out_dispatch.order_type = JsonGetString(response, "orderType");
   out_dispatch.entry_price = JsonGetNumber(response, "entryPrice", 0.0);
   out_dispatch.stop_loss = JsonGetNumber(response, "stopLoss", 0.0);
   out_dispatch.take_profit_1 = JsonGetNumber(response, "takeProfit1", 0.0);

   if(out_dispatch.dispatch_id == "" || out_dispatch.symbol == "" || out_dispatch.side == "")
      return false;

   return true;
}

bool PollNextSignal(DispatchData &out_dispatch)
{
   int status = 0;
   string response = "";
   if(!HttpRequest("GET", BuildBridgeUrl("/signals/next", true), "", status, response))
      return false;

   if(status < 200 || status >= 300)
   {
      Print("ARRA7 Bridge poll failed. code=", status, " body=", response);
      return false;
   }

   if(!ParseDispatchResponse(response, out_dispatch))
   {
      Print("ARRA7 Bridge parse dispatch failed. body=", response);
      return false;
   }
   return true;
}

bool SendAck(const string dispatch_id)
{
   int status = 0;
   string response = "";
   string payload = StringFormat(
      "{\"bridgeKey\":\"%s\",\"dispatchId\":\"%s\"}",
      EscapeJson(InpBridgeKey),
      EscapeJson(dispatch_id)
   );

   if(!HttpRequest("POST", BuildBridgeUrl("/signals/ack", false), payload, status, response))
      return false;
   return (status >= 200 && status < 300);
}

bool SendRejected(const string dispatch_id, const string reason_code, const string reason_message)
{
   int status = 0;
   string response = "";
   string payload = StringFormat(
      "{\"bridgeKey\":\"%s\",\"dispatchId\":\"%s\",\"reasonCode\":\"%s\",\"reason\":\"%s\"}",
      EscapeJson(InpBridgeKey),
      EscapeJson(dispatch_id),
      EscapeJson(reason_code),
      EscapeJson(reason_message)
   );

   if(!HttpRequest("POST", BuildBridgeUrl("/signals/rejected", false), payload, status, response))
      return false;
   return (status >= 200 && status < 300);
}

bool SendExecuted(const string dispatch_id, const long mt5_ticket, const double executed_price, const double lots, string &out_position_id)
{
   out_position_id = "";
   int status = 0;
   string response = "";
   string payload = StringFormat(
      "{\"bridgeKey\":\"%s\",\"dispatchId\":\"%s\",\"mt5Ticket\":%I64d,\"executedPrice\":%s,\"volumeLots\":%s}",
      EscapeJson(InpBridgeKey),
      EscapeJson(dispatch_id),
      mt5_ticket,
      DoubleToString(executed_price, 5),
      DoubleToString(lots, 2)
   );

   if(!HttpRequest("POST", BuildBridgeUrl("/signals/executed", false), payload, status, response))
      return false;
   if(status < 200 || status >= 300)
   {
      Print("ARRA7 Bridge executed callback failed. code=", status, " body=", response);
      return false;
   }

   out_position_id = JsonGetString(response, "positionId");
   return true;
}

bool SendPositionClosed(const string position_id, const string close_reason, const double close_price, const double pips, const double pnl)
{
   int status = 0;
   string response = "";
   string payload = StringFormat(
      "{\"bridgeKey\":\"%s\",\"positionId\":\"%s\",\"closeReason\":\"%s\",\"closePrice\":%s,\"pipsResult\":%s,\"pnlValue\":%s}",
      EscapeJson(InpBridgeKey),
      EscapeJson(position_id),
      EscapeJson(close_reason),
      DoubleToString(close_price, 5),
      DoubleToString(pips, 2),
      DoubleToString(pnl, 2)
   );

   if(!HttpRequest("POST", BuildBridgeUrl("/positions/closed", false), payload, status, response))
      return false;
   if(status < 200 || status >= 300)
   {
      Print("ARRA7 Bridge close callback failed. code=", status, " body=", response);
      return false;
   }
   return true;
}

double CurrentSpreadPoints(const string symbol)
{
   double ask = 0.0;
   double bid = 0.0;
   double point = 0.0;
   if(!SymbolInfoDouble(symbol, SYMBOL_ASK, ask))
      return 9999;
   if(!SymbolInfoDouble(symbol, SYMBOL_BID, bid))
      return 9999;
   if(!SymbolInfoDouble(symbol, SYMBOL_POINT, point) || point <= 0)
      return 9999;
   return (ask - bid) / point;
}

bool PlaceMarketOrder(const DispatchData &dispatch, long &out_ticket, double &out_price, string &out_error)
{
   out_ticket = 0;
   out_price = 0.0;
   out_error = "";

   if(dispatch.order_type != "MARKET")
   {
      out_error = "Unsupported order type in test EA: " + dispatch.order_type;
      return false;
   }

   if(!SymbolSelect(dispatch.symbol, true))
   {
      out_error = "Failed to select symbol " + dispatch.symbol;
      return false;
   }

   double spread_points = CurrentSpreadPoints(dispatch.symbol);
   if(spread_points > InpMaxSpreadPoints)
   {
      out_error = StringFormat("Spread too wide: %.1f > %d points", spread_points, InpMaxSpreadPoints);
      return false;
   }

   if(InpOneTradeAtATimeLocal && CountOpenPositions(dispatch.symbol) > 0)
   {
      out_error = "Local one-trade lock active";
      return false;
   }

   g_trade.SetExpertMagicNumber(InpMagic);
   g_trade.SetDeviationInPoints(InpDeviationPoints);

   bool ok = false;
   if(dispatch.side == "BUY")
      ok = g_trade.Buy(InpLots, dispatch.symbol, 0.0, dispatch.stop_loss, dispatch.take_profit_1, "ARRA7 CT77");
   else if(dispatch.side == "SELL")
      ok = g_trade.Sell(InpLots, dispatch.symbol, 0.0, dispatch.stop_loss, dispatch.take_profit_1, "ARRA7 CT77");
   else
   {
      out_error = "Invalid side " + dispatch.side;
      return false;
   }

   if(!ok)
   {
      out_error = g_trade.ResultRetcodeDescription();
      return false;
   }

   out_ticket = FindLatestPositionTicket(dispatch.symbol);
   if(out_ticket <= 0)
      out_ticket = (long)g_trade.ResultOrder();

   out_price = g_trade.ResultPrice();
   if(out_ticket > 0 && PositionSelectByTicket((ulong)out_ticket))
   {
      double opened_price = PositionGetDouble(POSITION_PRICE_OPEN);
      if(opened_price > 0)
         out_price = opened_price;
   }

   if(out_price <= 0.0)
      out_price = dispatch.entry_price;

   return true;
}

bool GetClosedPositionSummary(const long ticket, double &open_price, double &close_price, double &pnl_value)
{
   open_price = 0.0;
   close_price = 0.0;
   pnl_value = 0.0;

   datetime from_time = TimeCurrent() - 86400 * 14;
   if(!HistorySelect(from_time, TimeCurrent()))
      return false;

   int total = HistoryDealsTotal();
   bool has_open = false;
   bool has_close = false;

   for(int i = 0; i < total; i++)
   {
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0)
         continue;

      long deal_position = (long)HistoryDealGetInteger(deal, DEAL_POSITION_ID);
      if(deal_position != ticket)
         continue;

      long deal_magic = (long)HistoryDealGetInteger(deal, DEAL_MAGIC);
      if(deal_magic != InpMagic)
         continue;

      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(deal, DEAL_ENTRY);
      double price = HistoryDealGetDouble(deal, DEAL_PRICE);

      if(entry == DEAL_ENTRY_IN && !has_open)
      {
         open_price = price;
         has_open = true;
      }

      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
      {
         close_price = price;
         pnl_value += HistoryDealGetDouble(deal, DEAL_PROFIT);
         pnl_value += HistoryDealGetDouble(deal, DEAL_SWAP);
         pnl_value += HistoryDealGetDouble(deal, DEAL_COMMISSION);
         has_close = true;
      }
   }

   return has_close;
}

void ProcessClosedPositions()
{
   int count = ArraySize(g_positions);
   if(count <= 0)
      return;

   for(int i = 0; i < count; i++)
   {
      if(!g_positions[i].open || g_positions[i].position_id == "")
         continue;

      if(PositionSelectByTicket((ulong)g_positions[i].ticket))
         continue;

      double open_price = 0.0;
      double close_price = 0.0;
      double pnl_value = 0.0;
      if(!GetClosedPositionSummary(g_positions[i].ticket, open_price, close_price, pnl_value))
      {
         close_price = 0.0;
         pnl_value = 0.0;
      }

      double pips = 0.0;
      double pip_size = GetPipSize(g_positions[i].symbol);
      if(open_price > 0.0 && close_price > 0.0 && pip_size > 0.0)
      {
         if(g_positions[i].side == "BUY")
            pips = (close_price - open_price) / pip_size;
         else
            pips = (open_price - close_price) / pip_size;
      }

      string close_reason = "MANUAL";
      if(pnl_value > 0.0)
         close_reason = "TP";
      else if(pnl_value < 0.0)
         close_reason = "SL";

      if(SendPositionClosed(g_positions[i].position_id, close_reason, close_price, pips, pnl_value))
         Print("ARRA7 Bridge close reported: positionId=", g_positions[i].position_id, " ticket=", g_positions[i].ticket);
      else
         Print("ARRA7 Bridge close report failed: positionId=", g_positions[i].position_id, " ticket=", g_positions[i].ticket);

      g_positions[i].open = false;
   }
}

void PollAndExecute()
{
   DispatchData dispatch;
   dispatch.has_signal = false;
   dispatch.reason = "";

   if(!PollNextSignal(dispatch))
      return;

   if(!dispatch.has_signal)
   {
      if(dispatch.reason != "")
         Print("ARRA7 Bridge no signal. reason=", dispatch.reason);
      else
      {
         g_idle_poll_streak++;
         if((g_idle_poll_streak % 20) == 0)
            Print("ARRA7 Bridge no signal (idle). polling still active.");
      }
      return;
   }
   g_idle_poll_streak = 0;

   if(dispatch.symbol != InpSymbol)
   {
      SendRejected(dispatch.dispatch_id, "SYMBOL_MISMATCH", "EA symbol mismatch. expected " + InpSymbol + ", got " + dispatch.symbol);
      return;
   }

   if(!SendAck(dispatch.dispatch_id))
      Print("ARRA7 Bridge ack failed for dispatch ", dispatch.dispatch_id);

   long ticket = 0;
   double executed_price = 0.0;
   string trade_error = "";
   if(!PlaceMarketOrder(dispatch, ticket, executed_price, trade_error))
   {
      Print("ARRA7 Bridge execute failed: dispatch=", dispatch.dispatch_id, " error=", trade_error);
      SendRejected(dispatch.dispatch_id, "EXECUTION_FAILED", trade_error);
      return;
   }

   string position_id = "";
   if(!SendExecuted(dispatch.dispatch_id, ticket, executed_price, InpLots, position_id))
   {
      Print("ARRA7 Bridge executed callback failed for dispatch=", dispatch.dispatch_id);
      return;
   }

   if(position_id != "")
      RememberPosition(ticket, position_id, dispatch.symbol, dispatch.side);

   Print("ARRA7 Bridge executed: dispatch=", dispatch.dispatch_id, " ticket=", ticket, " positionId=", position_id);
}

int OnInit()
{
   if(NormalizeText(InpBridgeBaseUrl) == "")
   {
      Print("ARRA7 Bridge init failed: InpBridgeBaseUrl kosong.");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(NormalizeText(InpBridgeKey) == "")
   {
      Print("ARRA7 Bridge init failed: InpBridgeKey kosong.");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(!SymbolSelect(InpSymbol, true))
      Print("ARRA7 Bridge warning: gagal SymbolSelect ", InpSymbol);

   g_trade.SetExpertMagicNumber(InpMagic);
   g_trade.SetDeviationInPoints(InpDeviationPoints);

   EventSetTimer(1);
   SendBridgeLog("INFO", "EA initialized.");
   Print("ARRA7 Bridge test EA initialized. symbol=", InpSymbol, " poll=", InpPollSeconds, "s");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   SendBridgeLog("INFO", StringFormat("EA deinit. reason=%d", reason));
}

void OnTick()
{
   // EventSetTimer handles polling.
}

void OnTimer()
{
   if(!TerminalInfoInteger(TERMINAL_CONNECTED))
      return;

   ulong now_ms = (ulong)GetTickCount();
   ulong heartbeat_interval_ms = (ulong)MathMax(1, InpHeartbeatSeconds) * 1000;
   ulong poll_interval_ms = (ulong)MathMax(1, InpPollSeconds) * 1000;

   if(g_last_heartbeat_ms == 0 || (now_ms - g_last_heartbeat_ms) >= heartbeat_interval_ms)
   {
      SendHeartbeat();
      g_last_heartbeat_ms = now_ms;
   }

   if(g_last_poll_ms == 0 || (now_ms - g_last_poll_ms) >= poll_interval_ms)
   {
      PollAndExecute();
      g_last_poll_ms = now_ms;
   }

   ProcessClosedPositions();
}
