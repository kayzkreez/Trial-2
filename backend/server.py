from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import hashlib
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Mula-wave Money Transfer API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'mula-wave-secret-key-2024')
JWT_ALGORITHM = "HS256"
ADMIN_PHONE = "07657927838"
ADMIN_PIN = "1983"

# Enums
class UserStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    COMPLETED = "completed"
    REJECTED = "rejected"

class PayoutMethod(str, Enum):
    CASH_PICKUP = "cash_pickup"
    BANK_TRANSFER = "bank_transfer"
    ECOCASH = "ecocash"

class TransferRoute(str, Enum):
    ZIM_TO_INDIA = "zim_to_india"
    INDIA_TO_ZIM = "india_to_zim"

# Models
class UserRegistration(BaseModel):
    phone: str
    full_name: str
    email: EmailStr
    date_of_birth: str
    address: str
    city: str
    country: str = "Zimbabwe"
    pin: str

class UserLogin(BaseModel):
    phone: str
    pin: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    full_name: str
    email: EmailStr
    date_of_birth: str
    address: str
    city: str
    country: str = "Zimbabwe"
    pin_hash: str
    status: UserStatus = UserStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    is_admin: bool = False

class Recipient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None  # For India
    sort_code: Optional[str] = None  # For Zimbabwe
    address: str
    city: str
    state: Optional[str] = None  # Required for India, optional for Zimbabwe
    country: str  # "India" or "Zimbabwe"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RecipientCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    address: str
    city: str
    state: str
    country: str = "India"

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"MW{str(uuid.uuid4()).replace('-', '').upper()[:8]}")
    user_id: str
    recipient_id: str
    transfer_route: TransferRoute
    send_amount: float  # Source currency amount
    send_currency: str  # USD or INR
    fee_amount: float  # In source currency (7%)
    ecocash_fee: float = 0.0  # Additional EcoCash fee if applicable
    exchange_rate: float  # Rate applied
    receive_amount: float  # Destination currency amount
    receive_currency: str  # INR or USD
    payout_method: PayoutMethod
    status: TransactionStatus = TransactionStatus.PENDING
    payment_reference: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    admin_notes: Optional[str] = None

class TransactionCreate(BaseModel):
    recipient_id: str
    transfer_route: TransferRoute
    send_amount: float
    payout_method: PayoutMethod
    payment_reference: Optional[str] = None

class RateCalculation(BaseModel):
    transfer_route: TransferRoute
    send_amount: float
    send_currency: str
    fee_amount: float
    ecocash_fee: float = 0.0
    exchange_rate: float
    receive_amount: float
    receive_currency: str
    total_to_pay: float

class AdminAction(BaseModel):
    action: str  # approve, reject, complete
    notes: Optional[str] = None

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Utility functions
def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

def verify_pin(pin: str, pin_hash: str) -> bool:
    return hash_pin(pin) == pin_hash

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_doc = await db.users.find_one({"id": user_id})
    if user_doc is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Calculate rates
def calculate_rates(send_amount: float, transfer_route: TransferRoute, payout_method: PayoutMethod = None) -> RateCalculation:
    fee_amount = send_amount * 0.07  # 7% fee
    ecocash_fee = 0.0
    
    if transfer_route == TransferRoute.ZIM_TO_INDIA:
        # Zimbabwe → India: USD to INR
        exchange_rate = 87.0  # INR per USD
        send_currency = "USD"
        receive_currency = "INR"
        net_amount = send_amount - fee_amount
        receive_amount = net_amount * exchange_rate
        
    else:  # INDIA_TO_ZIM
        # India → Zimbabwe: INR to USD
        exchange_rate = 90.0  # INR per USD (reverse rate)
        send_currency = "INR"
        receive_currency = "USD"
        net_amount = send_amount - fee_amount
        receive_amount = net_amount / exchange_rate
        
        # Add EcoCash fee if applicable
        if payout_method == PayoutMethod.ECOCASH:
            ecocash_fee = receive_amount * 0.05  # 5% EcoCash fee on USD amount
            receive_amount = receive_amount - ecocash_fee
    
    total_to_pay = send_amount
    
    return RateCalculation(
        transfer_route=transfer_route,
        send_amount=send_amount,
        send_currency=send_currency,
        fee_amount=fee_amount,
        ecocash_fee=ecocash_fee,
        exchange_rate=exchange_rate,
        receive_amount=receive_amount,
        receive_currency=receive_currency,
        total_to_pay=total_to_pay
    )

# Basic Routes
@api_router.get("/")
async def root():
    return {"message": "Mula-wave Money Transfer API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Auth Routes
@api_router.post("/register", response_model=dict)
async def register_user(user_data: UserRegistration):
    # Check if user already exists
    existing_user = await db.users.find_one({"phone": user_data.phone})
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Check for admin credentials
    is_admin = user_data.phone == ADMIN_PHONE and user_data.pin == ADMIN_PIN
    
    # Create user
    user = User(
        phone=user_data.phone,
        full_name=user_data.full_name,
        email=user_data.email,
        date_of_birth=user_data.date_of_birth,
        address=user_data.address,
        city=user_data.city,
        country=user_data.country,
        pin_hash=hash_pin(user_data.pin),
        is_admin=is_admin,
        status=UserStatus.VERIFIED if is_admin else UserStatus.PENDING
    )
    
    await db.users.insert_one(user.dict())
    
    return {
        "message": "Registration successful",
        "user_id": user.id,
        "status": user.status,
        "is_admin": user.is_admin
    }

@api_router.post("/login", response_model=dict)
async def login_user(login_data: UserLogin):
    user_doc = await db.users.find_one({"phone": login_data.phone})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid phone number or PIN")
    
    user = User(**user_doc)
    if not verify_pin(login_data.pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid phone number or PIN")
    
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "phone": user.phone,
            "full_name": user.full_name,
            "email": user.email,
            "status": user.status,
            "is_admin": user.is_admin
        }
    }

@api_router.get("/profile", response_model=dict)
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "date_of_birth": current_user.date_of_birth,
        "address": current_user.address,
        "city": current_user.city,
        "country": current_user.country,
        "status": current_user.status,
        "is_admin": current_user.is_admin,
        "created_at": current_user.created_at
    }

@api_router.post("/calculate-rate", response_model=RateCalculation)
async def calculate_rate(rate_data: dict):
    send_amount = rate_data.get("send_amount", 0)
    transfer_route = rate_data.get("transfer_route", TransferRoute.ZIM_TO_INDIA)
    payout_method = rate_data.get("payout_method")
    
    if send_amount <= 0:
        raise HTTPException(status_code=400, detail="Send amount must be greater than 0")
    
    # Convert string to enum if needed
    if isinstance(transfer_route, str):
        transfer_route = TransferRoute(transfer_route)
    if isinstance(payout_method, str):
        payout_method = PayoutMethod(payout_method)
    
    return calculate_rates(send_amount, transfer_route, payout_method)

# Recipients
@api_router.post("/recipients", response_model=dict)
async def create_recipient(recipient_data: RecipientCreate, current_user: User = Depends(get_current_user)):
    recipient = Recipient(
        user_id=current_user.id,
        **recipient_data.dict()
    )
    
    await db.recipients.insert_one(recipient.dict())
    return {"message": "Recipient created successfully", "recipient_id": recipient.id}

@api_router.get("/recipients", response_model=List[dict])
async def get_recipients(current_user: User = Depends(get_current_user)):
    recipients = await db.recipients.find({"user_id": current_user.id}).to_list(1000)
    return [{
        "id": r["id"],
        "full_name": r["full_name"],
        "phone": r["phone"],
        "email": r.get("email"),
        "bank_name": r.get("bank_name"),
        "account_number": r.get("account_number"),
        "ifsc_code": r.get("ifsc_code"),
        "address": r["address"],
        "city": r["city"],
        "state": r["state"],
        "country": r["country"]
    } for r in recipients]

# Transactions
@api_router.post("/transactions", response_model=dict)
async def create_transaction(transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    if current_user.status != UserStatus.VERIFIED:
        raise HTTPException(status_code=403, detail="Account verification required")
    
    # Verify recipient belongs to user
    recipient = await db.recipients.find_one({"id": transaction_data.recipient_id, "user_id": current_user.id})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Calculate amounts
    rates = calculate_rates(transaction_data.send_amount, transaction_data.transfer_route, transaction_data.payout_method)
    
    transaction = Transaction(
        user_id=current_user.id,
        recipient_id=transaction_data.recipient_id,
        transfer_route=transaction_data.transfer_route,
        send_amount=transaction_data.send_amount,
        send_currency=rates.send_currency,
        fee_amount=rates.fee_amount,
        ecocash_fee=rates.ecocash_fee,
        exchange_rate=rates.exchange_rate,
        receive_amount=rates.receive_amount,
        receive_currency=rates.receive_currency,
        payout_method=transaction_data.payout_method,
        payment_reference=transaction_data.payment_reference
    )
    
    await db.transactions.insert_one(transaction.dict())
    
    # Create notification for user
    notification = Notification(
        user_id=current_user.id,
        title="Transaction Created",
        message=f"Your transfer order {transaction.order_number} has been created and is pending approval."
    )
    await db.notifications.insert_one(notification.dict())
    
    return {
        "message": "Transaction created successfully",
        "order_number": transaction.order_number,
        "transaction_id": transaction.id
    }

@api_router.get("/transactions", response_model=List[dict])
async def get_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find({"user_id": current_user.id}).sort("created_at", -1).to_list(1000)
    
    result = []
    for t in transactions:
        # Get recipient info
        recipient = await db.recipients.find_one({"id": t["recipient_id"]})
        result.append({
            "id": t["id"],
            "order_number": t["order_number"],
            "transfer_route": t.get("transfer_route", "zim_to_india"),
            "recipient_name": recipient["full_name"] if recipient else "Unknown",
            "send_amount": t["send_amount"],
            "send_currency": t.get("send_currency", "USD"),
            "fee_amount": t["fee_amount"],
            "ecocash_fee": t.get("ecocash_fee", 0),
            "receive_amount": t["receive_amount"],
            "receive_currency": t.get("receive_currency", "INR"),
            "exchange_rate": t["exchange_rate"],
            "payout_method": t["payout_method"],
            "status": t["status"],
            "payment_reference": t.get("payment_reference"),
            "created_at": t["created_at"],
            "completed_at": t.get("completed_at")
        })
    
    return result

@api_router.get("/notifications", response_model=List[dict])
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user.id}).sort("created_at", -1).to_list(1000)
    return [{
        "id": n["id"],
        "title": n["title"],
        "message": n["message"],
        "read": n["read"],
        "created_at": n["created_at"]
    } for n in notifications]

# Admin Routes
@api_router.get("/admin/dashboard", response_model=dict)
async def get_admin_dashboard(admin_user: User = Depends(get_admin_user)):
    # Get statistics
    total_users = await db.users.count_documents({})
    pending_users = await db.users.count_documents({"status": UserStatus.PENDING})
    verified_users = await db.users.count_documents({"status": UserStatus.VERIFIED})
    
    total_transactions = await db.transactions.count_documents({})
    pending_transactions = await db.transactions.count_documents({"status": TransactionStatus.PENDING})
    completed_transactions = await db.transactions.count_documents({"status": TransactionStatus.COMPLETED})
    
    # Calculate total volume
    pipeline = [
        {"$match": {"status": TransactionStatus.COMPLETED}},
        {"$group": {"_id": None, "total_volume": {"$sum": "$send_amount"}, "total_fees": {"$sum": "$fee_amount"}}}
    ]
    volume_result = await db.transactions.aggregate(pipeline).to_list(1)
    total_volume = volume_result[0]["total_volume"] if volume_result else 0
    total_fees = volume_result[0]["total_fees"] if volume_result else 0
    
    return {
        "users": {
            "total": total_users,
            "pending": pending_users,
            "verified": verified_users
        },
        "transactions": {
            "total": total_transactions,
            "pending": pending_transactions,
            "completed": completed_transactions,
            "total_volume_usd": total_volume,
            "total_fees_usd": total_fees
        }
    }

@api_router.get("/admin/users", response_model=List[dict])
async def get_all_users(admin_user: User = Depends(get_admin_user)):
    users = await db.users.find({"is_admin": False}).sort("created_at", -1).to_list(1000)
    return [{
        "id": u["id"],
        "phone": u["phone"],
        "full_name": u["full_name"],
        "email": u["email"],
        "status": u["status"],
        "created_at": u["created_at"],
        "verified_at": u.get("verified_at")
    } for u in users]

@api_router.post("/admin/users/{user_id}/verify", response_model=dict)
async def verify_user(user_id: str, action_data: AdminAction, admin_user: User = Depends(get_admin_user)):
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = UserStatus.VERIFIED if action_data.action == "approve" else UserStatus.REJECTED
    update_data = {
        "status": new_status,
        "verified_at": datetime.utcnow() if new_status == UserStatus.VERIFIED else None
    }
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    # Create notification
    notification = Notification(
        user_id=user_id,
        title="Account Status Updated",
        message=f"Your account has been {new_status}. {action_data.notes or ''}"
    )
    await db.notifications.insert_one(notification.dict())
    
    return {"message": f"User {new_status} successfully"}

@api_router.get("/admin/transactions", response_model=List[dict])
async def get_all_transactions(admin_user: User = Depends(get_admin_user)):
    transactions = await db.transactions.find({}).sort("created_at", -1).to_list(1000)
    
    result = []
    for t in transactions:
        # Get user and recipient info
        user = await db.users.find_one({"id": t["user_id"]})
        recipient = await db.recipients.find_one({"id": t["recipient_id"]})
        
        result.append({
            "id": t["id"],
            "order_number": t["order_number"],
            "transfer_route": t.get("transfer_route", "zim_to_india"),
            "user_name": user["full_name"] if user else "Unknown",
            "user_phone": user["phone"] if user else "Unknown",
            "recipient_name": recipient["full_name"] if recipient else "Unknown",
            "send_amount": t["send_amount"],
            "send_currency": t.get("send_currency", "USD"),
            "fee_amount": t["fee_amount"],
            "ecocash_fee": t.get("ecocash_fee", 0),
            "receive_amount": t["receive_amount"],
            "receive_currency": t.get("receive_currency", "INR"),
            "payout_method": t["payout_method"],
            "status": t["status"],
            "payment_reference": t.get("payment_reference"),
            "created_at": t["created_at"],
            "admin_notes": t.get("admin_notes")
        })
    
    return result

@api_router.post("/admin/transactions/{transaction_id}/update", response_model=dict)
async def update_transaction_status(transaction_id: str, action_data: AdminAction, admin_user: User = Depends(get_admin_user)):
    transaction_doc = await db.transactions.find_one({"id": transaction_id})
    if not transaction_doc:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    status_map = {
        "approve": TransactionStatus.APPROVED,
        "reject": TransactionStatus.REJECTED,
        "complete": TransactionStatus.COMPLETED
    }
    
    new_status = status_map.get(action_data.action)
    if not new_status:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    update_data = {
        "status": new_status,
        "admin_notes": action_data.notes
    }
    
    if new_status == TransactionStatus.APPROVED:
        update_data["approved_at"] = datetime.utcnow()
    elif new_status == TransactionStatus.COMPLETED:
        update_data["completed_at"] = datetime.utcnow()
    
    await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    
    # Create notification for user
    transaction = Transaction(**transaction_doc)
    notification = Notification(
        user_id=transaction.user_id,
        title="Transaction Status Updated",
        message=f"Your transfer order {transaction.order_number} has been {new_status}. {action_data.notes or ''}"
    )
    await db.notifications.insert_one(notification.dict())
    
    return {"message": f"Transaction {new_status} successfully"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Remove duplicate health check