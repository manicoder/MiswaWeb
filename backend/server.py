from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Union
import uuid
from datetime import datetime, timezone, timedelta
import aiohttp
from bs4 import BeautifulSoup
import io
import csv
import shutil
from jose import JWTError, jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory for CV files
UPLOADS_DIR = ROOT_DIR / "uploads" / "cv"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Create uploads directory for UPI payment images (logo and QR code)
UPI_UPLOADS_DIR = ROOT_DIR / "uploads" / "upi"
UPI_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'miswa')
logger.info(f"Connecting to MongoDB: {mongo_url.replace(mongo_url.split('@')[-1] if '@' in mongo_url else mongo_url, '***') if '@' in mongo_url else mongo_url} | Database: {db_name}")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing - using bcrypt directly

# HTTP Bearer for token authentication
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class Brand(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    tagline: str
    description: str
    website: str
    logo_url: str
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BrandCreate(BaseModel):
    name: str
    tagline: str
    description: str
    website: str
    logo_url: str
    image_url: Optional[str] = None

class Catalog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str
    pdf_url: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CatalogCreate(BaseModel):
    title: str
    description: str
    category: str
    pdf_url: Optional[str] = None
    image_url: Optional[str] = None

class Blog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    excerpt: str
    content: str
    image_url: Optional[str] = None
    author: str = "Miswa International"
    published: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogCreate(BaseModel):
    title: str
    slug: str
    excerpt: str
    content: str
    image_url: Optional[str] = None
    author: Optional[str] = "Miswa International"
    published: Optional[bool] = True

class Career(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    department: str
    location: str
    type: str  # Full-time, Part-time, Contract
    description: str
    requirements: str
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CareerCreate(BaseModel):
    title: str
    department: str
    location: str
    type: str
    description: str
    requirements: Union[str, List[str]]  # Accept both string and array
    active: Optional[bool] = True

class Inquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    message: str
    inquiry_type: str = "general"  # general, wholesale, career
    cv_filename: Optional[str] = None  # Path to uploaded CV file
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    message: str
    inquiry_type: Optional[str] = "general"

class CompanyInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "company_info"
    about: str
    mission: str
    vision: str
    phone: str
    email: str
    address: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyInfoUpdate(BaseModel):
    about: Optional[str] = None
    mission: Optional[str] = None
    vision: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class QRCode(BaseModel):
    title: str
    url: str

class LinkPage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_slug: str  # mylittletales or tyneetots
    brand_name: str
    tagline: str
    description: str
    logo_url: str
    website_url: Optional[str] = None
    website_text: Optional[str] = "Visit"
    instagram_url: Optional[str] = None
    instagram_text: Optional[str] = "Visit"
    facebook_url: Optional[str] = None
    facebook_text: Optional[str] = "Visit"
    whatsapp_url: Optional[str] = None
    whatsapp_text: Optional[str] = "Visit"
    google_review_url: Optional[str] = None
    google_review_text: Optional[str] = "Visit"
    qr_codes: List[QRCode] = Field(default_factory=list)
    gradient_from: str = "from-coral-400"
    gradient_to: str = "to-orange-500"
    bg_gradient_from: str = "from-orange-50"
    bg_gradient_via: str = "via-white"
    bg_gradient_to: str = "to-orange-50/30"
    background_image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LinkPageCreate(BaseModel):
    brand_slug: str
    brand_name: str
    tagline: str
    description: str
    logo_url: str
    website_url: Optional[str] = None
    website_text: Optional[str] = "Visit"
    instagram_url: Optional[str] = None
    instagram_text: Optional[str] = "Visit"
    facebook_url: Optional[str] = None
    facebook_text: Optional[str] = "Visit"
    whatsapp_url: Optional[str] = None
    whatsapp_text: Optional[str] = "Visit"
    google_review_url: Optional[str] = None
    google_review_text: Optional[str] = "Visit"
    qr_codes: Optional[List[QRCode]] = None
    gradient_from: Optional[str] = "from-coral-400"
    gradient_to: Optional[str] = "to-orange-500"
    bg_gradient_from: Optional[str] = "from-orange-50"
    bg_gradient_via: Optional[str] = "via-white"
    bg_gradient_to: Optional[str] = "to-orange-50/30"
    background_image_url: Optional[str] = None

class LinkPageUpdate(BaseModel):
    brand_name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    website_text: Optional[str] = None
    instagram_url: Optional[str] = None
    instagram_text: Optional[str] = None
    facebook_url: Optional[str] = None
    facebook_text: Optional[str] = None
    whatsapp_url: Optional[str] = None
    whatsapp_text: Optional[str] = None
    google_review_url: Optional[str] = None
    google_review_text: Optional[str] = None
    qr_codes: Optional[List[QRCode]] = None
    gradient_from: Optional[str] = None
    gradient_to: Optional[str] = None
    bg_gradient_from: Optional[str] = None
    bg_gradient_via: Optional[str] = None
    bg_gradient_to: Optional[str] = None
    background_image_url: Optional[str] = None

class UPIPaymentInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "upi_payment_info"
    company_name: str
    brand_name: str
    gst_number: str
    upi_id: str
    qr_code_url: str
    logo_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UPIPaymentInfoUpdate(BaseModel):
    company_name: Optional[str] = None
    brand_name: Optional[str] = None
    gst_number: Optional[str] = None
    upi_id: Optional[str] = None
    qr_code_url: Optional[str] = None
    logo_url: Optional[str] = None

class SocialMediaLink(BaseModel):
    icon: str  # Name of lucide-react icon (e.g., "Facebook", "Instagram", "Twitter")
    title: str
    url: str

class SocialMediaInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "social_media_info"
    links: List[SocialMediaLink] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SocialMediaInfoUpdate(BaseModel):
    links: Optional[List[SocialMediaLink]] = None

# ==================== AUTHENTICATION MODELS ====================

class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# ==================== AUTHENTICATION UTILITIES ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash"""
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    try:
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    if isinstance(password, str):
        password = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Verify admin user still exists
    admin = await db.admin_users.find_one({"username": username}, {"_id": 0})
    if admin is None:
        raise credentials_exception
    
    return admin

# ==================== AUTHENTICATION ROUTES ====================

@api_router.post("/admin/login", response_model=Token)
async def admin_login(login_data: AdminLogin):
    admin = await db.admin_users.find_one({"username": login_data.username}, {"_id": 0})
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not verify_password(login_data.password, admin.get("password_hash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": login_data.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/admin/me")
async def get_current_admin_info(current_admin: dict = Depends(get_current_admin)):
    return {
        "username": current_admin.get("username"),
        "id": current_admin.get("id")
    }

# ==================== BRANDS ====================

@api_router.get("/brands", response_model=List[Brand])
async def get_brands():
    brands = await db.brands.find({}, {"_id": 0}).to_list(100)
    for brand in brands:
        if isinstance(brand.get('created_at'), str):
            brand['created_at'] = datetime.fromisoformat(brand['created_at'])
    return brands

@api_router.post("/brands", response_model=Brand)
async def create_brand(input: BrandCreate, current_admin: dict = Depends(get_current_admin)):
    brand = Brand(**input.model_dump())
    doc = brand.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.brands.insert_one(doc)
    return brand

@api_router.put("/brands/{brand_id}", response_model=Brand)
async def update_brand(brand_id: str, input: BrandCreate, current_admin: dict = Depends(get_current_admin)):
    brand_dict = input.model_dump()
    brand_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.brands.update_one({"id": brand_id}, {"$set": brand_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    updated = await db.brands.find_one({"id": brand_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Brand(**updated)

@api_router.delete("/brands/{brand_id}")
async def delete_brand(brand_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.brands.delete_one({"id": brand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    return {"message": "Brand deleted successfully"}

# ==================== CATALOGS ====================

@api_router.get("/catalogs", response_model=List[Catalog])
async def get_catalogs():
    catalogs = await db.catalogs.find({}, {"_id": 0}).to_list(100)
    for catalog in catalogs:
        if isinstance(catalog.get('created_at'), str):
            catalog['created_at'] = datetime.fromisoformat(catalog['created_at'])
    return catalogs

@api_router.post("/catalogs", response_model=Catalog)
async def create_catalog(input: CatalogCreate, current_admin: dict = Depends(get_current_admin)):
    catalog = Catalog(**input.model_dump())
    doc = catalog.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.catalogs.insert_one(doc)
    return catalog

@api_router.put("/catalogs/{catalog_id}", response_model=Catalog)
async def update_catalog(catalog_id: str, input: CatalogCreate, current_admin: dict = Depends(get_current_admin)):
    catalog_dict = input.model_dump()
    result = await db.catalogs.update_one({"id": catalog_id}, {"$set": catalog_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Catalog not found")
    updated = await db.catalogs.find_one({"id": catalog_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Catalog(**updated)

@api_router.delete("/catalogs/{catalog_id}")
async def delete_catalog(catalog_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.catalogs.delete_one({"id": catalog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catalog not found")
    return {"message": "Catalog deleted successfully"}

# ==================== BLOGS ====================

@api_router.get("/blogs", response_model=List[Blog])
async def get_blogs(published_only: bool = False):
    query = {"published": True} if published_only else {}
    blogs = await db.blogs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for blog in blogs:
        if isinstance(blog.get('created_at'), str):
            blog['created_at'] = datetime.fromisoformat(blog['created_at'])
        if isinstance(blog.get('updated_at'), str):
            blog['updated_at'] = datetime.fromisoformat(blog['updated_at'])
    return blogs

@api_router.get("/blogs/{slug}", response_model=Blog)
async def get_blog_by_slug(slug: str):
    blog = await db.blogs.find_one({"slug": slug}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if isinstance(blog.get('created_at'), str):
        blog['created_at'] = datetime.fromisoformat(blog['created_at'])
    if isinstance(blog.get('updated_at'), str):
        blog['updated_at'] = datetime.fromisoformat(blog['updated_at'])
    return Blog(**blog)

@api_router.post("/blogs", response_model=Blog)
async def create_blog(input: BlogCreate, current_admin: dict = Depends(get_current_admin)):
    blog = Blog(**input.model_dump())
    doc = blog.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.blogs.insert_one(doc)
    return blog

@api_router.put("/blogs/{blog_id}", response_model=Blog)
async def update_blog(blog_id: str, input: BlogCreate, current_admin: dict = Depends(get_current_admin)):
    blog_dict = input.model_dump()
    blog_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.blogs.update_one({"id": blog_id}, {"$set": blog_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    updated = await db.blogs.find_one({"id": blog_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return Blog(**updated)

@api_router.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.blogs.delete_one({"id": blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"message": "Blog deleted successfully"}

# ==================== CAREERS ====================

@api_router.get("/careers", response_model=List[Career])
async def get_careers(active_only: bool = False):
    query = {"active": True} if active_only else {}
    careers = await db.careers.find(query, {"_id": 0}).to_list(100)
    for career in careers:
        if isinstance(career.get('created_at'), str):
            career['created_at'] = datetime.fromisoformat(career['created_at'])
    return careers

@api_router.post("/careers", response_model=Career)
async def create_career(input: CareerCreate, current_admin: dict = Depends(get_current_admin)):
    career_dict = input.model_dump()
    # Convert requirements array to string if needed
    if isinstance(career_dict.get('requirements'), list):
        career_dict['requirements'] = '\n'.join(career_dict['requirements'])
    career = Career(**career_dict)
    doc = career.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.careers.insert_one(doc)
    return career

@api_router.put("/careers/{career_id}", response_model=Career)
async def update_career(career_id: str, input: CareerCreate, current_admin: dict = Depends(get_current_admin)):
    career_dict = input.model_dump()
    # Convert requirements array to string if needed
    if isinstance(career_dict.get('requirements'), list):
        career_dict['requirements'] = '\n'.join(career_dict['requirements'])
    result = await db.careers.update_one({"id": career_id}, {"$set": career_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Career not found")
    updated = await db.careers.find_one({"id": career_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Career(**updated)

@api_router.delete("/careers/{career_id}")
async def delete_career(career_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.careers.delete_one({"id": career_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Career not found")
    return {"message": "Career deleted successfully"}

# ==================== INQUIRIES ====================

@api_router.post("/inquiries", response_model=Inquiry)
async def create_inquiry(
    name: str = Form(...),
    email: EmailStr = Form(...),
    phone: Optional[str] = Form(None),
    company: Optional[str] = Form(None),
    message: str = Form(...),
    inquiry_type: str = Form("general"),
    cv_file: Optional[UploadFile] = File(None)
):
    """Create an inquiry with optional CV file upload"""
    cv_filename = None
    
    # Handle CV file upload if provided
    if cv_file and cv_file.filename:
        # Validate file extension
        file_ext = Path(cv_file.filename).suffix.lower()
        allowed_extensions = ['.pdf', '.doc', '.docx']
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        cv_filename = f"{file_id}{file_ext}"
        file_path = UPLOADS_DIR / cv_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(cv_file.file, buffer)
        
        logger.info(f"CV file saved: {cv_filename}")
    
    # Create inquiry
    inquiry_data = {
        "name": name,
        "email": email,
        "phone": phone,
        "company": company,
        "message": message,
        "inquiry_type": inquiry_type,
        "cv_filename": cv_filename
    }
    inquiry = Inquiry(**inquiry_data)
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.inquiries.insert_one(doc)
    return inquiry

@api_router.get("/inquiries", response_model=List[Inquiry])
async def get_inquiries(current_admin: dict = Depends(get_current_admin)):
    inquiries = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for inquiry in inquiries:
        if isinstance(inquiry.get('created_at'), str):
            inquiry['created_at'] = datetime.fromisoformat(inquiry['created_at'])
    return inquiries

@api_router.get("/inquiries/export")
async def export_inquiries_csv(current_admin: dict = Depends(get_current_admin)):
    inquiries = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=['id', 'name', 'email', 'phone', 'company', 'message', 'inquiry_type', 'created_at'])
    writer.writeheader()
    
    for inquiry in inquiries:
        writer.writerow({
            'id': inquiry.get('id', ''),
            'name': inquiry.get('name', ''),
            'email': inquiry.get('email', ''),
            'phone': inquiry.get('phone', ''),
            'company': inquiry.get('company', ''),
            'message': inquiry.get('message', ''),
            'inquiry_type': inquiry.get('inquiry_type', ''),
            'created_at': inquiry.get('created_at', '')
        })
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inquiries.csv"}
    )

@api_router.delete("/inquiries/{inquiry_id}")
async def delete_inquiry(inquiry_id: str, current_admin: dict = Depends(get_current_admin)):
    # Get inquiry to check for CV file
    inquiry = await db.inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    # Delete CV file if exists
    if inquiry.get('cv_filename'):
        cv_file_path = UPLOADS_DIR / inquiry['cv_filename']
        if cv_file_path.exists():
            cv_file_path.unlink()
            logger.info(f"Deleted CV file: {inquiry['cv_filename']}")
    
    result = await db.inquiries.delete_one({"id": inquiry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return {"message": "Inquiry deleted successfully"}

@api_router.get("/inquiries/{inquiry_id}/cv")
async def download_cv(inquiry_id: str, current_admin: dict = Depends(get_current_admin)):
    """Download CV file for a specific inquiry"""
    inquiry = await db.inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    cv_filename = inquiry.get('cv_filename')
    if not cv_filename:
        raise HTTPException(status_code=404, detail="CV file not found for this inquiry")
    
    file_path = UPLOADS_DIR / cv_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="CV file not found on server")
    
    # Determine media type based on file extension
    file_ext = Path(cv_filename).suffix.lower()
    media_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    media_type = media_types.get(file_ext, 'application/octet-stream')
    
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=cv_filename,
        headers={"Content-Disposition": f"attachment; filename={cv_filename}"}
    )

# ==================== COMPANY INFO ====================

@api_router.get("/company-info", response_model=CompanyInfo)
async def get_company_info():
    info = await db.company_info.find_one({"id": "company_info"}, {"_id": 0})
    if not info:
        # Return default
        default_info = CompanyInfo(
            about="Miswa International is a leading manufacturer and exporter of premium kids' products, specializing in educational toys and children's wear.",
            mission="To create high-quality, safe, and engaging products that nurture children's growth and development while bringing joy to families worldwide.",
            vision="To become the most trusted global brand in children's products, known for innovation, quality, and commitment to child development.",
            phone="+1-800-MISWA-INT",
            email="info@miswainternational.com",
            address="123 Manufacturing District, Industrial Park, New Delhi, India"
        )
        return default_info
    if isinstance(info.get('updated_at'), str):
        info['updated_at'] = datetime.fromisoformat(info['updated_at'])
    return CompanyInfo(**info)

@api_router.put("/company-info", response_model=CompanyInfo)
async def update_company_info(input: CompanyInfoUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.company_info.update_one(
        {"id": "company_info"},
        {"$set": update_data},
        upsert=True
    )
    
    info = await db.company_info.find_one({"id": "company_info"}, {"_id": 0})
    if isinstance(info.get('updated_at'), str):
        info['updated_at'] = datetime.fromisoformat(info['updated_at'])
    return CompanyInfo(**info)

# ==================== LINK PAGES ====================

@api_router.get("/link-pages", response_model=List[LinkPage])
async def get_link_pages():
    link_pages = await db.link_pages.find({}, {"_id": 0}).to_list(100)
    for page in link_pages:
        if isinstance(page.get('created_at'), str):
            page['created_at'] = datetime.fromisoformat(page['created_at'])
        if isinstance(page.get('updated_at'), str):
            page['updated_at'] = datetime.fromisoformat(page['updated_at'])
    return link_pages

@api_router.get("/link-pages/{brand_slug}", response_model=LinkPage)
async def get_link_page_by_slug(brand_slug: str):
    link_page = await db.link_pages.find_one({"brand_slug": brand_slug}, {"_id": 0})
    if not link_page:
        raise HTTPException(status_code=404, detail="Link page not found")
    if isinstance(link_page.get('created_at'), str):
        link_page['created_at'] = datetime.fromisoformat(link_page['created_at'])
    if isinstance(link_page.get('updated_at'), str):
        link_page['updated_at'] = datetime.fromisoformat(link_page['updated_at'])
    return LinkPage(**link_page)

@api_router.post("/link-pages", response_model=LinkPage)
async def create_link_page(input: LinkPageCreate, current_admin: dict = Depends(get_current_admin)):
    link_page = LinkPage(**input.model_dump())
    doc = link_page.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.link_pages.insert_one(doc)
    return link_page

@api_router.put("/link-pages/{brand_slug}", response_model=LinkPage)
async def update_link_page(brand_slug: str, input: LinkPageUpdate, current_admin: dict = Depends(get_current_admin)):
    update_dict = {k: v for k, v in input.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.link_pages.update_one({"brand_slug": brand_slug}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Link page not found")
    updated = await db.link_pages.find_one({"brand_slug": brand_slug}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return LinkPage(**updated)

@api_router.delete("/link-pages/{brand_slug}")
async def delete_link_page(brand_slug: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.link_pages.delete_one({"brand_slug": brand_slug})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link page not found")
    return {"message": "Link page deleted successfully"}

# ==================== UPI PAYMENT INFO ====================

@api_router.get("/upi-payment-info", response_model=UPIPaymentInfo)
async def get_upi_payment_info():
    info = await db.upi_payment_info.find_one({"id": "upi_payment_info"}, {"_id": 0})
    if not info:
        # Return default
        default_info = UPIPaymentInfo(
            company_name="Miswa International",
            brand_name="Miswa International",
            gst_number="",
            upi_id="",
            qr_code_url=""
        )
        return default_info
    if isinstance(info.get('updated_at'), str):
        info['updated_at'] = datetime.fromisoformat(info['updated_at'])
    return UPIPaymentInfo(**info)

@api_router.post("/upi-payment-info/upload-logo")
async def upload_upi_logo(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    """Upload logo file for UPI payment info"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"logo_{file_id}{file_ext}"
    file_path = UPI_UPLOADS_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    logger.info(f"UPI logo file saved: {filename}")
    
    # Return the URL path (relative to backend base URL)
    # The frontend will construct the full URL using its BACKEND_URL
    file_url = f"/uploads/upi/{filename}"
    
    return {"url": file_url, "filename": filename}

@api_router.post("/upi-payment-info/upload-qr-code")
async def upload_upi_qr_code(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    """Upload QR code file for UPI payment info"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"qr_{file_id}{file_ext}"
    file_path = UPI_UPLOADS_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    logger.info(f"UPI QR code file saved: {filename}")
    
    # Return the URL path (relative to backend base URL)
    # The frontend will construct the full URL using its BACKEND_URL
    file_url = f"/uploads/upi/{filename}"
    
    return {"url": file_url, "filename": filename}

@api_router.put("/upi-payment-info", response_model=UPIPaymentInfo)
async def update_upi_payment_info(input: UPIPaymentInfoUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.upi_payment_info.update_one(
        {"id": "upi_payment_info"},
        {"$set": update_data},
        upsert=True
    )
    
    info = await db.upi_payment_info.find_one({"id": "upi_payment_info"}, {"_id": 0})
    if isinstance(info.get('updated_at'), str):
        info['updated_at'] = datetime.fromisoformat(info['updated_at'])
    return UPIPaymentInfo(**info)

# ==================== SOCIAL MEDIA INFO ====================

@api_router.get("/social-media-info", response_model=SocialMediaInfo)
async def get_social_media_info():
    info = await db.social_media_info.find_one({"id": "social_media_info"}, {"_id": 0})
    if not info:
        # Return default with empty links
        default_info = SocialMediaInfo(links=[])
        return default_info
    if isinstance(info.get('updated_at'), str):
        info['updated_at'] = datetime.fromisoformat(info['updated_at'])
    return SocialMediaInfo(**info)

@api_router.put("/social-media-info", response_model=SocialMediaInfo)
async def update_social_media_info(input: SocialMediaInfoUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.social_media_info.update_one(
        {"id": "social_media_info"},
        {"$set": update_data},
        upsert=True
    )
    
    info = await db.social_media_info.find_one({"id": "social_media_info"}, {"_id": 0})
    if isinstance(info.get('updated_at'), str):
        info['updated_at'] = datetime.fromisoformat(info['updated_at'])
    return SocialMediaInfo(**info)

# ==================== MYLITTLETALES PRODUCTS ====================

@api_router.get("/mylittletales/products")
async def get_mylittletales_products():
    """Fetch products from mylittletales.com"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get('https://mylittletales.com', timeout=10) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # This is a placeholder - actual scraping logic depends on the website structure
                    products = []
                    # Add basic product structure
                    return {
                        "success": True,
                        "products": products,
                        "message": "Products fetched successfully"
                    }
                else:
                    return {"success": False, "message": "Could not fetch products"}
    except Exception as e:
        logger.error(f"Error fetching mylittletales products: {e}")
        return {"success": False, "message": str(e)}

# ==================== INITIALIZE DEFAULT DATA ====================

@app.on_event("startup")
async def initialize_data():
    """Initialize database with default brand data if empty"""
    brands_count = await db.brands.count_documents({})
    if brands_count == 0:
        # Add MyLittleTales
        mlt_brand = Brand(
            name="MyLittleTales",
            tagline="Educational Wooden Toys for Growing Minds",
            description="MyLittleTales specializes in crafting premium wooden educational toys designed to inspire creativity, learning, and development in children. Our products combine traditional craftsmanship with modern educational principles.",
            website="https://mylittletales.com",
            logo_url="https://customer-assets.emergentagent.com/job_ece25fd4-86f7-4b5b-899a-e81995d5ad91/artifacts/okjqwqlr_mlt_logo_transparent_1%20%281%29.png",
            image_url="https://customer-assets.emergentagent.com/job_ece25fd4-86f7-4b5b-899a-e81995d5ad91/artifacts/okjqwqlr_mlt_logo_transparent_1%20%281%29.png"
        )
        mlt_doc = mlt_brand.model_dump()
        mlt_doc['created_at'] = mlt_doc['created_at'].isoformat()
        await db.brands.insert_one(mlt_doc)
        
        # Add Tynee Tots
        tt_brand = Brand(
            name="Tynee Tots",
            tagline="Premium Kids Clothing & Accessories",
            description="Tynee Tots offers a delightful collection of premium children's wear and accessories. We focus on comfort, style, and quality to ensure your little ones look adorable while feeling great.",
            website="https://tyneetots.com",
            logo_url="https://customer-assets.emergentagent.com/job_ece25fd4-86f7-4b5b-899a-e81995d5ad91/artifacts/8rg2l7k3_Untitled%20design%20%282%29.png",
            image_url="https://customer-assets.emergentagent.com/job_ece25fd4-86f7-4b5b-899a-e81995d5ad91/artifacts/8rg2l7k3_Untitled%20design%20%282%29.png"
        )
        tt_doc = tt_brand.model_dump()
        tt_doc['created_at'] = tt_doc['created_at'].isoformat()
        await db.brands.insert_one(tt_doc)
        
        logger.info("Initialized default brand data")
    
    # Initialize default link pages if empty
    link_pages_count = await db.link_pages.count_documents({})
    if link_pages_count == 0:
        # MyLittleTales Link Page
        mlt_link_page = LinkPage(
            brand_slug="mylittletales",
            brand_name="MyLittleTales",
            tagline="Educational Wooden Toys for Growing Minds",
            description="Crafting premium wooden educational toys designed to inspire creativity, learning, and development in children.",
            logo_url="https://customer-assets.emergentagent.com/job_ece25fd4-86f7-4b5b-899a-e81995d5ad91/artifacts/okjqwqlr_mlt_logo_transparent_1%20%281%29.png",
            website_url="https://www.mylittletales.com",
            instagram_url="https://www.instagram.com/mylittletalestoys",
            facebook_url="https://www.facebook.com/MyLittleTalesToys",
            whatsapp_url="https://wa.me/918199848535?text=Hi!",
            google_review_url="https://www.google.com/maps/search/?api=1&query=MyLittleTales+Toys+Review",
            qr_codes=[
                QRCode(title="Google Review", url="https://www.google.com/maps/search/?api=1&query=MyLittleTales+Toys+Review"),
                QRCode(title="Instagram", url="https://www.instagram.com/mylittletalestoys")
            ],
            gradient_from="from-coral-400",
            gradient_to="to-orange-500",
            bg_gradient_from="from-orange-50",
            bg_gradient_via="via-white",
            bg_gradient_to="to-orange-50/30"
        )
        mlt_link_doc = mlt_link_page.model_dump()
        mlt_link_doc['created_at'] = mlt_link_doc['created_at'].isoformat()
        mlt_link_doc['updated_at'] = mlt_link_doc['updated_at'].isoformat()
        await db.link_pages.insert_one(mlt_link_doc)
        
        # Tynee Tots Link Page
        tt_link_page = LinkPage(
            brand_slug="tyneetots",
            brand_name="Tynee Tots",
            tagline="Premium Kids Clothing & Accessories",
            description="Delightful collection of premium children's wear and accessories. We focus on comfort, style, and quality to ensure your little ones look adorable while feeling great.",
            logo_url="https://customer-assets.emergentagent.com/job_ece25fd4-86f7-4b5b-899a-e81995d5ad91/artifacts/8rg2l7k3_Untitled%20design%20%282%29.png",
            website_url="https://www.tyneetots.com",
            instagram_url="https://www.instagram.com/mylittletalestoys",
            facebook_url="https://www.facebook.com/MyLittleTalesToys",
            whatsapp_url="https://wa.me/918199848535?text=Hi!",
            google_review_url="https://www.google.com/maps/search/?api=1&query=Tynee+Tots+Review",
            qr_codes=[
                QRCode(title="Google Review", url="https://www.google.com/maps/search/?api=1&query=Tynee+Tots+Review"),
                QRCode(title="Instagram", url="https://www.instagram.com/mylittletalestoys")
            ],
            gradient_from="from-purple-400",
            gradient_to="to-indigo-500",
            bg_gradient_from="from-purple-50",
            bg_gradient_via="via-white",
            bg_gradient_to="to-indigo-50/30"
        )
        tt_link_doc = tt_link_page.model_dump()
        tt_link_doc['created_at'] = tt_link_doc['created_at'].isoformat()
        tt_link_doc['updated_at'] = tt_link_doc['updated_at'].isoformat()
        await db.link_pages.insert_one(tt_link_doc)
        
        logger.info("Initialized default link pages data")
    
    # Initialize default admin user if empty
    admin_count = await db.admin_users.count_documents({})
    if admin_count == 0:
        # Get default credentials from environment or use defaults
        default_username = os.environ.get('ADMIN_USERNAME', 'admin')
        default_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        
        admin_user = AdminUser(
            username=default_username,
            password_hash=get_password_hash(default_password)
        )
        admin_doc = admin_user.model_dump()
        admin_doc['created_at'] = admin_doc['created_at'].isoformat()
        await db.admin_users.insert_one(admin_doc)
        
        logger.info(f"Initialized default admin user: {default_username}")
        logger.warning("⚠️  Default admin credentials: username='admin', password='admin123'")
        logger.warning("⚠️  Change these credentials immediately in production!")

app.include_router(api_router)

# Serve uploaded files statically
uploads_dir = ROOT_DIR / "uploads"
if uploads_dir.exists():
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# CORS configuration - supports comma-separated origins
cors_origins_env = os.environ.get('CORS_ORIGINS', '*')
if cors_origins_env != '*':
    # Split by comma and strip whitespace from each origin
    cors_origins = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]
    use_credentials = True
    logger.info(f"CORS configured for origins: {cors_origins}")
else:
    # When CORS_ORIGINS is '*', allow all origins
    # IMPORTANT: When using ['*'], we MUST set allow_credentials=False
    # This is a security restriction in the CORS specification
    # You cannot use allow_credentials=True with allow_origins=['*']
    cors_origins = ["*"]
    use_credentials = False
    logger.info("CORS configured to allow all origins (*) with credentials disabled")
    logger.warning("⚠️  For production, set CORS_ORIGINS environment variable to specific origins for better security")
    logger.warning("⚠️  Example: CORS_ORIGINS=https://miswainternational.com,https://www.miswainternational.com")

# Configure CORS middleware
# Note: When allow_credentials=True, you cannot use allow_origins=['*']
# This is a security restriction in the CORS specification
app.add_middleware(
    CORSMiddleware,
    allow_credentials=use_credentials,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()