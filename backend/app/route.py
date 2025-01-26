from app.common import *
from app import schemas, models
from app.crud import get_user_by_email, create_user, create_course, get_all_courses, get_course_by_slot, create_registration, get_registered_courses, create_attendance, get_attendance_summary, get_course_attendance, get_course_attendance_summary, get_user_by_id, get_course_by_name, get_all_course_namelist
from app.utils import *
from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile, Response, WebSocket


router = APIRouter(prefix="/api")

@router.get("/courselist", response_model=None, tags=["courses"])
async def get_course_list(
    db: Session = Depends(get_db)
):
    """Get all courses with registration status for current user."""
    return await get_all_course_namelist(db)

@router.post("/users", tags=["users"])
async def create_dbuser(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Create a new user with profile picture."""
    # Check if email already exists
    if await get_user_by_email(db, email=email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Save profile picture to data folder
    pic_data = await image.read()
    filename = f"{uuid4().time}.jpg"
    with open(f"media/{filename}", "wb") as f:
        f.write(pic_data)

    user = schemas.UserCreate(
        email=email,
        username=username,
        password=password,
        avatar=filename
    )
    
    new_user = await create_user(db, user)
    
    rekognition_manager.index_face(pic_data, str(new_user.id))
    if not sns_manager.is_email_subscribed(email):
        sns_manager.subscribe_email(email)
        
    return {"status":"success"}

# create a endpoint to test sns
@router.post("/sns", tags=["alert"])
async def send_alert(
    email: str = Form(...),
    password: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...),
    db: Session = Depends(get_db)
):
    if not await is_admin(email, password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

    sns_manager.publish_message(subject, message)  
    return {"status": "success"}

@router.post("/auth", response_model=schemas.Token, tags=["auth"])
async def login_for_access_token(
    form_data: schemas.AuthForm,
    db: Session = Depends(get_db),
):
    """Authenticate user and return access token."""
    user = await authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = await create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(days=30)
    )

    userData = {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "avatar": user.avatar
    }    

    return {"access_token": access_token, "token_type": "bearer", "user": userData}

@router.post("/courses", response_model=schemas.CourseResponse, tags=["courses"])
async def create_course(
    course: schemas.CourseCreate,
    db: Session = Depends(get_db)
):
    """Create a new course."""
    return create_course(db, course_data=course.dict())

@router.get("/courses", response_model=List[schemas.CourseResponse], tags=["courses"])
async def get_courses(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get all courses with registration status for current user."""

    semester = models.Semester.FALL
    semester_type = models.SemesterType.GENERAL
    email = await get_email_from_token(token)
    user = await get_user_by_email(db, email)
    return await get_all_courses(db, semester, semester_type, user.id)

@router.post("/registrations", tags=["registrations"])
async def register_course(
    registration: schemas.RegistrationBase,
    db: Session = Depends(get_db)
):
    """Register a user for a course."""
    await create_registration(
        db,
        user_id=registration.user_id,
        course_id=registration.course_id
    )
    return {"status": "success"}

@router.get("/registrations/user/{user_id}", response_model=List[schemas.Course], tags=["registrations"])
async def registered_courses(
    user_id: UUID4,
    db: Session = Depends(get_db)
):
    """Get all courses registered by a user."""
    return await get_registered_courses(db, user_id)

@router.post("/attendance", tags=["attendance"], response_model=None)
async def post_attendance(
    image: UploadFile = File(...),
    course_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create attendance record with face recognition."""
    # Process image and recognize face
    image_bytes = await image.read()
    user_id = rekognition_manager.recognize_face(image_bytes)
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    course = await crud.get_course_by_name(db, course_name)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get current date and time
    current_datetime = datetime.now()
    current_date = current_datetime.date()
    current_time = current_datetime.time()
    print(current_time)

    time_slot = await get_time_interval(current_time.strftime("%H:%M"))

    if not time_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time slot"
        )

    record = await crud.create_attendance(
        db,
        user_id=user_id,
        course_id=course.id,
        attendance_date=current_date,
        time_slot=time_slot,
        status=models.AttendanceStatus.PRESENT
    )
    if record:
        return {"status": "success", "user": user.username}
    else:
        return {"status": "failed", "message": f"User {user.username} already marked attendance for slot {time_slot}"}

@router.get("/attendance/user/{user_id}", response_model=List[schemas.CourseInfo], tags=["attendance"])
async def get_user_attendance_summary(
    user_id: UUID4,
    db: Session = Depends(get_db)
):
    """Get attendance summary for all courses of a user."""
    return await get_attendance_summary(db, user_id)

@router.get("/attendance/course/{course_id}/user/{user_id}", response_model=None, tags=["attendance"])
async def course_attendance(
    course_id: UUID4,
    user_id: UUID4,
    db: Session = Depends(get_db)
):
    """Get detailed attendance records for a specific course and user."""
    courseInfo = await get_course_attendance_summary(db, course_id, user_id)
    records = await get_course_attendance(db, course_id, user_id)

    return {"courseInfo": courseInfo, "records": records}
