#!/usr/bin/env python3
"""
Test script for Firebase service imports
Tests both real and mock Firebase services
"""

import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_firebase_imports():
    print("Testing Firebase service imports...")
    
    # Test real Firebase service
    try:
        from firebase_service import FirebaseService as RealFirebaseService
        print("✅ Real Firebase service import: SUCCESS")
        real_service_available = True
    except ImportError as e:
        print(f"❌ Real Firebase service import: FAILED ({e})")
        real_service_available = False
    
    # Test mock Firebase service  
    try:
        from firebase_service_mock import FirebaseService as MockFirebaseService
        print("✅ Mock Firebase service import: SUCCESS")
        mock_service_available = True
    except ImportError as e:
        print(f"❌ Mock Firebase service import: FAILED ({e})")
        mock_service_available = False
    
    # Test the fallback logic
    if real_service_available:
        from firebase_service import FirebaseService
        service_type = "Real Firebase"
    elif mock_service_available:
        from firebase_service_mock import FirebaseService
        service_type = "Mock Firebase"
    else:
        print("❌ No Firebase service available!")
        return False
    
    print(f"✅ Using: {service_type} service")
    
    # Test service initialization
    try:
        service = FirebaseService()
        print("✅ Service initialization: SUCCESS")
    except Exception as e:
        print(f"❌ Service initialization: FAILED ({e})")
        return False
    
    return True

if __name__ == "__main__":
    success = test_firebase_imports()
    if success:
        print("\n🎉 All Firebase service tests passed!")
    else:
        print("\n💥 Firebase service tests failed!")
        sys.exit(1)