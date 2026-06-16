"""Entry point for the Telegram mentioner bot."""

import asyncio
import logging
import sys

from database import init_db
from bot import create_application


def setup_logging() -> None:
    """Configure logging for the bot."""
    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        level=logging.INFO,
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )
    # Reduce noise from httpx/httpcore
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


async def main() -> None:
    """Initialize the database and start the bot."""
    setup_logging()
    logger = logging.getLogger(__name__)

    logger.info("Initializing database...")
    await init_db()

    logger.info("Starting bot...")
    application = create_application()

    # Run the bot until stopped
    await application.initialize()
    await application.start()
    await application.updater.start_polling(drop_pending_updates=True)

    logger.info("Bot is running. Press Ctrl+C to stop.")

    # Keep running until interrupted
    try:
        # Block forever until a signal is received
        await asyncio.Event().wait()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutting down...")
    finally:
        await application.updater.stop()
        await application.stop()
        await application.shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
