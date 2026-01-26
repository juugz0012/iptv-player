#!/usr/bin/env python3
"""
IPTV Player Backend API Tests
Tests all backend functionality as requested in the review.
"""

import requests
import json
import sys
from datetime import datetime
import os
from pathlib import Path

# Load environment variables
def load_env():
    """Load environment variables from frontend/.env"""
    env_path = Path("/app/frontend/.env")
    env_vars = {}
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    env_vars[key] = value.strip('"')
    return env_vars

# Get backend URL
env_vars = load_env()
BASE_URL = env_vars.get('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BASE_URL}/api"

print(f"Testing IPTV Player Backend API at: {API_BASE}")
print("=" * 60)

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "skipped": []
}

def log_test(test_name, status, details=""):
    """Log test result"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    if status == "PASS":
        test_results["passed"].append(test_name)
        print(f"✅ [{timestamp}] {test_name}")
    elif status == "FAIL":
        test_results["failed"].append(test_name)
        print(f"❌ [{timestamp}] {test_name}")
        if details:
            print(f"   Details: {details}")
    elif status == "SKIP":
        test_results["skipped"].append(test_name)
        print(f"⏭️  [{timestamp}] {test_name} - SKIPPED")
        if details:
            print(f"   Reason: {details}")

def make_request(method, endpoint, data=None, params=None):
    """Make HTTP request with error handling"""
    url = f"{API_BASE}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, timeout=10)
        
        return response
    except requests.exceptions.RequestException as e:
        return None

# Global variables for test data
generated_user_code = None
created_profiles = []
xtream_config_id = None

print("\n🔧 1. ADMIN - CONFIGURATION XTREAM")
print("-" * 40)

# Test 1: POST /api/admin/xtream-config
test_name = "POST /api/admin/xtream-config - Save configuration"
xtream_config = {
    "username": "testuser123",
    "password": "testpass456",
    "dns_url": "http://example-iptv.com:8080",
    "samsung_lg_dns": "http://samsung.example-iptv.com:8080"
}

response = make_request("POST", "/admin/xtream-config", xtream_config)
if response and response.status_code == 200:
    data = response.json()
    if "id" in data and "message" in data:
        xtream_config_id = data["id"]
        log_test(test_name, "PASS")
    else:
        log_test(test_name, "FAIL", "Missing id or message in response")
elif response:
    log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
else:
    log_test(test_name, "FAIL", "Request failed - connection error")

# Test 2: GET /api/admin/xtream-config
test_name = "GET /api/admin/xtream-config - Retrieve configuration"
response = make_request("GET", "/admin/xtream-config")
if response and response.status_code == 200:
    data = response.json()
    if data.get("configured") == True and "username" in data and "dns_url" in data:
        # Verify password is not returned for security
        if "password" not in data:
            log_test(test_name, "PASS")
        else:
            log_test(test_name, "FAIL", "Password should not be returned for security")
    else:
        log_test(test_name, "FAIL", "Invalid configuration data structure")
elif response:
    log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
else:
    log_test(test_name, "FAIL", "Request failed - connection error")

print("\n👥 2. ADMIN - GESTION CODES UTILISATEURS")
print("-" * 40)

# Test 3: POST /api/admin/user-codes
test_name = "POST /api/admin/user-codes - Generate new user code"
user_code_data = {"max_profiles": 5}

response = make_request("POST", "/admin/user-codes", user_code_data)
if response and response.status_code == 200:
    data = response.json()
    if "code" in data and "message" in data:
        generated_user_code = data["code"]
        # Verify code format (8 characters uppercase)
        if len(generated_user_code) == 8 and generated_user_code.isupper() and generated_user_code.isalnum():
            log_test(test_name, "PASS")
        else:
            log_test(test_name, "FAIL", f"Invalid code format: {generated_user_code} (should be 8 uppercase alphanumeric)")
    else:
        log_test(test_name, "FAIL", "Missing code or message in response")
elif response:
    log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
else:
    log_test(test_name, "FAIL", "Request failed - connection error")

# Test 4: GET /api/admin/user-codes
test_name = "GET /api/admin/user-codes - List all user codes"
response = make_request("GET", "/admin/user-codes")
if response and response.status_code == 200:
    data = response.json()
    if isinstance(data, list):
        # Check if our generated code is in the list
        found_code = False
        for code_entry in data:
            if code_entry.get("code") == generated_user_code:
                found_code = True
                break
        if found_code:
            log_test(test_name, "PASS")
        else:
            log_test(test_name, "FAIL", f"Generated code {generated_user_code} not found in list")
    else:
        log_test(test_name, "FAIL", "Response should be a list")
elif response:
    log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
else:
    log_test(test_name, "FAIL", "Request failed - connection error")

print("\n🔐 3. AUTHENTIFICATION UTILISATEUR")
print("-" * 40)

# Test 5: POST /api/auth/verify-code (valid code)
test_name = "POST /api/auth/verify-code - Valid code verification"
if generated_user_code:
    response = make_request("POST", f"/auth/verify-code?code={generated_user_code}")
    if response and response.status_code == 200:
        data = response.json()
        if data.get("valid") == True and data.get("code") == generated_user_code:
            log_test(test_name, "PASS")
        else:
            log_test(test_name, "FAIL", "Invalid response structure for valid code")
    elif response:
        log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    else:
        log_test(test_name, "FAIL", "Request failed - connection error")
else:
    log_test(test_name, "SKIP", "No user code generated in previous test")

# Test 6: POST /api/auth/verify-code (invalid code)
test_name = "POST /api/auth/verify-code - Invalid code verification"
invalid_code = "INVALID1"
response = make_request("POST", f"/auth/verify-code?code={invalid_code}")
if response and response.status_code == 404:
    log_test(test_name, "PASS")
elif response:
    log_test(test_name, "FAIL", f"Expected 404 for invalid code, got: {response.status_code}")
else:
    log_test(test_name, "FAIL", "Request failed - connection error")

print("\n👤 4. GESTION DES PROFILS")
print("-" * 40)

if not generated_user_code:
    print("⚠️  Skipping profile tests - no valid user code available")
else:
    # Test 7: POST /api/profiles/{code} - Create adult profile
    test_name = "POST /api/profiles/{code} - Create adult profile"
    adult_profile = {
        "name": "Jean Dupont",
        "is_child": False,
        "avatar": "adult_avatar_1"
    }
    
    response = make_request("POST", f"/profiles/{generated_user_code}", adult_profile)
    if response and response.status_code == 200:
        data = response.json()
        if "id" in data and data.get("name") == "Jean Dupont" and data.get("is_child") == False:
            created_profiles.append(data["id"])
            log_test(test_name, "PASS")
        else:
            log_test(test_name, "FAIL", "Invalid profile data structure")
    elif response:
        log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    else:
        log_test(test_name, "FAIL", "Request failed - connection error")

    # Test 8: POST /api/profiles/{code} - Create child profile
    test_name = "POST /api/profiles/{code} - Create child profile"
    child_profile = {
        "name": "Marie Dupont",
        "is_child": True,
        "avatar": "child_avatar_1"
    }
    
    response = make_request("POST", f"/profiles/{generated_user_code}", child_profile)
    if response and response.status_code == 200:
        data = response.json()
        if "id" in data and data.get("name") == "Marie Dupont" and data.get("is_child") == True:
            created_profiles.append(data["id"])
            log_test(test_name, "PASS")
        else:
            log_test(test_name, "FAIL", "Invalid profile data structure")
    elif response:
        log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    else:
        log_test(test_name, "FAIL", "Request failed - connection error")

    # Test 9: GET /api/profiles/{code} - List profiles
    test_name = "GET /api/profiles/{code} - List profiles"
    response = make_request("GET", f"/profiles/{generated_user_code}")
    if response and response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and len(data) >= 2:
            log_test(test_name, "PASS")
        else:
            log_test(test_name, "FAIL", f"Expected list with at least 2 profiles, got: {len(data) if isinstance(data, list) else 'not a list'}")
    elif response:
        log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    else:
        log_test(test_name, "FAIL", "Request failed - connection error")

    # Test 10: PUT /api/profiles/{profile_id}/parental-pin - Update PIN
    test_name = "PUT /api/profiles/{profile_id}/parental-pin - Update PIN"
    if created_profiles:
        profile_id = created_profiles[0]
        pin_data = {"pin": "1234"}
        
        response = make_request("PUT", f"/profiles/{profile_id}/parental-pin", pin_data)
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data:
                log_test(test_name, "PASS")
            else:
                log_test(test_name, "FAIL", "Missing message in response")
        elif response:
            log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        else:
            log_test(test_name, "FAIL", "Request failed - connection error")
    else:
        log_test(test_name, "SKIP", "No profiles created in previous tests")

    # Test 11: POST /api/profiles/{profile_id}/verify-pin - Correct PIN
    test_name = "POST /api/profiles/{profile_id}/verify-pin - Correct PIN"
    if created_profiles:
        profile_id = created_profiles[0]
        pin_data = {"pin": "1234"}
        
        response = make_request("POST", f"/profiles/{profile_id}/verify-pin", pin_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("valid") == True:
                log_test(test_name, "PASS")
            else:
                log_test(test_name, "FAIL", "PIN should be valid")
        elif response:
            log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        else:
            log_test(test_name, "FAIL", "Request failed - connection error")
    else:
        log_test(test_name, "SKIP", "No profiles created in previous tests")

    # Test 12: POST /api/profiles/{profile_id}/verify-pin - Incorrect PIN
    test_name = "POST /api/profiles/{profile_id}/verify-pin - Incorrect PIN"
    if created_profiles:
        profile_id = created_profiles[0]
        pin_data = {"pin": "9999"}
        
        response = make_request("POST", f"/profiles/{profile_id}/verify-pin", pin_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("valid") == False:
                log_test(test_name, "PASS")
            else:
                log_test(test_name, "FAIL", "PIN should be invalid")
        elif response:
            log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        else:
            log_test(test_name, "FAIL", "Request failed - connection error")
    else:
        log_test(test_name, "SKIP", "No profiles created in previous tests")

print("\n📺 5. STREAM URL GENERATION")
print("-" * 40)

# Test 13: GET /api/xtream/stream-url/live/123
test_name = "GET /api/xtream/stream-url/live/123 - Live stream URL"
response = make_request("GET", "/xtream/stream-url/live/123")
if response and response.status_code == 200:
    data = response.json()
    if "url" in data and "/live/" in data["url"] and "123.m3u8" in data["url"]:
        log_test(test_name, "PASS")
    else:
        log_test(test_name, "FAIL", f"Invalid URL format: {data.get('url', 'No URL')}")
elif response:
    log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
else:
    log_test(test_name, "FAIL", "Request failed - connection error")

# Test 14: GET /api/xtream/stream-url/movie/456
test_name = "GET /api/xtream/stream-url/movie/456 - Movie stream URL"
response = make_request("GET", "/xtream/stream-url/movie/456")
if response and response.status_code == 200:
    data = response.json()
    if "url" in data and "/movie/" in data["url"] and "456.m3u8" in data["url"]:
        log_test(test_name, "PASS")
    else:
        log_test(test_name, "FAIL", f"Invalid URL format: {data.get('url', 'No URL')}")
elif response:
    log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
else:
    log_test(test_name, "FAIL", "Request failed - connection error")

# Test 15: GET /api/xtream/stream-url/series/789
test_name = "GET /api/xtream/stream-url/series/789 - Series stream URL"
response = make_request("GET", "/xtream/stream-url/series/789")
if response and response.status_code == 200:
    data = response.json()
    if "url" in data and "/series/" in data["url"] and "789.m3u8" in data["url"]:
        log_test(test_name, "PASS")
    else:
        log_test(test_name, "FAIL", f"Invalid URL format: {data.get('url', 'No URL')}")
elif response:
    log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
else:
    log_test(test_name, "FAIL", "Request failed - connection error")

print("\n🚫 6. LIMITES ET VALIDATIONS")
print("-" * 40)

if generated_user_code:
    # Test 16: Create 6 profiles (should fail at 6th - max is 5)
    test_name = "Profile limit validation - Create 6th profile (should fail)"
    
    # First, create 3 more profiles to reach the limit
    for i in range(3, 6):  # We already have 2 profiles
        profile_data = {
            "name": f"Profile {i}",
            "is_child": False
        }
        response = make_request("POST", f"/profiles/{generated_user_code}", profile_data)
        if response and response.status_code == 200:
            data = response.json()
            created_profiles.append(data["id"])
    
    # Now try to create the 6th profile (should fail)
    profile_data = {
        "name": "Profile 6 - Should Fail",
        "is_child": False
    }
    response = make_request("POST", f"/profiles/{generated_user_code}", profile_data)
    if response and response.status_code == 400:
        data = response.json()
        if "Maximum profiles limit reached" in data.get("detail", ""):
            log_test(test_name, "PASS")
        else:
            log_test(test_name, "FAIL", f"Wrong error message: {data.get('detail', 'No detail')}")
    elif response:
        log_test(test_name, "FAIL", f"Expected 400 error, got: {response.status_code}")
    else:
        log_test(test_name, "FAIL", "Request failed - connection error")
else:
    log_test("Profile limit validation", "SKIP", "No valid user code available")

# Test 17: Create profile with invalid code
test_name = "Create profile with invalid code - Should fail"
invalid_code = "INVALID1"
profile_data = {
    "name": "Should Not Work",
    "is_child": False
}
response = make_request("POST", f"/profiles/{invalid_code}", profile_data)
if response and response.status_code == 404:
    log_test(test_name, "PASS")
elif response:
    log_test(test_name, "FAIL", f"Expected 404 for invalid code, got: {response.status_code}")
else:
    log_test(test_name, "FAIL", "Request failed - connection error")

# Test 18: DELETE profile
test_name = "DELETE /api/profiles/{profile_id} - Delete profile"
if created_profiles:
    profile_id = created_profiles[-1]  # Delete the last created profile
    response = make_request("DELETE", f"/profiles/{profile_id}")
    if response and response.status_code == 200:
        data = response.json()
        if "message" in data:
            log_test(test_name, "PASS")
        else:
            log_test(test_name, "FAIL", "Missing message in response")
    elif response:
        log_test(test_name, "FAIL", f"Status: {response.status_code}, Response: {response.text}")
    else:
        log_test(test_name, "FAIL", "Request failed - connection error")
else:
    log_test(test_name, "SKIP", "No profiles created in previous tests")

print("\n⚠️  7. XTREAM PROXY ENDPOINTS (Expected to fail)")
print("-" * 40)

# These are expected to fail due to server blocking
proxy_endpoints = [
    "/xtream/live-categories",
    "/xtream/live-streams", 
    "/xtream/vod-categories",
    "/xtream/vod-streams",
    "/xtream/series-categories",
    "/xtream/series-streams"
]

for endpoint in proxy_endpoints:
    test_name = f"GET {endpoint} - Expected to fail (server blocking)"
    response = make_request("GET", endpoint)
    if response and response.status_code == 500:
        log_test(test_name, "SKIP", "Expected failure due to IPTV server blocking")
    elif response:
        log_test(test_name, "SKIP", f"Got {response.status_code} - Expected failure due to server blocking")
    else:
        log_test(test_name, "SKIP", "Expected failure due to server blocking")

print("\n" + "=" * 60)
print("📊 TEST SUMMARY")
print("=" * 60)

total_tests = len(test_results["passed"]) + len(test_results["failed"]) + len(test_results["skipped"])
print(f"Total Tests: {total_tests}")
print(f"✅ Passed: {len(test_results['passed'])}")
print(f"❌ Failed: {len(test_results['failed'])}")
print(f"⏭️  Skipped: {len(test_results['skipped'])}")

if test_results["failed"]:
    print(f"\n❌ FAILED TESTS:")
    for test in test_results["failed"]:
        print(f"   - {test}")

if test_results["skipped"]:
    print(f"\n⏭️  SKIPPED TESTS:")
    for test in test_results["skipped"]:
        print(f"   - {test}")

print(f"\n✅ SUCCESS RATE: {len(test_results['passed'])}/{total_tests - len(test_results['skipped'])} ({(len(test_results['passed'])/(total_tests - len(test_results['skipped']))*100):.1f}%)")

# Exit with appropriate code
if test_results["failed"]:
    sys.exit(1)
else:
    sys.exit(0)