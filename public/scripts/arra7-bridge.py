
import MetaTrader5 as mt5
import requests
import time
import json
import os
from datetime import datetime

# === CONFIGURATION ===
# User should replace this with their ID from the Web Dashboard
API_KEY = "PASTE_YOUR_ACCOUNT_ID_HERE" 
API_URL = "https://arra7-app.vercel.app/api/trading/bridge"
# API_URL = "http://localhost:3000/api/trading/bridge" # For Local Testing

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def connect_mt5():
    if not mt5.initialize():
        log(f"initialize() failed, error code = {mt5.last_error()}")
        return False
    else:
        log(f"MetaTrader5 connected: {mt5.terminal_info()}")
        return True

def poll_server():
    try:
        response = requests.get(f"{API_URL}?api_key={API_KEY}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                return data['trades']
            else:
                log(f"Server Error: {data.get('message')}")
        elif response.status_code == 401:
             log("Invalid API Key! Please check your configuration.")
    except Exception as e:
        log(f"Connection Error: {e}")
    return []

def execute_trade(trade):
    symbol = trade['symbol']
    action = trade['action'] # BUY / SELL
    lot = float(trade['lotSize'])
    sl = float(trade['sl'])
    tp = float(trade['tp'])
    
    # Check symbol
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        log(f"{symbol} not found, can not call order_check()")
        return None

    if not symbol_info.visible:
        log(f"{symbol} is not visible, trying to switch on")
        if not mt5.symbol_select(symbol,True):
            log(f"symbol_select({symbol}) failed, exit")
            return None

    order_type = mt5.ORDER_TYPE_BUY if action == 'BUY' else mt5.ORDER_TYPE_SELL
    price = mt5.symbol_info_tick(symbol).ask if action == 'BUY' else mt5.symbol_info_tick(symbol).bid
    
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lot,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 234000,
        "comment": "Arra7 AI Bot",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        log(f"Order failed: {result.comment}")
        return {"status": "FAILED", "error": result.comment}
    else:
        log(f"Order Executed! Ticket: {result.order}")
        return {"status": "FILLED", "ticket": result.order, "price": result.price}

def update_server(trade_id, result):
    try:
        payload = {
            "apiKey": API_KEY,
            "tradeId": trade_id,
            "status": result['status'],
        }
        if 'ticket' in result:
            payload['mtTicket'] = str(result['ticket'])
            payload['openPrice'] = result['price']
        if 'error' in result:
            payload['errorMessage'] = result['error']

        requests.post(API_URL, json=payload)
    except Exception as e:
        log(f"Failed to update server: {e}")

def main():
    print("=== ARRA7 DESKTOP BRIDGE v1.0 ===")
    print("1. Make sure MetaTrader 5 is running and AutoTrading is ON.")
    print(f"2. Connecting to API: {API_URL}")
    print(f"3. Using Key: {API_KEY}")
    
    if not connect_mt5():
        return

    while True:
        trades = poll_server()
        
        if trades:
            for trade in trades:
                log(f"New Signal Received: {trade['action']} {trade['symbol']}")
                result = execute_trade(trade)
                if result:
                    update_server(trade['id'], result)
        
        time.sleep(3) # Poll every 3 seconds

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        mt5.shutdown()
        print("Bridge stopped.")
