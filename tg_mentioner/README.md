# Telegram Tag All Bot

A Telegram bot that tracks group members and can mention/tag all of them at once. Useful for group announcements where you need to notify all active members.

## Features

- Automatically tracks users as they send messages in the group
- Mentions all tracked users with a single command
- Supports users without usernames (uses Telegram deep link mentions)
- Splits large mention lists into multiple messages to respect Telegram limits
- Anti-spam delay between batch messages
- Admin-only restrictions for sensitive commands
- Per-group user tracking (each group has its own list)
- SQLite database for persistent storage
- Docker support for easy deployment
- Ignores bots by default (configurable)

## Project Structure

```
tg_mentioner/
├── main.py              # Entry point
├── bot.py               # Application setup and handler registration
├── config.py            # Configuration loader (reads from .env)
├── database.py          # SQLite async database layer
├── handlers/
│   ├── __init__.py
│   ├── commands.py      # Command handlers (/tagall, /count, /clear, /start, /help)
│   └── tracker.py       # Message handler for tracking users
├── .env.example         # Environment variable template
├── .gitignore           # Git ignore rules
├── requirements.txt     # Python dependencies
├── Dockerfile           # Docker image definition
├── docker-compose.yml   # Docker Compose service definition
└── README.md            # This file
```

## Prerequisites

- Python 3.10 or higher
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token you receive
4. **Important**: Disable privacy mode so the bot can see all messages:
   - Send `/mybots` to BotFather
   - Select your bot
   - Go to "Bot Settings" > "Group Privacy"
   - Turn it OFF (so the bot can track all messages)

### 2. Clone and Configure

```bash
cd tg_mentioner

# Create your environment file from the template
cp .env.example .env

# Edit .env and add your bot token
nano .env  # or use any text editor
```

Your `.env` file should look like:
```
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
INCLUDE_BOTS=false
ANTI_SPAM_DELAY=1.5
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Bot

```bash
python main.py
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Create your .env file first (see step 2 above)
cp .env.example .env
# Edit .env with your bot token

# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Using Docker Directly

```bash
# Build the image
docker build -t tg-mentioner-bot .

# Run the container
docker run -d \
  --name tg_mentioner_bot \
  --env-file .env \
  -v tg_bot_data:/app/data \
  --restart unless-stopped \
  tg-mentioner-bot
```

## Available Commands

| Command | Description | Access |
|---------|-------------|--------|
| `/start` | Show welcome message and bot info | Everyone |
| `/help` | Show available commands and usage | Everyone |
| `/tagall` | Mention all tracked users | Admins only |
| `/count` | Show number of tracked users | Everyone |
| `/clear` | Clear the tracked users list | Admins only |

## How It Works

1. **Tracking**: The bot monitors all messages in the group. When a user sends any message, their information (user ID, username, first name, last name) is saved or updated in the database.

2. **Mentioning**: When an admin uses `/tagall`, the bot:
   - Retrieves all tracked users for the current chat
   - Formats mentions: `@username` for users with usernames, or `[Name](tg://user?id=...)` for users without
   - Splits mentions into batches that fit within Telegram's 4096-character message limit
   - Sends each batch with a configurable delay to avoid rate limiting

3. **Limitations**: Telegram bots cannot fetch the full member list of a group. The bot can only track users who have sent at least one message since the bot was added.

## Configuration

Environment variables (set in `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_TOKEN` | (required) | Your Telegram bot token from BotFather |
| `INCLUDE_BOTS` | `false` | Whether to include other bots in mentions |
| `ANTI_SPAM_DELAY` | `1.5` | Seconds to wait between batch messages |
| `DATABASE_PATH` | `bot_data.db` | Path to the SQLite database file |

## Database Schema

The bot uses SQLite with the following schema:

```sql
CREATE TABLE users (
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_bot BOOLEAN DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_id, user_id)
);
```

## Deployment Options

### Railway

1. Push your code to a GitHub repository
2. Connect your repo to [Railway](https://railway.app)
3. Add environment variable `BOT_TOKEN` in the Railway dashboard
4. Deploy

### Render

1. Push your code to a GitHub repository
2. Create a new "Background Worker" on [Render](https://render.com)
3. Set the start command to `python main.py`
4. Add environment variable `BOT_TOKEN`
5. Deploy

### VPS (DigitalOcean, Hetzner, etc.)

1. SSH into your server
2. Clone the repository
3. Use Docker Compose for the simplest deployment (see Docker section above)

## Troubleshooting

- **Bot not tracking users**: Make sure Group Privacy mode is disabled in BotFather settings
- **Permission errors**: Ensure the bot is added to the group and has permission to read messages
- **Admin commands not working**: The user must be a group admin or the group creator
- **Rate limiting**: Increase `ANTI_SPAM_DELAY` if you get rate-limited by Telegram

## License

This project is open source. Feel free to use and modify it as needed.
