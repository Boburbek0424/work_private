"""Database module - SQLite async wrapper using aiosqlite with connection pooling."""

import logging
from datetime import datetime
from typing import Optional

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

# Module-level connection singleton
_connection: Optional[aiosqlite.Connection] = None


class DatabaseError(Exception):
    """Raised when a database operation fails."""

    pass


async def get_connection() -> aiosqlite.Connection:
    """Get or create the module-level database connection singleton.

    The connection uses WAL mode for better concurrency and is reused
    across all database operations to avoid per-call open/close overhead.
    """
    global _connection
    if _connection is None:
        _connection = await aiosqlite.connect(DATABASE_PATH)
        await _connection.execute("PRAGMA journal_mode=WAL")
        _connection.row_factory = aiosqlite.Row
    return _connection


async def close_connection() -> None:
    """Close the database connection. Call during application shutdown."""
    global _connection
    if _connection is not None:
        await _connection.close()
        _connection = None
        logger.info("Database connection closed.")


async def init_db() -> None:
    """Initialize the database and create tables if they don't exist."""
    try:
        db = await get_connection()
        await db.execute(CREATE_TABLE_SQL)
        await db.commit()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def add_user(
    chat_id: int,
    user_id: int,
    username: Optional[str],
    first_name: Optional[str],
    last_name: Optional[str],
    is_bot: bool,
) -> None:
    """Add or update a user in the database (upsert).

    Raises DatabaseError if the write fails, allowing callers to handle
    the failure appropriately.
    """
    try:
        db = await get_connection()
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
        raise DatabaseError(f"Failed to save user {user_id}: {e}") from e


async def get_users(chat_id: int) -> list[dict]:
    """Get all tracked users for a specific chat.

    Raises DatabaseError if the query fails, allowing callers to
    distinguish 'no users' from 'database unavailable'.
    """
    try:
        db = await get_connection()
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
        raise DatabaseError(f"Failed to read users for chat {chat_id}: {e}") from e


async def get_user_count(chat_id: int, exclude_bots: bool = False, exclude_user_id: Optional[int] = None) -> int:
    """Get the number of tracked users for a specific chat.

    Args:
        chat_id: The chat to count users for.
        exclude_bots: If True, exclude bot users from the count.
        exclude_user_id: If provided, exclude this specific user ID from the count.

    Raises DatabaseError if the query fails.
    """
    try:
        db = await get_connection()
        query = "SELECT COUNT(*) FROM users WHERE chat_id = ?"
        params: list = [chat_id]

        if exclude_bots:
            query += " AND is_bot = 0"

        if exclude_user_id is not None:
            query += " AND user_id != ?"
            params.append(exclude_user_id)

        cursor = await db.execute(query, params)
        row = await cursor.fetchone()
        return row[0] if row else 0
    except Exception as e:
        logger.error(f"Failed to get user count for chat {chat_id}: {e}")
        raise DatabaseError(f"Failed to count users for chat {chat_id}: {e}") from e


async def clear_users(chat_id: int) -> int:
    """Clear all stored users for a specific chat. Returns the number of deleted rows.

    Raises DatabaseError if the operation fails.
    """
    try:
        db = await get_connection()
        cursor = await db.execute(
            "DELETE FROM users WHERE chat_id = ?",
            (chat_id,),
        )
        await db.commit()
        return cursor.rowcount
    except Exception as e:
        logger.error(f"Failed to clear users for chat {chat_id}: {e}")
        raise DatabaseError(f"Failed to clear users for chat {chat_id}: {e}") from e
