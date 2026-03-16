import os
import subprocess
import sys
import time

def print_banner():
    print("="*60)
    print("      🏦 CAREBANK FINANCIAL PLATFORM - LAUNCHER 🚀")
    print("="*60)
    print("This script will help you start the CareBank Full-Stack app.")
    print("-"*60)

def check_env():
    if not os.path.exists("backend/.env"):
        print("⚠️  Warning: backend/.env file missing!")
        print("   Please create backend/.env and add GEMINI_API_KEY=your_key")
    else:
        print("✅ Backend environment file detected.")

def launch():
    print_banner()
    check_env()
    
    print("\n[Step 1/2] Starting Backend (FastAPI)...")
    # Start backend in a new window/process
    try:
        if sys.platform == "win32":
            subprocess.Popen(["start", "cmd", "/k", "cd backend && python main.py"], shell=True)
        else:
            subprocess.Popen(["terminal", "-e", "bash -c 'cd backend && python main.py'"])
        print("✅ Backend process initiated.")
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")

    time.sleep(2)

    print("\n[Step 2/2] Starting Frontend (React + Vite)...")
    # Start frontend
    try:
        if sys.platform == "win32":
            subprocess.Popen(["start", "cmd", "/k", "cd frontend && npm run dev"], shell=True)
        else:
            subprocess.Popen(["terminal", "-e", "bash -c 'cd frontend && npm run dev'"])
        print("✅ Frontend process initiated.")
    except Exception as e:
        print(f"❌ Failed to start frontend: {e}")

    print("\n" + "="*60)
    print("🚀 CareBank is launching!")
    print("   - API: http://localhost:8000")
    print("   - Web: http://localhost:5173")
    print("="*60)
    print("Keep this window open or check the new terminal windows for logs.")

if __name__ == "__main__":
    launch()
