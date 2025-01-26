from app.common import *
from app import crud

async def is_admin(email, password):
    return email == "admin@gmail.com" and password == "admin"

async def get_time_interval(time_str):
    time_intervals = [
        ("00:00", "01:00"),
        ("01:00", "02:00"),
        ("02:00", "03:00"),
        ("03:00", "04:00"),
        ("04:00", "05:00"),
        ("05:00", "06:00"),
        ("06:00", "07:00"),
        ("07:00", "08:00"),
        ("08:00", "09:00"),
        ("09:00", "10:00"),
        ("10:00", "11:00"),
        ("11:00", "12:00"),
        ("12:00", "13:00"),
        ("13:00", "14:00"),
        ("14:00", "15:00"),
        ("15:00", "16:00"),
        ("16:00", "17:00"),
        ("17:00", "18:00"),
        ("18:00", "19:00"),
        ("19:00", "20:00"),
        ("20:00", "21:00"),
        ("21:00", "22:00"),
        ("22:00", "23:00"),
        ("23:00", "00:00"),
    ]

    time = datetime.strptime(time_str, "%H:%M").time()

    for start, end in time_intervals:
        start_time = datetime.strptime(start, "%H:%M").time()
        end_time = datetime.strptime(end, "%H:%M").time()
        if start_time <= time < end_time:
            return f"{start}-{end}"

    return None

async def init_db():
    from app.models import Base
    from app.database import engine
    Base.metadata.create_all(bind=engine)
    print("Database initialized")

async def create_courses(db, path="app/config/courses.json"):
    with open(path, 'r') as fp:
        courses_data:list = json.load(fp)

    for course in courses_data:
        try:
            await crud.create_course(db, course)
        except:
            return

    courses_data.clear()

    with open(path, 'w') as fp:
        json.dump(courses_data, fp)

async def find_slot(day, time):
    if day in slot_map:
        for slot_time, slot in slot_map[day].items():
            start_time, end_time = slot_time.split(" - ")
            if start_time <= time <= end_time:
                return slot
    return None

# # Dependency

async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def authenticate_user(db: Session, email: str, password: str):
    user = await crud.get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user

async def get_email_from_token(token: str):
    payload = jwt.decode(token, KEY, algorithms=[ALGORITHM])
    email: str = payload.get("sub")
    return email

async def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        user = await crud.get_user_by_email(db, email)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        return user
    except PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)