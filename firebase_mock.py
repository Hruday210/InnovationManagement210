import json
import os
import datetime

# A mock Firebase integration that uses a local file to simulate Firebase Realtime DB / Firestore
DB_FILE = "mock_firebase_db.json"

def log_energy_data(data):
    # Simulate saving to Firebase database
    try:
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r') as f:
                db_data = json.load(f)
        else:
            db_data = []
            
        data["logTime"] = datetime.datetime.now().isoformat()
        db_data.append(data)
        
        with open(DB_FILE, 'w') as f:
            json.dump(db_data, f, indent=2)
            
        return True
    except Exception as e:
        print(f"Error logging to mock Firebase: {e}")
        return False

def get_historical_data():
    try:
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error reading from mock Firebase: {e}")
        return []
        
    return []
