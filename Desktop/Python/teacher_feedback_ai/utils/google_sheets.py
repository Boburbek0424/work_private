"""Google Sheets loading helpers.

This app uses the public CSV export method, so it does not need Google Cloud
credentials. The sheet must be shared so anyone with the link can view it.
"""

from __future__ import annotations

import re
from io import StringIO

import pandas as pd


SHEET_ID_PATTERN = re.compile(r"/spreadsheets/d/([a-zA-Z0-9-_]+)")
GID_PATTERN = re.compile(r"(?:gid=)([0-9]+)")


def google_sheet_url_to_csv_url(sheet_url: str) -> str:
    """Convert a normal Google Sheets URL into a CSV export URL."""
    if not sheet_url or not sheet_url.strip():
        raise ValueError("Please paste a Google Sheets link.")

    sheet_url = sheet_url.strip()

    if "docs.google.com/spreadsheets" not in sheet_url:
        raise ValueError("This does not look like a Google Sheets link.")

    sheet_match = SHEET_ID_PATTERN.search(sheet_url)
    if not sheet_match:
        raise ValueError("Could not find the Google Sheet ID in the link.")

    sheet_id = sheet_match.group(1)
    gid_match = GID_PATTERN.search(sheet_url)
    gid = gid_match.group(1) if gid_match else "0"

    return (
        f"https://docs.google.com/spreadsheets/d/{sheet_id}/export"
        f"?format=csv&gid={gid}"
    )


def load_public_google_sheet(sheet_url: str) -> pd.DataFrame:
    """Load a public Google Sheet into a Pandas DataFrame."""
    csv_url = google_sheet_url_to_csv_url(sheet_url)

    try:
        response = pd.read_csv(csv_url)
    except Exception as exc:
        raise RuntimeError(
            "Could not load the Google Sheet. Make sure it is public and the "
            "link points to a sheet that can be viewed by anyone with the link."
        ) from exc

    if response.empty:
        raise ValueError("The Google Sheet loaded successfully, but it is empty.")

    return response


def load_csv_text(csv_text: str) -> pd.DataFrame:
    """Load CSV text. Useful for tests or manual debugging."""
    return pd.read_csv(StringIO(csv_text))
