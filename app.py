import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import datetime
import random

app = Flask(__name__, static_folder='../frontend', static_url_path='/')
CORS(app)

# --- Data Simulation ---
def get_simulated_data():
    hour = datetime.datetime.now().hour
    
    # Solar yield logic (peak at noon, 0 at night)
    if 6 <= hour <= 18:
        # Simple bell curve centered around 12 (noon)
        solar_yield = max(0, 5.0 - abs(hour - 12) * 0.8 + random.uniform(-0.5, 0.5))
    else:
        solar_yield = 0.0
        
    # Base grid usage varies
    grid_usage = max(0.5, 3.0 - solar_yield + random.uniform(-0.2, 1.0))
    
    # Battery level Mock logic (assume charges during day, drains at night)
    if hour > 18:
        battery_level = max(20, 100 - (hour - 18) * 5)
    elif hour < 6:
        battery_level = max(20, 40 - hour * 3)
    else:
        # Charging
        battery_level = min(100, 40 + (hour - 6) * 6)
        
    return {
        "solarYield": round(solar_yield, 2),
        "gridUsage": round(grid_usage, 2),
        "batteryLevel": round(battery_level, 2),
        "timestamp": datetime.datetime.now().isoformat()
    }

# --- Backend Routes ---

import firebase_mock

@app.route('/api/status', methods=['GET'])
def status():
    data = get_simulated_data()
    # Log this to Firebase mock
    firebase_mock.log_energy_data(data)
    return jsonify(data)

@app.route('/api/history', methods=['GET'])
def history():
    period = request.args.get('period', 'realtime')
    
    if period == 'realtime':
        data = firebase_mock.get_historical_data()
        return jsonify(data[-20:])
    elif period == 'weekly':
        # Generate 7 mock daily datapoints
        mock_data = []
        now = datetime.datetime.now()
        for i in range(7):
            d = now - datetime.timedelta(days=6-i)
            mock_data.append({
                "logTime": d.isoformat(),
                "solarYield": round(random.uniform(15.0, 30.0), 2),
                "gridUsage": round(random.uniform(5.0, 20.0), 2),
                "batteryLevel": round(random.uniform(40.0, 100.0), 2)
            })
        return jsonify(mock_data)
    elif period == 'monthly':
        # Generate 4 mock weekly datapoints
        mock_data = []
        now = datetime.datetime.now()
        for i in range(4):
            d = now - datetime.timedelta(weeks=3-i)
            mock_data.append({
                "logTime": d.isoformat(),
                "solarYield": round(random.uniform(100.0, 200.0), 2),
                "gridUsage": round(random.uniform(50.0, 150.0), 2),
                "batteryLevel": round(random.uniform(40.0, 100.0), 2)
            })
        return jsonify(mock_data)

@app.route('/api/optimization', methods=['GET'])
def optimization():
    hour = datetime.datetime.now().hour
    
    # Determine overall solar status
    if 10 <= hour <= 15:
        hint = "Peak solar production! Excelent time to run heavy appliances."
        status = "optimal"
        solar_abundant = True
    elif 15 < hour < 18 or 6 <= hour < 10:
        hint = "Solar is moderate. Prioritize essential usage."
        status = "warning"
        solar_abundant = False
    else:
        hint = "Low/No solar yield. Conserve battery and minimize grid reliance."
        status = "suboptimal"
        solar_abundant = False

    # Appliance logic
    appliances = [
        {"id": "hvac", "name": "HVAC System", "icon": "fa-temperature-arrow-up", "baseKw": 3.5, "alwaysOn": False},
        {"id": "fridge", "name": "Refrigerator", "icon": "fa-snowflake", "baseKw": 0.4, "alwaysOn": True},
        {"id": "ev", "name": "EV Charger", "icon": "fa-car-side", "baseKw": 7.0, "alwaysOn": False},
        {"id": "washer", "name": "Washer & Dryer", "icon": "fa-jug-detergent", "baseKw": 2.5, "alwaysOn": False},
        {"id": "dishwasher", "name": "Dishwasher", "icon": "fa-sink", "baseKw": 1.5, "alwaysOn": False}
    ]
    
    appliance_data = []
    
    for app in appliances:
        # Mock active state: fridge always on
        is_active = False
        if app["alwaysOn"]:
            is_active = True
        elif app["id"] == "hvac":
            is_active = random.choice([True, True, False])
        elif app["id"] == "ev":
            is_active = random.choice([True, False]) if 0 <= hour <= 6 else random.choice([True, False, False, False])
        else:
            is_active = random.choice([True, False])
            
        current_kw = round(app["baseKw"] + random.uniform(-0.1, 0.1), 2) if is_active else 0.0
        
        # Recommendations
        if app["alwaysOn"]:
            recommendation = "Keep Active (Essential)"
            action = "none" # no action needed
        else:
            if is_active:
                if solar_abundant:
                    recommendation = "Optimal time to run"
                    action = "keep_on"
                else:
                    recommendation = "Consider shutting down"
                    action = "turn_off"
            else:
                if solar_abundant and app['id'] in ['washer', 'dishwasher', 'ev']:
                    recommendation = "Good time to turn on"
                    action = "turn_on"
                else:
                    recommendation = "Keep off"
                    action = "keep_off"
                    
        appliance_data.append({
            "id": app["id"],
            "name": app["name"],
            "icon": app["icon"],
            "isActive": is_active,
            "consumptionKwh": current_kw,
            "recommendation": recommendation,
            "action": action
        })

    return jsonify({
        "hint": hint,
        "status": status,
        "currentHour": hour,
        "appliances": appliance_data
    })

@app.route('/api/carbon', methods=['GET'])
def carbon():
    period = request.args.get('period', 'realtime')
    
    if period == 'realtime':
        saved_kwh = random.uniform(2.0, 5.0)
    elif period == 'weekly':
        saved_kwh = random.uniform(20.0, 35.0)
    elif period == 'monthly':
        saved_kwh = random.uniform(100.0, 150.0)
        
    co2_saved_kg = saved_kwh * 0.38
    
    return jsonify({
        "co2SavedKg": round(co2_saved_kg, 2),
        "energyOffsetKwh": round(saved_kwh, 2),
        "equivalentTreesPlanted": round(co2_saved_kg / 21.0, 1) # ~21kg absorbed by tree/year
    })

# --- Static Frontend Serving ---

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(port=5001, debug=True)
