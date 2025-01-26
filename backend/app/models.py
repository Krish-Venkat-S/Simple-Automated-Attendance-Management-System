from app.common import *
from app.database import Base
import enum
from sqlalchemy import Column, String, DateTime, Enum, UniqueConstraint, ARRAY, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from uuid import uuid4

class Semester(enum.Enum):
    FALL = "fall"
    WINTER = "winter"
    summer = "summer"

class SemesterType(enum.Enum):
    GENERAL = "general"
    WEEKEND = "weekend"

class CourseType(enum.Enum):
    LAB = "lab"
    THEORY = "theory"

class AttendanceStatus(enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    EXCUSED = "excused"

class User(Base):
    """User model representing system users (students and faculty)"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    avatar = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    registrations = relationship("Registration", back_populates="user", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")

    @validates('email')
    def validate_email(self, key, email):
        if not '@' in email:
            raise ValueError("Invalid email address")
        return email.lower()

    def __repr__(self):
        return f"<User {self.username}>"

class Course(Base):
    """Course model representing academic courses"""
    __tablename__ = "courses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    semester = Column(Enum(Semester, name="semester"), nullable=False, index=True)  # e.g., "2024-1"
    semester_type = Column(Enum(SemesterType, name="semester_type"), nullable=False, index=True)
    course_code = Column(String(20), nullable=False, index=True)
    course_name = Column(String(255), nullable=False)
    course_type = Column(Enum(CourseType, name="course_type"), nullable=False, default=CourseType.THEORY)
    class_no = Column(String(20), nullable=False)
    classroom = Column(String(100), nullable=True)
    time_slots = Column(ARRAY(String), nullable=False)  # e.g., ["MON-1", "WED-2"]
    faculty_name = Column(String(100), nullable=False)  
    faculty_school = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    registrations = relationship("Registration", back_populates="course", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="course", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('semester', 'course_code', 'class_no', 
                        name='uq_course_semester_code_class'),
    )

    def __repr__(self):
        return f"<Course {self.course_code} - {self.class_no}>"

class Registration(Base):
    """Registration model representing student course enrollments"""
    __tablename__ = "registrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    reg_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="registrations")
    course = relationship("Course", back_populates="registrations")

    __table_args__ = (
        UniqueConstraint('user_id', 'course_id', name='uq_user_course_registration'),
    )

    def __repr__(self):
        return f"<Registration {self.user_id} - {self.course_id}>"

class Attendance(Base):
    """Attendance model tracking student attendance in courses"""
    __tablename__ = "attendances"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    attendance_date = Column(DateTime(timezone=True), nullable=False)
    day_of_week = Column(String(3), nullable=False)  # MON, TUE, etc.
    time_slot = Column(String(30), nullable=False)  # e.g., "09:00-10:30"
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.ABSENT)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="attendances")
    course = relationship("Course", back_populates="attendances")

    __table_args__ = (
        UniqueConstraint('user_id', 'course_id', 'attendance_date', 'time_slot',
                        name='uq_attendance_record'),
    )

    def __repr__(self):
        return f"<Attendance {self.user_id} - {self.course_id} - {self.attendance_date}>"