"""Command handlers for the Telegram mentioner bot."""

import asyncio
import html
import logging

from telegram import Update
from telegram.ext import ContextTypes

from config import ANTI_SPAM_DELAY, INCLUDE_BOTS, MESSAGE_LIMIT
from database import DatabaseError, get_user_count, get_users, clear_users

logger = logging.getLogger(__name__)


async def is_admin(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Check if the user who sent the command is a group admin or creator.

    Returns True if the user is an admin, False if not. If the check fails
    due to a transient error (network issue, rate limit), informs the user
    and returns False.
    """
    chat = update.effective_chat
    user = update.effective_user

    if chat.type == "private":
        return True

    try:
        member = await context.bot.get_chat_member(chat.id, user.id)
        return member.status in ("administrator", "creator")
    except Exception as e:
        logger.error(f"Failed to check admin status: {e}")
        await update.message.reply_text(
            "Could not verify admin status due to a temporary error. Please try again in a moment."
        )
        return False


def format_mention(user: dict) -> str:
    """Format a user mention. Use @username if available, otherwise use tg://user link.

    Display names are HTML-escaped to prevent injection of malformed HTML
    that would cause Telegram's parser to reject the message.
    """
    if user["username"]:
        return f"@{user['username']}"
    else:
        display_name = user["first_name"] or "User"
        if user["last_name"]:
            display_name += f" {user['last_name']}"
        display_name = html.escape(display_name)
        return f'<a href="tg://user?id={user["user_id"]}">{display_name}</a>'


def split_into_batches(mentions: list[str], limit: int = MESSAGE_LIMIT) -> list[str]:
    """Split mentions into batches that fit within the Telegram message limit."""
    batches = []
    current_batch = ""

    for mention in mentions:
        # Account for space separator
        separator = " " if current_batch else ""
        if len(current_batch) + len(separator) + len(mention) > limit:
            if current_batch:
                batches.append(current_batch)
            current_batch = mention
        else:
            current_batch += separator + mention

    if current_batch:
        batches.append(current_batch)

    return batches


async def tagall_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /tagall command - mention all stored users (admin-only)."""
    if not await is_admin(update, context):
        return

    chat_id = update.effective_chat.id

    try:
        users = await get_users(chat_id)
    except DatabaseError:
        await update.message.reply_text(
            "Could not retrieve user list due to a database error. Please try again later."
        )
        return

    if not users:
        await update.message.reply_text(
            "No users tracked yet. Users will be added as they send messages in the group."
        )
        return

    # Filter out bots unless configured to include them
    if not INCLUDE_BOTS:
        users = [u for u in users if not u["is_bot"]]

    if not users:
        await update.message.reply_text("No non-bot users tracked yet.")
        return

    # Filter out the bot itself
    bot_id = context.bot.id
    users = [u for u in users if u["user_id"] != bot_id]

    mentions = [format_mention(user) for user in users]
    batches = split_into_batches(mentions)

    for i, batch in enumerate(batches):
        try:
            await update.message.reply_text(batch, parse_mode="HTML")
            # Add anti-spam delay between messages (except after the last one)
            if i < len(batches) - 1:
                await asyncio.sleep(ANTI_SPAM_DELAY)
        except Exception as e:
            logger.error(f"Failed to send batch {i + 1}: {e}")
            await update.message.reply_text(f"Error sending batch {i + 1}. Please try again later.")
            break


async def count_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /count command - show number of tracked users.

    Applies the same filters as /tagall (bot exclusion, self exclusion)
    so the reported count matches what /tagall would actually mention.
    """
    chat_id = update.effective_chat.id

    try:
        count = await get_user_count(
            chat_id,
            exclude_bots=not INCLUDE_BOTS,
            exclude_user_id=context.bot.id,
        )
    except DatabaseError:
        await update.message.reply_text(
            "Could not retrieve user count due to a database error. Please try again later."
        )
        return

    await update.message.reply_text(f"Currently tracking {count} mentionable user(s) in this chat.")


async def clear_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /clear command - clear stored users (admin-only)."""
    if not await is_admin(update, context):
        return

    chat_id = update.effective_chat.id

    try:
        deleted = await clear_users(chat_id)
    except DatabaseError:
        await update.message.reply_text(
            "Could not clear user list due to a database error. Please try again later."
        )
        return

    await update.message.reply_text(f"Cleared {deleted} user(s) from the tracking list.")


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command - show welcome message."""
    welcome_text = (
        "Hello! I'm the <b>Tag All Bot</b>.\n\n"
        "I track users who send messages in this group and can mention them all at once.\n\n"
        "<b>Available commands:</b>\n"
        "/tagall - Mention all tracked users (admin-only)\n"
        "/count - Show number of tracked users\n"
        "/clear - Clear tracked users list (admin-only)\n"
        "/help - Show this help message\n\n"
        "<b>How it works:</b>\n"
        "I automatically track users as they send messages in the group. "
        "When you need to notify everyone, use /tagall and I'll mention all tracked users."
    )
    await update.message.reply_text(welcome_text, parse_mode="HTML")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /help command - show usage instructions."""
    help_text = (
        "<b>Tag All Bot - Help</b>\n\n"
        "<b>Commands:</b>\n"
        "/tagall - Mention all tracked users (admin-only)\n"
        "/count - Show how many users are tracked\n"
        "/clear - Clear the tracked users list (admin-only)\n"
        "/start - Show welcome message\n"
        "/help - Show this help message\n\n"
        "<b>How tracking works:</b>\n"
        "- I automatically record users when they send messages\n"
        "- Users without a username get mentioned via their name with a direct link\n"
        "- Bots are ignored by default\n"
        "- The list is per-group (each group has its own list)\n\n"
        "<b>Notes:</b>\n"
        "- Telegram bots cannot fetch all group members automatically\n"
        "- Users must send at least one message to be tracked\n"
        "- Large mention lists are split into multiple messages to avoid limits"
    )
    await update.message.reply_text(help_text, parse_mode="HTML")
