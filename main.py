import sys
import os

# Ensure the project root is in Python's path
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import app
