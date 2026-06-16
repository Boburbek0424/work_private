"""Database module - SQLite async wrapper using aiosqlite."""

import logging
from datetime import datetime

import aiosqlite

from config import DATABASE_PATH

logger = logging.getLogger(__name__)

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS users (
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_bot BOOLEAN DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_id, user_id)
)
"""


async def init_db() -> None:
    """Initialize the database and create tables if they don't exist."""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            await db.execute(CREATE_TABLE_SQL)
            await db.commit()
            logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def add_user(
    chat_id: int,
    user_id: int,
    username: str | None,
    first_name: str | None,
    last_name: str | None,
    is_bot: bool,
) -> None:
    """Add or update a user in the database (upsert)."""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            await db.execute(
                """
                INSERT INTO users (chat_id, user_id, username, first_name, last_name, is_bot, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(chat_id, user_id) DO UPDATE SET
                    username = excluded.username,
                    first_name = excluded.first_name,
                    last_name = excluded.last_name,
                    is_bot = excluded.is_bot,
                    updated_at = excluded.updated_at
                """,
                (chat_id, user_id, username, first_name, last_name, is_bot, datetime.utcnow()),
            )
            await db.commit()
    except Exception as e:
        logger.error(f"Failed to add/update user {user_id} in chat {chat_id}: {e}")


async def get_users(chat_id: int) -> list[dict]:
    """Get all tracked users for a specific chat."""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT user_id, username, first_name, last_name, is_bot FROM users WHERE chat_id = ?",
                (chat_id,),
            )
            rows = await cursor.fetchall()
            return [
                {
                    "user_id": row["user_id"],
                    "username": row["username"],
                    "first_name": row["first_name"],
                    "last_name": row["last_name"],
                    "is_bot": row["is_bot"],
                }
                for row in rows
            ]
    except Exception as e:
        logger.error(f"Failed to get users for chat {chat_id}: {e}")
        return []


async def get_user_count(chat_id: int) -> int:
    """Get the number of tracked users for a specific chat."""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            cursor = await db.execute(
                "SELECT COUNT(*) FROM users WHERE chat_id = ?",
                (chat_id,),
            )
            row = await cursor.fetchone()
            return row[0] if row else 0
    except Exception as e:
        logger.error(f"Failed to get user count for chat {chat_id}: {e}")
        return 0


async def clear_users(chat_id: int) -> int:
    """Clear all stored users for a specific chat. Returns the number of deleted rows."""
    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            cursor = await db.execute(
                "DELETE FROM users WHERE chat_id = ?",
                (chat_id,),
            )
            await db.commit()
            return cursor.rowcount
    except Exception as e:
        logger.error(f"Failed to clear users for chat {chat_id}: {e}")
        return 0
