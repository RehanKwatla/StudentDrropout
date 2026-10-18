import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app.config import settings

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client
