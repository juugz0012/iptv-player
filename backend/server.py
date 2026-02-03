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
    user_note: Optional[str] = None
    dns_url: str
    xtream_username: str
    xtream_password: str

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

class WatchlistItem(BaseModel):
    user_code: str
    profile_name: str
    stream_id: str
    stream_type: str  # 'movie' or 'series'
    movie_data: Dict[str, Any]
    added_at: datetime = Field(default_factory=datetime.utcnow)

class WatchlistAdd(BaseModel):
    user_code: str
    profile_name: str
    stream_id: str
    stream_type: str
    movie_data: Dict[str, Any]

class WatchProgress(BaseModel):
    user_code: str
    profile_name: str
    stream_id: str
    stream_type: str
    current_time: float
    duration: float
    percentage: float
    last_watched: datetime = Field(default_factory=datetime.utcnow)

class WatchProgressUpdate(BaseModel):
    user_code: str
    profile_name: str
    stream_id: str
    stream_type: str
    current_time: float
    duration: float

# ==================== HELPER FUNCTIONS ====================

def generate_user_code(length: int = 8) -> str:
    """Generate a unique user code with only digits"""
    characters = string.digits
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
    
    # Return password as app needs it for direct API calls
    return {
        "configured": True,
        "id": config["id"],
        "username": config["username"],
        "password": config["password"],
        "dns_url": config["dns_url"],
        "samsung_lg_dns": config.get("samsung_lg_dns"),
        "created_at": config["created_at"]
    }

@api_router.post("/admin/create-user-with-xtream")
async def create_user_with_xtream(config: XtreamConfig, max_profiles: int = 5):
    """Admin: Verify Xtream config, save it, and create user code in one step"""
    
    # Step 1: Test the Xtream connection
    url = f"{config.dns_url}/player_api.php"
    params = {
        "username": config.username,
        "password": config.password
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            account_info = response.json()
            
            # Extract user info
            user_info = account_info.get("user_info", {})
            expiration_timestamp = user_info.get("exp_date")
            
            if not user_info:
                raise HTTPException(
                    status_code=400, 
                    detail="Impossible de récupérer les informations du compte. Vérifiez vos identifiants."
                )
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Erreur HTTP {e.response.status_code}: Identifiants invalides ou DNS incorrect"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=400,
            detail="Timeout: Le serveur IPTV ne répond pas. Vérifiez le DNS."
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Erreur de connexion: {str(e)}"
        )
    
    # Step 2: Save the Xtream config
    # Deactivate all existing configs
    await db.xtream_config.update_many({}, {"$set": {"is_active": False}})
    
    config_dict = config.dict()
    config_dict["id"] = str(uuid.uuid4())
    config_dict["created_at"] = datetime.utcnow()
    config_dict["is_active"] = True
    config_dict["expiration_date"] = expiration_timestamp
    
    await db.xtream_config.insert_one(config_dict)
    
    # Step 3: Generate unique user code
    while True:
        code = generate_user_code()
        existing = await db.user_codes.find_one({"code": code})
        if not existing:
            break
    
    user_code_dict = {
        "code": code,
        "created_at": datetime.utcnow(),
        "is_active": True,
        "max_profiles": max_profiles,
        "xtream_config_id": config_dict["id"]
    }
    
    await db.user_codes.insert_one(user_code_dict)
    
    # Format expiration date for display
    expiration_date_str = None
    if expiration_timestamp:
        try:
            exp_date = datetime.fromtimestamp(int(expiration_timestamp))
            expiration_date_str = exp_date.strftime("%d/%m/%Y %H:%M")
        except:
            expiration_date_str = "Inconnue"
    
    return {
        "success": True,
        "code": code,
        "max_profiles": max_profiles,
        "xtream_info": {
            "username": user_info.get("username"),
            "status": user_info.get("status"),
            "expiration_date": expiration_date_str,
            "expiration_timestamp": expiration_timestamp,
            "max_connections": user_info.get("max_connections"),
            "active_connections": user_info.get("active_cons")
        }
    }

@api_router.post("/admin/verify-xtream")
async def verify_xtream_connection(input: UserCodeCreate):
    """Admin: Verify Xtream connection and return account info"""
    try:
        verify_url = f"{input.dns_url.strip()}/player_api.php"
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                verify_url,
                params={
                    "username": input.xtream_username.strip(),
                    "password": input.xtream_password.strip()
                },
                headers={
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Erreur HTTP {response.status_code}: Identifiants invalides ou DNS incorrect")
            
            data = response.json()
            user_info = data.get("user_info")
            
            if not user_info:
                raise HTTPException(status_code=400, detail="Impossible de récupérer les informations du compte")
            
            # Format expiration date
            exp_timestamp = user_info.get("exp_date")
            exp_date_str = "Inconnue"
            if exp_timestamp:
                try:
                    exp_date = datetime.fromtimestamp(int(exp_timestamp))
                    exp_date_str = exp_date.strftime("%d/%m/%Y %H:%M")
                except:
                    pass
            
            return {
                "success": True,
                "user_info": {
                    "username": user_info.get("username"),
                    "status": user_info.get("status"),
                    "expiration_date": exp_date_str,
                    "max_connections": user_info.get("max_connections"),
                    "active_connections": user_info.get("active_cons")
                }
            }
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Timeout: Le serveur IPTV ne répond pas. Vérifiez le DNS.")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Erreur de connexion: {str(e)}")
    except Exception as e:
        logger.error(f"Error verifying Xtream: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la vérification: {str(e)}")

@api_router.post("/admin/user-codes")
async def create_user_code_admin(input: UserCodeCreate):
    """Admin: Generate a new user code with Xtream credentials (without verification)"""
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
        "max_profiles": input.max_profiles,
        "user_note": input.user_note or "",
        "dns_url": input.dns_url,
        "xtream_username": input.xtream_username,
        "xtream_password": input.xtream_password
    }
    
    await db.user_codes.insert_one(user_code_dict)
    
    return {
        "message": "User code generated successfully",
        "code": code,
        "max_profiles": input.max_profiles
    }

@api_router.get("/admin/user-codes")
async def get_all_user_codes():
    """Admin: Get all user codes"""
    codes = await db.user_codes.find().sort("created_at", -1).to_list(length=1000)
    
    # Convert ObjectId to string for JSON serialization
    for code in codes:
        if '_id' in code:
            code['_id'] = str(code['_id'])
        # Format created_at
        if 'created_at' in code and code['created_at']:
            code['created_at'] = code['created_at'].isoformat()
    
    return codes

@api_router.put("/admin/user-codes/{code}")
async def update_user_code(code: str, input: UserCodeCreate):
    """Admin: Update user code details including Xtream credentials"""
    result = await db.user_codes.update_one(
        {"code": code},
        {"$set": {
            "max_profiles": input.max_profiles,
            "user_note": input.user_note or "",
            "dns_url": input.dns_url,
            "xtream_username": input.xtream_username,
            "xtream_password": input.xtream_password
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User code not found")
    
    return {"message": "User code updated successfully"}

@api_router.delete("/admin/user-codes/{code}")
async def delete_user_code(code: str):
    """Admin: Delete a user code"""
    result = await db.user_codes.delete_one({"code": code})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User code not found")
    
    return {"message": "User code deleted successfully"}

class BulkDNSUpdate(BaseModel):
    user_codes: list[str]
    new_dns_url: str

@api_router.post("/admin/bulk-update-dns")
async def bulk_update_dns(input: BulkDNSUpdate):
    """Admin: Update DNS for multiple users at once"""
    if not input.user_codes or len(input.user_codes) == 0:
        raise HTTPException(status_code=400, detail="No user codes provided")
    
    result = await db.user_codes.update_many(
        {"code": {"$in": input.user_codes}},
        {"$set": {"dns_url": input.new_dns_url}}
    )
    
    return {
        "message": f"DNS updated for {result.modified_count} user(s)",
        "modified_count": result.modified_count
    }

@api_router.get("/admin/user-codes")
async def list_user_codes_admin():
    """Admin: List all user codes"""
    codes = await db.user_codes.find().sort("created_at", -1).to_list(1000)
    
    # Add profile count for each code and remove _id
    for code_doc in codes:
        code_doc.pop("_id", None)
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

# ==================== WATCHLIST ROUTES ====================

@api_router.post("/watchlist/add")
async def add_to_watchlist(item: WatchlistAdd):
    """Add a movie/series to user's watchlist"""
    # Check if already in watchlist
    existing = await db.watchlist.find_one({
        "user_code": item.user_code,
        "profile_name": item.profile_name,
        "stream_id": item.stream_id
    })
    
    if existing:
        return {"message": "Already in watchlist", "already_exists": True}
    
    item_dict = item.dict()
    item_dict["added_at"] = datetime.utcnow()
    
    await db.watchlist.insert_one(item_dict)
    
    return {"message": "Added to watchlist successfully", "already_exists": False}

@api_router.delete("/watchlist/remove")
async def remove_from_watchlist(user_code: str, profile_name: str, stream_id: str):
    """Remove a movie/series from user's watchlist"""
    result = await db.watchlist.delete_one({
        "user_code": user_code,
        "profile_name": profile_name,
        "stream_id": stream_id
    })
    
    if result.deleted_count == 0:
        return {"message": "Item not found in watchlist", "success": False}
    
    return {"message": "Removed from watchlist successfully", "success": True}

@api_router.get("/watchlist/{user_code}/{profile_name}")
async def get_watchlist(user_code: str, profile_name: str):
    """Get user's watchlist"""
    items = await db.watchlist.find({
        "user_code": user_code,
        "profile_name": profile_name
    }).sort("added_at", -1).to_list(1000)
    
    # Remove MongoDB's _id field
    for item in items:
        item.pop("_id", None)
    
    return items

@api_router.get("/watchlist/check/{user_code}/{profile_name}/{stream_id}")
async def check_watchlist(user_code: str, profile_name: str, stream_id: str):
    """Check if item is in watchlist"""
    exists = await db.watchlist.find_one({
        "user_code": user_code,
        "profile_name": profile_name,
        "stream_id": stream_id
    })
    
    return {"in_watchlist": exists is not None}

# ==================== WATCH PROGRESS ROUTES ====================

@api_router.post("/progress/update")
async def update_watch_progress(progress: WatchProgressUpdate):
    """Update watch progress for a movie/series"""
    percentage = (progress.current_time / progress.duration * 100) if progress.duration > 0 else 0
    
    # Update or insert progress
    await db.watch_progress.update_one(
        {
            "user_code": progress.user_code,
            "profile_name": progress.profile_name,
            "stream_id": progress.stream_id
        },
        {
            "$set": {
                "stream_type": progress.stream_type,
                "current_time": progress.current_time,
                "duration": progress.duration,
                "percentage": percentage,
                "last_watched": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"message": "Progress updated successfully", "percentage": percentage}

@api_router.get("/progress/{user_code}/{profile_name}/{stream_id}")
async def get_watch_progress(user_code: str, profile_name: str, stream_id: str):
    """Get watch progress for a specific movie/series"""
    progress = await db.watch_progress.find_one({
        "user_code": user_code,
        "profile_name": profile_name,
        "stream_id": stream_id
    })
    
    if not progress:
        return {"has_progress": False}
    
    progress.pop("_id", None)
    progress["has_progress"] = True
    
    return progress

@api_router.get("/progress/{user_code}/{profile_name}")
async def get_all_watch_progress(user_code: str, profile_name: str):
    """Get all watch progress for a user"""
    progress_list = await db.watch_progress.find({
        "user_code": user_code,
        "profile_name": profile_name
    }).sort("last_watched", -1).to_list(1000)
    
    # Remove MongoDB's _id field
    for progress in progress_list:
        progress.pop("_id", None)
    
    return progress_list

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
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
    }
    
    async with httpx.AsyncClient(timeout=30.0, headers=headers, follow_redirects=True) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching live categories: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error connecting to IPTV service: {str(e)}")

@api_router.get("/xtream/live-streams")
async def get_live_streams(category_id: Optional[str] = None):
    """Get live TV streams from M3U playlist with Cloudflare bypass"""
    config = await get_xtream_config()
    
    try:
        import cloudscraper
        
        # Use M3U endpoint with cloudscraper to bypass Cloudflare
        url = f"{config['dns_url']}/get.php"
        params = {
            "username": config["username"],
            "password": config["password"],
            "type": "m3u_plus",
            "output": "mpegts"
        }
        
        scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'mobile': False
            }
        )
        
        response = scraper.get(url, params=params, timeout=60)
        response.raise_for_status()
        
        # Parse M3U playlist
        m3u_content = response.text
        channels = []
        current_channel = None
        
        for line in m3u_content.split('\n'):
            line = line.strip()
            
            if line.startswith('#EXTINF:'):
                current_channel = {}
                
                import re
                tvg_id_match = re.search(r'tvg-id="([^"]*)"', line)
                tvg_name_match = re.search(r'tvg-name="([^"]*)"', line)
                tvg_logo_match = re.search(r'tvg-logo="([^"]*)"', line)
                group_title_match = re.search(r'group-title="([^"]*)"', line)
                
                if tvg_id_match:
                    current_channel['stream_id'] = tvg_id_match.group(1)
                if tvg_name_match:
                    current_channel['name'] = tvg_name_match.group(1)
                if tvg_logo_match:
                    current_channel['stream_icon'] = tvg_logo_match.group(1)
                if group_title_match:
                    current_channel['category_id'] = group_title_match.group(1)
                
                if 'name' not in current_channel:
                    name_match = re.search(r',(.+)$', line)
                    if name_match:
                        current_channel['name'] = name_match.group(1).strip()
            
            elif line and not line.startswith('#') and current_channel:
                current_channel['stream_url'] = line
                
                if 'stream_id' not in current_channel:
                    import re
                    id_match = re.search(r'/(\d+)\.', line)
                    if id_match:
                        current_channel['stream_id'] = int(id_match.group(1))
                
                if 'stream_id' not in current_channel:
                    current_channel['stream_id'] = len(channels) + 1
                if 'category_id' not in current_channel:
                    current_channel['category_id'] = ''
                
                channels.append(current_channel)
                current_channel = None
        
        logger.info(f"Successfully parsed {len(channels)} channels from M3U")
        
        # Filter by category if specified
        if category_id:
            channels = [ch for ch in channels if ch.get('category_id') == category_id]
        
        return channels
        
    except Exception as e:
        logger.error(f"Error fetching live streams from M3U: {str(e)}")
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
