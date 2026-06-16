"""Configuration module - loads settings from .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# Bot token from BotFather
BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")

# Whether to include bots in the user tracking
INCLUDE_BOTS: bool = os.getenv("INCLUDE_BOTS", "false").lower() in ("true", "1", "yes")

# Telegram message character limit
MESSAGE_LIMIT: int = 4096

# Delay in seconds between batch messages to avoid spam limits
ANTI_SPAM_DELAY: float = float(os.getenv("ANTI_SPAM_DELAY", "1.5"))

# Database file path - defaults to ./data/ subdirectory to keep the database
# separate from source code and safe from accidental git clean or re-clone
_default_db_path = str(Path(__file__).resolve().parent / "data" / "bot_data.db")
DATABASE_PATH: str = os.getenv("DATABASE_PATH", _default_db_path)
