from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Union
import uuid
from datetime import datetime, timezone
import aiohttp
from bs4 import BeautifulSoup
import io
import csv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

# ==================== BRANDS ====================

@api_router.get("/brands", response_model=List[Brand])
async def get_brands():
    brands = await db.brands.find({}, {"_id": 0}).to_list(100)
    for brand in brands:
        if isinstance(brand.get('created_at'), str):
            brand['created_at'] = datetime.fromisoformat(brand['created_at'])
    return brands

@api_router.post("/brands", response_model=Brand)
async def create_brand(input: BrandCreate):
    brand = Brand(**input.model_dump())
    doc = brand.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.brands.insert_one(doc)
    return brand

@api_router.put("/brands/{brand_id}", response_model=Brand)
async def update_brand(brand_id: str, input: BrandCreate):
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
async def delete_brand(brand_id: str):
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
async def create_catalog(input: CatalogCreate):
    catalog = Catalog(**input.model_dump())
    doc = catalog.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.catalogs.insert_one(doc)
    return catalog

@api_router.put("/catalogs/{catalog_id}", response_model=Catalog)
async def update_catalog(catalog_id: str, input: CatalogCreate):
    catalog_dict = input.model_dump()
    result = await db.catalogs.update_one({"id": catalog_id}, {"$set": catalog_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Catalog not found")
    updated = await db.catalogs.find_one({"id": catalog_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Catalog(**updated)

@api_router.delete("/catalogs/{catalog_id}")
async def delete_catalog(catalog_id: str):
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
async def create_blog(input: BlogCreate):
    blog = Blog(**input.model_dump())
    doc = blog.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.blogs.insert_one(doc)
    return blog

@api_router.put("/blogs/{blog_id}", response_model=Blog)
async def update_blog(blog_id: str, input: BlogCreate):
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
async def delete_blog(blog_id: str):
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
async def create_career(input: CareerCreate):
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
async def update_career(career_id: str, input: CareerCreate):
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
async def delete_career(career_id: str):
    result = await db.careers.delete_one({"id": career_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Career not found")
    return {"message": "Career deleted successfully"}

# ==================== INQUIRIES ====================

@api_router.post("/inquiries", response_model=Inquiry)
async def create_inquiry(input: InquiryCreate):
    inquiry = Inquiry(**input.model_dump())
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.inquiries.insert_one(doc)
    return inquiry

@api_router.get("/inquiries", response_model=List[Inquiry])
async def get_inquiries():
    inquiries = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for inquiry in inquiries:
        if isinstance(inquiry.get('created_at'), str):
            inquiry['created_at'] = datetime.fromisoformat(inquiry['created_at'])
    return inquiries

@api_router.get("/inquiries/export")
async def export_inquiries_csv():
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
async def delete_inquiry(inquiry_id: str):
    result = await db.inquiries.delete_one({"id": inquiry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return {"message": "Inquiry deleted successfully"}

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
async def update_company_info(input: CompanyInfoUpdate):
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
async def create_link_page(input: LinkPageCreate):
    link_page = LinkPage(**input.model_dump())
    doc = link_page.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.link_pages.insert_one(doc)
    return link_page

@api_router.put("/link-pages/{brand_slug}", response_model=LinkPage)
async def update_link_page(brand_slug: str, input: LinkPageUpdate):
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
async def delete_link_page(brand_slug: str):
    result = await db.link_pages.delete_one({"brand_slug": brand_slug})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link page not found")
    return {"message": "Link page deleted successfully"}

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

app.include_router(api_router)

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