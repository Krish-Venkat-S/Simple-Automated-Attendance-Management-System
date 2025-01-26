from app.common import *
from app import models, schemas
from app.models import Semester, SemesterType, CourseType

async def get_all_course_namelist(db: Session) -> List[str]:
    """Get all course names."""
    return [course.course_name for course in db.query(models.Course).all()]


async def get_course_by_name(db: Session, course_name: str) -> Optional[models.Course]:
    return db.query(models.Course).filter(models.Course.course_name == course_name).first()

async def get_user_by_id(db: Session, user_id) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()
async def get_user(db: Session, user_id: UUID) -> Optional[models.User]:
    """Get user by UUID."""
    return db.query(models.User).filter(models.User.id == user_id).first()

async def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Get user by email address."""
    return db.query(models.User).filter(models.User.email == email.lower()).first()

async def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Create a new user."""
    db_user = models.User(
        email=user.email.lower(),
        username=user.username,
        password=pwd_context.hash(user.password),
        avatar=user.avatar
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

async def create_course(db: Session, course_data: Dict[str, str]) -> models.Course:
    """Create a new course."""
    if "semester" in course_data:
        course_data["semester"] = Semester[course_data["semester"].upper()]
    
    if "semester_type" in course_data:
        course_data["semester_type"] = SemesterType[course_data["semester_type"].upper()]
    
    if "course_type" in course_data:
        course_data["course_type"] = CourseType[course_data["course_type"].upper()]
    
    db_course = models.Course(**course_data)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

async def get_all_courses(
    db: Session, 
    semester: str, 
    semester_type: models.SemesterType,
    user_id: UUID
) -> List[Dict[str, Any]]:
    """
    Get all courses for a semester with registration status for a specific user.
    Uses joined load to optimize queries.
    """
    # Get all courses with their registration status for the user
    courses = (
        db.query(models.Course, models.Registration)
        .outerjoin(
            models.Registration,
            and_(
                models.Registration.course_id == models.Course.id,
                models.Registration.user_id == user_id
            )
        )
        .filter(
            models.Course.semester == semester,
            models.Course.semester_type == semester_type,
        )
        .all()
    )
    result = []
    for course, registration in courses:
        course_info = schemas.CourseResponse(
            id=course.id,
            semester=course.semester,
            semester_type=course.semester_type.value,
            course_code=course.course_code,
            course_name=course.course_name,
            course_type=course.course_type.value,
            faculty_name=course.faculty_name,
            class_no=course.class_no,
            classroom=course.classroom,
            time_slots=course.time_slots,
            registered=registration is not None
        )
        result.append(course_info)
    
    return result

async def get_course_by_slot(
    db: Session, 
    semester: str, 
    semester_type: models.SemesterType, 
    slot: str
) -> Optional[models.Course]:
    """Get course by time slot."""
    return (
        db.query(models.Course)
        .filter(
            models.Course.semester == semester,
            models.Course.semester_type == semester_type,
            models.Course.time_slots.any(slot),
        )
        .first()
    )

async def create_attendance(
    db: Session, 
    user_id: UUID,
    course_id: UUID,
    attendance_date: datetime,
    time_slot: str,
    status: models.AttendanceStatus = models.AttendanceStatus.ABSENT,
    remarks: Optional[str] = None
) -> models.Attendance:
    """Create a new attendance record."""
    db_attendance = models.Attendance(
        user_id=user_id,
        course_id=course_id,
        attendance_date=attendance_date,
        day_of_week=attendance_date.strftime("%a").upper(),
        time_slot=time_slot,
        status=status,
        remarks=remarks
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

async def create_registration(db: Session, user_id: UUID, course_id: UUID) -> models.Registration:
    """Create a new course registration."""
    db_registration = models.Registration(user_id=user_id, course_id=course_id)
    db.add(db_registration)
    db.commit()
    db.refresh(db_registration)
    return db_registration

async def get_registered_courses(db: Session, user_id: UUID) -> List[models.Course]:
    """Get all courses registered by a user using relationship."""
    results = (
        db.query(models.Course)
        .join(models.Registration)
        .filter(
            models.Registration.user_id == user_id,
        )
        .all()
    )
    # print one
    return [schemas.Course.from_orm(course) for course in results]

async def get_attendance_summary(db: Session, user_id: UUID) -> List[schemas.CourseInfo]:
    """Get attendance summary for all registered courses."""
    result = []
    courses = db.execute(
        select(models.Course)
        .join(models.Registration)
        .filter(models.Registration.user_id == user_id)
    ).scalars().all()

    for course in courses:
        present_count = len(list(db.execute(
            select(models.Attendance)
            .filter(
                models.Attendance.course_id == course.id,
                models.Attendance.user_id == user_id,
                models.Attendance.status == models.AttendanceStatus.PRESENT
            )
        ).scalars()))

        total_count = len(list(db.execute(
            select(models.Attendance)
            .filter(
                models.Attendance.course_id == course.id,
                models.Attendance.user_id == user_id
            )
        ).scalars()))

        course_info = schemas.CourseInfo(
            id=course.id,
            semester=course.semester,
            semester_type=course.semester_type.value,
            course_code=course.course_code,
            course_name=course.course_name,
            course_type=course.course_type.value,
            faculty_name=course.faculty_name,
            class_no=course.class_no,
            classroom=course.classroom,
            time_slots=course.time_slots,
            present=present_count,
            total=total_count,
            percentage=round((present_count / total_count * 100) if total_count > 0 else 0, 2)
            
        )
        result.append(course_info)
    
    return result

async def get_attendance_history(db: Session, user_id: UUID) -> List[Dict[str, Any]]:
    """Get detailed attendance history for a user."""
    attendances = (
        db.query(models.Attendance)
        .join(models.Course)
        .filter(models.Attendance.user_id == user_id)
        .order_by(models.Attendance.attendance_date.desc())
        .all()
    )

    return [{
        "date": attendance.attendance_date,
        "day": attendance.day_of_week,
        "time_slot": attendance.time_slot,
        "status": attendance.status.value,
        "course": {
            "id": attendance.course.id,
            "name": attendance.course.course_name,
            "faculty": {
                "name": attendance.course.faculty.username,
                "school": attendance.course.faculty_school
            },
            "classroom_location": attendance.course.classroom_location
        },
        "remarks": attendance.remarks
    } for attendance in attendances]

async def get_course_attendance_summary(
    db: Session, 
    course_id: UUID, 
    user_id: UUID
) -> schemas.CourseInfo:
    """Get attendance summary for a specific course and user."""
    
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    present_count = len(list(db.execute(
        select(models.Attendance)
        .filter(
            models.Attendance.course_id == course.id,
            models.Attendance.user_id == user_id,
            models.Attendance.status == models.AttendanceStatus.PRESENT
        )
    ).scalars()))

    total_count = len(list(db.execute(
        select(models.Attendance)
        .filter(
            models.Attendance.course_id == course.id,
            models.Attendance.user_id == user_id
        )
    ).scalars()))

    course_info = schemas.CourseInfo(
        id=course.id,
        semester=course.semester,
        semester_type=course.semester_type.value,
        course_code=course.course_code,
        course_name=course.course_name,
        course_type=course.course_type.value,
        faculty_name=course.faculty_name,
        class_no=course.class_no,
        classroom=course.classroom,
        time_slots=course.time_slots,
        present=present_count,
        total=total_count,
        percentage=round((present_count / total_count * 100) if total_count > 0 else 0, 2)
    )
    
    return course_info

async def get_course_attendance(
    db: Session, 
    course_id: UUID, 
    user_id: UUID
) -> List[dict]:
    """Get all attendance records for a specific course and user."""
    attendance_records = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.course_id == course_id,
            models.Attendance.user_id == user_id
        )
        .order_by(models.Attendance.attendance_date.desc())
        .all()
    )

    formatted_records = []
    for idx, record in enumerate(attendance_records, start=1):
        formatted_record = {
            "slNo": idx,
            "date": record.attendance_date.strftime("%Y-%m-%d"),
            "slot": record.time_slot,
            "dayTime": f"{record.day_of_week} {record.time_slot}",
            "status": record.status.value.capitalize()
        }
        formatted_records.append(formatted_record)

    return formatted_records

async def update_attendance_status(
    db: Session,
    attendance_id: UUID,
    status: models.AttendanceStatus,
    remarks: Optional[str] = None
) -> Optional[models.Attendance]:
    """Update attendance status and remarks."""
    attendance = db.query(models.Attendance).get(attendance_id)
    if attendance:
        attendance.status = status
        attendance.remarks = remarks
        attendance.updated_at = func.now()
        db.commit()
        db.refresh(attendance)
    return attendance

async def deactivate_registration(
    db: Session,
    user_id: UUID,
    course_id: UUID
) -> bool:
    """Soft delete a course registration."""
    registration = (
        db.query(models.Registration)
        .filter(
            models.Registration.user_id == user_id,
            models.Registration.course_id == course_id
        )
        .first()
    )
    if registration:
        registration.is_active = False
        db.commit()
        return True
    return False