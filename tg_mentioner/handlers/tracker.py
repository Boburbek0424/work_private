"""Message tracker handler - tracks users who send messages in the group."""

import logging

from telegram import Update
from telegram.ext import ContextTypes

from config import INCLUDE_BOTS
from database import add_user

logger = logging.getLogger(__name__)


async def track_user(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Track a user when they send a message in the group.

    This handler runs on every message and updates the user's info in the database.
    Bots are ignored unless INCLUDE_BOTS is set to True.
    """
    # Get message from either regular message or edited message
    message = update.effective_message
    if message is None:
        return

    user = message.from_user
    if user is None:
        return

    chat = message.chat
    if chat is None:
        return

    # Only track in group/supergroup chats
    if chat.type not in ("group", "supergroup"):
        return

    # Skip bots unless configured to include them
    if user.is_bot and not INCLUDE_BOTS:
        return

    try:
        await add_user(
            chat_id=chat.id,
            user_id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            is_bot=user.is_bot,
        )
        logger.debug(f"Tracked user {user.id} ({user.username or user.first_name}) in chat {chat.id}")
    except Exception as e:
        logger.error(f"Error tracking user {user.id} in chat {chat.id}: {e}")
