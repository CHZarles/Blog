from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from database import Base
import datetime

class Blog(Base):
    __tablename__ = 'blogs'
    id = Column(Integer, primary_key=True)
    title = Column(String(50), unique=True)
    content = Column(Text)
    category = Column(String(50))
    tags = Column(String(200))
    created_at = Column(DateTime, default=datetime.datetime.now)
    updated_at = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)

    def __init__(self, title=None, content=None, category=None, tags=None):
        self.title = title
        self.content = content
        self.category = category
        self.tags = tags

    def to_dict(self, with_content=False):
        data = {
            'id': self.id,
            'title': self.title,
            'category': self.category,
            'tags': self.tags,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        if with_content:
            data['content'] = self.content
        return data

class Resume(Base):
    __tablename__ = 'resume'
    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    title = Column(String(200))
    summary = Column(Text)
    github_username = Column(String(100))
    education = Column(JSON)
    location = Column(String(100))
    experience = Column(JSON)
    projects = Column(JSON)
    skills = Column(JSON)
    contact = Column(JSON)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "title": self.title,
            "summary": self.summary,
            "github_username": self.github_username,
            "education": self.education,
            "location": self.location,
            "experience": self.experience,
            "projects": self.projects,
            "skills": self.skills,
            "contact": self.contact,
        }