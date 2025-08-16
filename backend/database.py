from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

# Use a path relative to this file for the SQLite DB so the repo is portable
db_path = os.path.join(os.path.dirname(__file__), 'instance', 'blog.sqlite')
db_abs_path = os.path.abspath(db_path)
# Ensure the directory for the SQLite file exists. If the repo was cloned
# without the `instance` folder, creating it here prevents "unable to open"
db_dir = os.path.dirname(db_abs_path)
os.makedirs(db_dir, exist_ok=True)

# Create engine after ensuring the directory exists
engine = create_engine(f"sqlite:///{db_abs_path}")
db_session = scoped_session(sessionmaker(autocommit=False,
                                         autoflush=False,
                                         bind=engine))
Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    # import models
    from models import Base
    Base.metadata.create_all(bind=engine)
