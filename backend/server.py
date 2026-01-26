from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import httpx
import secrets
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class XtreamConfig(BaseModel):
    username: str
    password: str
    dns_url: str
    samsung_lg_dns: Optional[str] = None

class XtreamConfigResponse(BaseModel):
    id: str
    username: str
    dns_url: str
    samsung_lg_dns: Optional[str] = None
    created_at: datetime

class UserCode(BaseModel):
    code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    max_profiles: int = 5

class UserCodeCreate(BaseModel):
    max_profiles: int = 5

class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_code: str
    name: str
    is_child: bool = False
    avatar: Optional[str] = None
    parental_pin: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProfileCreate(BaseModel):
    name: str
    is_child: bool = False
    avatar: Optional[str] = None

class ParentalPinUpdate(BaseModel):
    pin: str

class ParentalPinVerify(BaseModel):
    pin: str

# ==================== HELPER FUNCTIONS ====================

def generate_user_code(length: int = 8) -> str:
    """Generate a unique user code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

async def get_xtream_config() -> Dict[str, Any]:
    """Get the active Xtream Codes configuration"""
    config = await db.xtream_config.find_one({"is_active": True})
    if not config:
        raise HTTPException(status_code=404, detail="Xtream configuration not found")
    return config

# ==================== ADMIN ROUTES ====================

@api_router.post("/admin/xtream-config")
async def create_xtream_config(config: XtreamConfig):
    """Admin: Configure Xtream Codes credentials"""
    # Deactivate all existing configs
    await db.xtream_config.update_many({}, {"$set": {"is_active": False}})
    
    config_dict = config.dict()
    config_dict["id"] = str(uuid.uuid4())
    config_dict["created_at"] = datetime.utcnow()
    config_dict["is_active"] = True
    
    await db.xtream_config.insert_one(config_dict)
    
    return {
        "message": "Xtream configuration saved successfully",
        "id": config_dict["id"]
    }

@api_router.get("/admin/xtream-config")
async def get_xtream_config_admin():
    """Admin: Get current Xtream configuration"""
    config = await db.xtream_config.find_one({"is_active": True})
    if not config:
        return {"configured": False}
    
    # Don't send password to frontend for security
    return {
        "configured": True,
        "id": config["id"],
        "username": config["username"],
        "dns_url": config["dns_url"],
        "samsung_lg_dns": config.get("samsung_lg_dns"),
        "created_at": config["created_at"]
    }

@api_router.post("/admin/user-codes")
async def create_user_code_admin(input: UserCodeCreate):
    """Admin: Generate a new user code"""
    # Generate unique code
    while True:
        code = generate_user_code()
        existing = await db.user_codes.find_one({"code": code})
        if not existing:
            break
    
    user_code_dict = {
        "code": code,
        "created_at": datetime.utcnow(),
        "is_active": True,
        "max_profiles": input.max_profiles
    }
    
    await db.user_codes.insert_one(user_code_dict)
    
    return {
        "message": "User code generated successfully",
        "code": code,
        "max_profiles": input.max_profiles
    }

@api_router.get("/admin/user-codes")
async def list_user_codes_admin():
    """Admin: List all user codes"""
    codes = await db.user_codes.find().sort("created_at", -1).to_list(1000)
    
    # Add profile count for each code
    for code_doc in codes:
        profile_count = await db.profiles.count_documents({"user_code": code_doc["code"]})
        code_doc["profile_count"] = profile_count
    
    return codes

@api_router.delete("/admin/user-codes/{code}")
async def delete_user_code_admin(code: str):
    """Admin: Deactivate a user code"""
    result = await db.user_codes.update_one(
        {"code": code},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User code not found")
    
    return {"message": "User code deactivated successfully"}

# ==================== USER ROUTES ====================

@api_router.post("/auth/verify-code")
async def verify_user_code(code: str):
    """Verify if a user code is valid"""
    user_code = await db.user_codes.find_one({"code": code, "is_active": True})
    
    if not user_code:
        raise HTTPException(status_code=404, detail="Invalid or inactive user code")
    
    return {
        "valid": True,
        "code": code,
        "max_profiles": user_code["max_profiles"]
    }

@api_router.get("/profiles/{user_code}")
async def get_profiles(user_code: str):
    """Get all profiles for a user code"""
    # Verify user code
    user_code_doc = await db.user_codes.find_one({"code": user_code, "is_active": True})
    if not user_code_doc:
        raise HTTPException(status_code=404, detail="Invalid user code")
    
    profiles = await db.profiles.find({"user_code": user_code}).to_list(100)
    
    # Remove MongoDB's _id field from each profile
    for profile in profiles:
        profile.pop("_id", None)
    
    return profiles

@api_router.post("/profiles/{user_code}")
async def create_profile(user_code: str, profile: ProfileCreate):
    """Create a new profile for a user"""
    # Verify user code
    user_code_doc = await db.user_codes.find_one({"code": user_code, "is_active": True})
    if not user_code_doc:
        raise HTTPException(status_code=404, detail="Invalid user code")
    
    # Check max profiles limit
    existing_count = await db.profiles.count_documents({"user_code": user_code})
    if existing_count >= user_code_doc["max_profiles"]:
        raise HTTPException(status_code=400, detail="Maximum profiles limit reached")
    
    profile_dict = profile.dict()
    profile_dict["id"] = str(uuid.uuid4())
    profile_dict["user_code"] = user_code
    profile_dict["created_at"] = datetime.utcnow()
    profile_dict["parental_pin"] = "0000"  # Default PIN
    
    result = await db.profiles.insert_one(profile_dict)
    
    # Remove MongoDB's _id field before returning
    profile_dict.pop("_id", None)
    
    return profile_dict

@api_router.put("/profiles/{profile_id}/parental-pin")
async def update_parental_pin(profile_id: str, pin_data: ParentalPinUpdate):
    """Update parental control PIN for a profile"""
    result = await db.profiles.update_one(
        {"id": profile_id},
        {"$set": {"parental_pin": pin_data.pin}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"message": "Parental PIN updated successfully"}

@api_router.post("/profiles/{profile_id}/verify-pin")
async def verify_parental_pin(profile_id: str, pin_data: ParentalPinVerify):
    """Verify parental control PIN"""
    profile = await db.profiles.find_one({"id": profile_id})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if profile.get("parental_pin") == pin_data.pin:
        return {"valid": True}
    else:
        return {"valid": False}

@api_router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str):
    """Delete a profile"""
    result = await db.profiles.delete_one({"id": profile_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"message": "Profile deleted successfully"}

# ==================== XTREAM CODES PROXY ROUTES ====================

@api_router.get("/xtream/info")
async def get_xtream_info():
    """Get Xtream Codes account info"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"]
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching Xtream info: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/live-categories")
async def get_live_categories():
    """Get live TV categories"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"],
        "action": "get_live_categories"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching live categories: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/live-streams")
async def get_live_streams(category_id: Optional[str] = None):
    """Get live TV streams"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"],
        "action": "get_live_streams"
    }
    
    if category_id:
        params["category_id"] = category_id
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching live streams: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/vod-categories")
async def get_vod_categories():
    """Get VOD (movies) categories"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"],
        "action": "get_vod_categories"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching VOD categories: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/vod-streams")
async def get_vod_streams(category_id: Optional[str] = None):
    """Get VOD streams (movies)"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"],
        "action": "get_vod_streams"
    }
    
    if category_id:
        params["category_id"] = category_id
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching VOD streams: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/series-categories")
async def get_series_categories():
    """Get series categories"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"],
        "action": "get_series_categories"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching series categories: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/series-streams")
async def get_series_streams(category_id: Optional[str] = None):
    """Get series streams"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"],
        "action": "get_series"
    }
    
    if category_id:
        params["category_id"] = category_id
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching series: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/series-info/{series_id}")
async def get_series_info(series_id: str):
    """Get detailed series information"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"],
        "action": "get_series_info",
        "series_id": series_id
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching series info: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/vod-info/{vod_id}")
async def get_vod_info(vod_id: str):
    """Get detailed VOD information"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"],
        "action": "get_vod_info",
        "vod_id": vod_id
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching VOD info: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/epg/{stream_id}")
async def get_epg(stream_id: str):
    """Get EPG data for a stream"""
    config = await get_xtream_config()
    
    url = f"{config['dns_url']}/player_api.php"
    params = {
        "username": config["username"],
        "password": config["password"],
        "action": "get_short_epg",
        "stream_id": stream_id
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching EPG: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

# ==================== STREAM URL GENERATION ====================

@api_router.get("/xtream/stream-url/{stream_type}/{stream_id}")
async def get_stream_url(stream_type: str, stream_id: str, extension: str = "m3u8"):
    """Generate stream URL for playback"""
    config = await get_xtream_config()
    
    if stream_type == "live":
        url = f"{config['dns_url']}/live/{config['username']}/{config['password']}/{stream_id}.{extension}"
    elif stream_type == "movie":
        url = f"{config['dns_url']}/movie/{config['username']}/{config['password']}/{stream_id}.{extension}"
    elif stream_type == "series":
        url = f"{config['dns_url']}/series/{config['username']}/{config['password']}/{stream_id}.{extension}"
    else:
        raise HTTPException(status_code=400, detail="Invalid stream type")
    
    return {"url": url}

# ==================== MAIN APP CONFIGURATION ====================

@api_router.get("/")
async def root():
    return {
        "message": "IPTV Player API",
        "version": "1.0.0"
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
