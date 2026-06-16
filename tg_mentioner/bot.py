"""Bot application setup - creates Application, registers handlers."""

import logging

from telegram.ext import Application, CommandHandler, MessageHandler, filters

from config import BOT_TOKEN
from handlers.commands import (
    clear_command,
    count_command,
    help_command,
    start_command,
    tagall_command,
)
from handlers.tracker import track_user

logger = logging.getLogger(__name__)


async def error_handler(update: object, context) -> None:
    """Handle errors raised during handler execution."""
    logger.error(f"Exception while handling an update: {context.error}", exc_info=context.error)


def create_application() -> Application:
    """Create and configure the bot application with all handlers."""
    if not BOT_TOKEN:
        raise ValueError(
            "BOT_TOKEN is not set. Please create a .env file with your bot token. "
            "See .env.example for the template."
        )

    application = Application.builder().token(BOT_TOKEN).build()

    # Register command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("tagall", tagall_command))
    application.add_handler(CommandHandler("count", count_command))
    application.add_handler(CommandHandler("clear", clear_command))

    # Register the message tracker - runs on all text/non-command messages
    # Using a broad filter to track any user activity
    application.add_handler(
        MessageHandler(filters.ALL & ~filters.COMMAND, track_user)
    )

    # Register the error handler
    application.add_error_handler(error_handler)

    logger.info("Bot application created and handlers registered.")
    return application
