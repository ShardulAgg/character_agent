#!/usr/bin/env python3
"""
Backend startup script with dependency checking
"""

import sys
import os

def check_dependencies():
    """Check if required dependencies are installed"""
    missing_deps = []
    
    try:
        import fastapi
        print("✅ FastAPI: Available")
    except ImportError:
        missing_deps.append("fastapi")
        
    try:
        import uvicorn
        print("✅ Uvicorn: Available")  
    except ImportError:
        missing_deps.append("uvicorn")
        
    try:
        import firebase_admin
        print("✅ Firebase Admin: Available")
    except ImportError:
        print("⚠️  Firebase Admin: Not available (using mock service)")
        
    return missing_deps

def show_installation_instructions(missing_deps):
    """Show installation instructions for missing dependencies"""
    print("\n" + "="*50)
    print("🚨 MISSING DEPENDENCIES")
    print("="*50)
    
    print("\nThe following dependencies need to be installed:")
    for dep in missing_deps:
        print(f"  - {dep}")
    
    print("\n📋 INSTALLATION INSTRUCTIONS:")
    print("1. Install all dependencies:")
    print("   pip install -r requirements.txt")
    print("\n2. Or install individually:")
    for dep in missing_deps:
        print(f"   pip install {dep}")
    
    print("\n3. For Firebase integration:")
    print("   pip install firebase-admin")
    
    print("\n4. Then run the backend:")
    print("   python main.py")
    print("   # or")
    print("   uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    
    print("\n💡 ALTERNATIVE: Mock Mode")
    print("The backend includes a mock Firebase service that works")
    print("without firebase-admin for development and testing.")
    
    print("="*50)

def main():
    """Main startup function"""
    print("🚀 TikTok Genie Backend Startup")
    print("="*40)
    
    # Check dependencies
    missing_deps = check_dependencies()
    
    if missing_deps:
        show_installation_instructions(missing_deps)
        print("\n❌ Cannot start backend without required dependencies")
        return False
    
    # All dependencies available - start the server
    print("\n✅ All dependencies available!")
    print("🚀 Starting FastAPI server...")
    
    try:
        import main
        # The main.py will handle the actual server startup
        print("Backend module loaded successfully!")
        return True
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)