#!/usr/bin/env python3
import requests
import json

BASE_URL = "https://netflixiptv-2.preview.emergentagent.com/api"

# Test the specific failing cases
print("Testing specific failing cases...")

# Test 1: Invalid code verification
print("\n1. Testing invalid code verification:")
try:
    response = requests.post(f"{BASE_URL}/auth/verify-code?code=INVALID1", timeout=5)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    if response.status_code == 404:
        print("   ✅ PASS - Correctly rejected invalid code")
    else:
        print("   ❌ FAIL - Wrong status code")
except Exception as e:
    print(f"   ❌ FAIL - Exception: {e}")

# Test 2: Create profile with invalid code
print("\n2. Testing profile creation with invalid code:")
try:
    response = requests.post(f"{BASE_URL}/profiles/INVALID1", 
                           json={"name": "Test", "is_child": False}, 
                           timeout=5)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    if response.status_code == 404:
        print("   ✅ PASS - Correctly rejected invalid code")
    else:
        print("   ❌ FAIL - Wrong status code")
except Exception as e:
    print(f"   ❌ FAIL - Exception: {e}")

# Test 3: Generate a code and test profile limit
print("\n3. Testing profile limit validation:")
try:
    # Generate a user code
    response = requests.post(f"{BASE_URL}/admin/user-codes", 
                           json={"max_profiles": 5}, 
                           timeout=5)
    if response.status_code == 200:
        user_code = response.json()["code"]
        print(f"   Generated code: {user_code}")
        
        # Create 5 profiles
        for i in range(5):
            profile_response = requests.post(f"{BASE_URL}/profiles/{user_code}", 
                                           json={"name": f"Profile {i+1}", "is_child": False}, 
                                           timeout=5)
            if profile_response.status_code == 200:
                print(f"   ✅ Created profile {i+1}")
            else:
                print(f"   ❌ Failed to create profile {i+1}: {profile_response.status_code}")
        
        # Try to create 6th profile (should fail)
        limit_response = requests.post(f"{BASE_URL}/profiles/{user_code}", 
                                     json={"name": "Profile 6 - Should Fail", "is_child": False}, 
                                     timeout=5)
        print(f"   6th profile attempt - Status: {limit_response.status_code}")
        print(f"   6th profile attempt - Response: {limit_response.json()}")
        
        if limit_response.status_code == 400:
            print("   ✅ PASS - Correctly enforced profile limit")
        else:
            print("   ❌ FAIL - Profile limit not enforced")
    else:
        print(f"   ❌ Failed to generate user code: {response.status_code}")
        
except Exception as e:
    print(f"   ❌ FAIL - Exception: {e}")

print("\nTest completed!")