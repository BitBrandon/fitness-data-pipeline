# Fitness Data Pipeline

Personal automation system that collects fitness and health data from different sources and generates insights about training, recovery and daily performance.

The goal of this project is to build a **personal quantified-self platform** using APIs, automation workflows and AI-powered summaries.

---

# Project Goal

Create an automated pipeline that gathers data from:

• gym workouts
• body weight measurements
• sleep and recovery metrics (future)
• nutrition data (future)

and transforms them into structured datasets for analysis.

---

# Architecture

```
Data Sources
────────────
Hevy (workouts)
Smart scale (weight)
Smart ring (future)

↓

Python ETL Scripts

↓

Google Sheets (cloud storage)

↓

Analysis Layer

↓

AI Assistant / Dashboard
```

---

# First Version (MVP)

The first version of the system focuses on:

• extracting workout data from Hevy API
• storing data automatically in Google Sheets
• tracking body weight progression

---

# Future Features

• sleep and recovery tracking
• nutrition logging
• AI generated daily summaries
• automation workflows using n8n
• voice assistant integration

---

# Tech Stack

Core

* Python
* REST APIs
* Pandas

Storage

* Google Sheets API

Automation (future)

* n8n
* Home Assistant

Analysis

* Python data analysis
* AI summarization

---

# Why This Project

This project combines:

• automation
• APIs
• data engineering
• personal analytics

It is designed both as a **personal tool** and a **technical portfolio project**.

---

# Author

Brandon

Technical consultant interested in automation, integrations and backend systems.
