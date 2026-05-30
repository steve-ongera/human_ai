# HUMANAI — Full-Stack AI Chat Platform

A production-ready ChatGPT-style application built with **Django REST Framework** (backend) and **React + Vite** (frontend), powered by the **OpenAI API**.

---

## Architecture

```
project/
├── backend/
│   ├── chat/
│   │   ├── models.py          # All Django models
│   │   ├── serializers.py     # DRF serializers
│   │   ├── views.py           # All views & API logic
│   │   └── urls.py            # App-level URL conf
│   ├── config/
│   │   ├── settings.py        # Django settings
│   │   └── urls.py            # Root URL conf  (main_urls.py)
│   ├── manage.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx            # React entry point
        ├── App.jsx             # Router + layout
        ├── context/
        │   └── AuthContext.jsx # JWT auth state
        ├── services/
        │   └── api.js          # All API calls
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── MessageBubble.jsx
        │   ├── ChatInput.jsx
        │   └── ModelSelector.jsx
        └── pages/
            ├── AuthPage.jsx    # Login / Register
            ├── ChatPage.jsx    # Main chat UI
            ├── AgentsPage.jsx  # Custom agents
            ├── KnowledgePage.jsx # RAG knowledge bases
            ├── UsagePage.jsx   # Token usage analytics
            └── SettingsPage.jsx # User preferences
```

---

## Backend Setup

### 1. Prerequisites

- Python 3.11+
- pip

### 2. Install dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers openai python-dotenv Pillow
```

**Full `requirements.txt`:**
```
django>=4.2
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
openai>=1.30
python-dotenv>=1.0
Pillow>=10.0
```

### 3. Environment variables

Create `backend/.env`:
```env
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
OPENAI_API_KEY=sk-...
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3
```

### 4. Configure `settings.py`

The file is at `backend/settings.py`. Update `ROOT_URLCONF` to match your project name (default: `config.urls`).

### 5. Wire up the root URLs

In your project's `config/urls.py` (rename `main_urls.py`):
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/",   include("chat.urls")),
]
```

### 6. Run migrations & start

```bash
python manage.py migrate
python manage.py createsuperuser   # optional
python manage.py runserver
```

The API is available at `http://localhost:8000/api/`.

---

## Frontend Setup

### 1. Prerequisites

- Node.js 18+

### 2. Install & run

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. Environment variable (optional)

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

The Vite proxy in `vite.config.js` already forwards `/api` → Django, so this is only needed for production builds.

---

## API Overview

| Group | Endpoint | Description |
|---|---|---|
| Auth | `POST /api/auth/register/` | Create account |
| Auth | `POST /api/auth/login/` | Get JWT tokens |
| Auth | `POST /api/auth/logout/` | Blacklist refresh token |
| Auth | `GET/PATCH /api/auth/me/` | Profile |
| Chat | `POST /api/chat/completions/` | Non-streaming completion |
| Chat | `POST /api/chat/stream/` | SSE streaming completion |
| Chat | `POST /api/chat/regenerate/` | Regenerate last reply |
| Conversations | `GET/POST /api/conversations/` | List / create |
| Conversations | `GET/PATCH/DELETE /api/conversations/{id}/` | Detail |
| Messages | `GET /api/conversations/{id}/messages/` | List messages |
| Agents | `GET/POST /api/agents/` | Custom agents |
| Knowledge | `GET/POST /api/knowledge-bases/` | RAG stores |
| Models | `GET /api/models/` | Registered AI models |
| Usage | `GET /api/usage/` | Token analytics |
| Preferences | `GET/PATCH /api/preferences/` | User settings |

All endpoints (except register, login, shared conversations) require `Authorization: Bearer <access_token>`.

---

## Key Features

- **Streaming chat** — real-time token streaming via Server-Sent Events
- **JWT auth** — access + refresh tokens with auto-rotation and blacklisting
- **Model registry** — register any OpenAI-compatible model name (gpt-4o, gpt-4-turbo, etc.)
- **Custom agents** — system-prompt personas with optional knowledge base attachment
- **RAG knowledge bases** — document stores linkable to conversations
- **Token usage analytics** — per-user, per-model, per-day tracking
- **Conversation management** — pin, archive, share, folder organization
- **User preferences** — theme, font size, memory toggle, custom instructions

---

## Production Notes

- Set `DEBUG=False` and a strong `DJANGO_SECRET_KEY` in `.env`
- Use PostgreSQL (`DB_ENGINE=django.db.backends.postgresql`)
- Serve Django via Gunicorn + Nginx
- Build the frontend: `npm run build` → serve `dist/` statically
- Use Redis + Celery for async jobs (embeddings, fine-tuning)
- Store media files on S3 (update `DEFAULT_FILE_STORAGE`)