import os
import json
import dotenv
import enum
import base64
import jwt
import boto3
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from uuid import  uuid4

from pydantic import BaseModel, EmailStr, UUID4
from fastapi import Depends, HTTPException, status, APIRouter, Form, File, UploadFile, Request, Response
from fastapi.security import OAuth2PasswordBearer
from fastapi.encoders import jsonable_encoder
from passlib.context import CryptContext
from sqlalchemy import (
    create_engine, Column, Integer, String, ForeignKey, DateTime, Boolean, 
    UniqueConstraint, CheckConstraint, Text, Enum, and_, func, select
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, validates, Session
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from jwt.exceptions import PyJWTError

from app.database import Base, engine, SessionLocal

dotenv.load_dotenv()
variables = os.environ
KEY = "cwqedxqidxnedinxlkejdn"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class NoFaceException(Exception):
    pass

class SNSManager:
    def __init__(self):
        self.sns_client = boto3.client(
            'sns',
            aws_access_key_id=os.getenv("ACCESS_KEY"),
            aws_secret_access_key=os.getenv("SECRET_KEY"),
            region_name='ap-south-1'
        )
        self.topic = 'SoftwareUpdates'
        self.topic_arn = self.create_topic()

    def create_topic(self):
        try:
            response = self.sns_client.create_topic(Name=self.topic)
            return response['TopicArn']
        except self.sns_client.exceptions.TopicAlreadyExistsException:
            print(f"Topic {self.topic} already exists.")
        except Exception as e:
            print(f"Error creating topic: {e}")

    def subscribe_email(self, email):
        try:
            response = self.sns_client.subscribe(
                TopicArn=self.topic_arn,
                Protocol='email',
                Endpoint=email
            )
        except Exception as e:
            print(f"Error subscribing email: {e}")

    def publish_message(self, subject, message):
        try:
            response = self.sns_client.publish(
                TopicArn=self.topic_arn,
                Subject=subject,
                Message=message
            )
        except Exception as e:
            print(f"Error publishing message: {e}")

    def is_email_subscribed(self, email):
        response = self.sns_client.list_subscriptions_by_topic(TopicArn=self.topic_arn)
        for subscription in response['Subscriptions']:
            if subscription['Endpoint'] == email and subscription['Protocol'] == 'email':
                return True
        return False

class RekognitionManager:
    def __init__(self):
        self.rekognition = boto3.client(
            'rekognition',
            aws_access_key_id=os.getenv("ACCESS_KEY"),
            aws_secret_access_key=os.getenv("SECRET_KEY"),
            region_name='ap-south-1'
        )
        self.collection = 'identies'
        self.create_collection()

    def create_collection(self):
        try:
            response = self.rekognition.create_collection(CollectionId=self.collection)
            print(f"Collection {self.collection} created. ARN: {response['CollectionArn']}")
        except self.rekognition.exceptions.ResourceAlreadyExistsException:
            print(f"Collection {self.collection} already exists.")


    def index_face(self, image_bytes, user_id):
        response = self.rekognition.index_faces(
            CollectionId=self.collection,
            Image={'Bytes': image_bytes},
            ExternalImageId=user_id,
            DetectionAttributes=['ALL']
        )
        return response['FaceRecords'][0]['Face']['FaceId']

    def recognize_face(self, image_bytes):
        response = self.rekognition.search_faces_by_image(
            CollectionId=self.collection,
            Image={'Bytes': image_bytes},
            MaxFaces=1,
            FaceMatchThreshold=75
        )
        
        if response['FaceMatches']:
            return response['FaceMatches'][0]['Face']['ExternalImageId']
        else:
            return None

sns_manager = SNSManager()
rekognition_manager = RekognitionManager()

with open("app/config/slots.json", "r") as f:
    slot_map = json.load(f)

