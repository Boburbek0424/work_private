# AI Teacher Feedback Progress Tracker

A local Streamlit app that reads teaching observation feedback from a public Google Sheet, tracks progress scores, detects repeated strengths and weaknesses, and uses the OpenAI API to generate practical coaching advice.

## Features

- Loads a public Google Sheet through the CSV export method
- Converts a normal Google Sheets link into a CSV export URL automatically
- Cleans dates, score columns, and feedback text safely
- Shows dashboard metrics for observed lessons and OVR SCORE
- Displays individual and combined Plotly line charts
- Detects repeated feedback themes from written comments
- Generates AI progress summaries and next-lesson advice
- Runs locally in Visual Studio Code without Google Cloud credentials

## Install

Open a terminal in this folder:

```bash
cd teacher_feedback_ai
pip install -r requirements.txt
```

## Run

```bash
streamlit run app.py
```

Streamlit will open the app in your browser. If it does not open automatically, use the local URL shown in the terminal.

## Use Your Google Sheet

1. Open your Google Sheet.
2. Click **Share**.
3. Under **General access**, choose **Anyone with the link**.
4. Set the role to **Viewer**.
5. Copy the Google Sheet link.
6. Paste it into the app sidebar.
7. Click **Load feedback**.

The app uses the public CSV export URL, so you do not need Google Cloud credentials or a service account.

## Use OpenAI AI Coach

You can paste your OpenAI API key into the sidebar when the app is running.

You can also create a local `.env` file:

```bash
copy .env.example .env
```

Then edit `.env`:

```text
OPENAI_API_KEY=your_real_api_key_here
```

If the API key is missing, the dashboard and charts still work, but AI coaching is skipped.

## Expected Sheet Columns

The app looks for these columns:

- Date
- Group
- Lesson
- Topic
- Starter
- Warm-up Questions
- Teacher Session 1
- Teacher Session 2
- TGC
- TA
- RF
- EF
- C
- SE
- OVR SCORE

If some columns are missing, the app shows a warning and continues with the columns it can use.

## Example Google Sheet Link

```text
https://docs.google.com/spreadsheets/d/1KD7PwPWlHmzCpDKYDvX_wfLdJG3i1B2xNfq9EcgOW40/edit?usp=sharing
```
