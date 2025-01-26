from pydantic import BaseModel, EmailStr, UUID4
from typing import List, Optional
from datetime import datetime
from enum import Enum

class Semester(str, Enum):
    FALL = "fall"
    WINTER = "winter"
    SUMMER = "summer"

class SemesterType(str, Enum):
    GENERAL = "general"
    WEEKEND = "weekend"

class CourseType(str, Enum):
    LAB = "lab"
    THEORY = "theory"

class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    ONDUTY = "onduty"

class CourseResponse(BaseModel):
    id: UUID4
    semester: Semester 
    semester_type: str
    course_code: str
    course_name: str
    course_type: str
    faculty_name: str
    class_no: str
    classroom: Optional[str]
    time_slots: List[str]
    registered: bool

    class Config:
        from_attributes = True
        
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str
    avatar: Optional[str] = None

class UserAuth(UserCreate):
    id: UUID4

class UserResponse(UserBase):
    id: UUID4
    avatar: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class FacultyInfo(BaseModel):
    id: UUID4
    name: str
    school: str

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    semester: str
    semester_type: SemesterType
    course_code: str
    course_name: str
    course_type: CourseType
    class_number: str
    classroom_location: Optional[str]
    time_slots: List[str]
    faculty_school: str
    max_capacity: int

class CourseCreate(CourseBase):
    faculty_id: UUID4



class CourseWithRegistration(CourseResponse):
    registered: bool

class RegistrationBase(BaseModel):
    user_id: UUID4
    course_id: UUID4

class RegistrationResponse(RegistrationBase):
    id: UUID4
    registration_date: datetime
    is_active: bool

    class Config:
        from_attributes = True

class AttendanceBase(BaseModel):
    attendance_date: datetime
    time_slot: str
    status: AttendanceStatus
    remarks: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    user_id: UUID4
    course_id: UUID4

class AttendanceResponse(AttendanceBase):
    id: UUID4
    day_of_week: str
    course: CourseResponse
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class AttendanceSummary(BaseModel):
    course_id: UUID4
    course_name: str
    faculty: FacultyInfo
    classroom_location: Optional[str]
    time_slots: List[str]
    attendance_stats: dict

    class Config:
        from_attributes = True

class TokenData(BaseModel):
    email: Optional[str] = None

class UserData(BaseModel):
    id: UUID4
    email: EmailStr
    username: str
    avatar: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserData

class AuthForm(BaseModel):
    email: EmailStr
    password: str


class Course(BaseModel):
    id: UUID4
    semester: Semester
    semester_type: SemesterType
    course_code: str
    course_name: str
    course_type: CourseType
    class_no: str
    classroom: str
    time_slots: List[str]
    faculty_name: str
    faculty_school: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CourseInfo(BaseModel):
    id: UUID4
    semester: Semester
    semester_type: SemesterType
    course_code: str
    course_name: str
    course_type: CourseType
    faculty_name: str
    class_no: str
    classroom: str
    time_slots: List[str]
    present: int
    total: int
    percentage: float

    class Config:
        from_attributes = True
