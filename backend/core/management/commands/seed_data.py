"""
core/management/commands/seed_data.py

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear       # wipe and re-seed
    python manage.py seed_data --users 50    # override default counts

Strategy: bulk_create everywhere possible; only fall back to save() when
signals or custom logic require it.
"""

from __future__ import annotations

import random
import uuid
import hashlib
import struct
from datetime import date, timedelta
from itertools import cycle

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

# ── import all models ──────────────────────────────────────────────────────────
from core.models import (
    Agent,
    AIModel,
    Attachment,
    Conversation,
    ConversationFolder,
    Feedback,
    KnowledgeBase,
    KnowledgeDocument,
    Message,
    PromptTemplate,
    TrainingDataset,
    TrainingSample,
    UsageRecord,
    User,
    UserPreference,
)

# ══════════════════════════════════════════════════════════════════════════════
# STATIC FIXTURES
# ══════════════════════════════════════════════════════════════════════════════

AI_MODELS = [
    dict(name="llm-nano-v1",    display_name="NanoLM 1.0",      model_type="causal_lm",  version="1.0.0", context_length=2048,  max_output_tokens=512,  is_default=False, description="Lightweight model for quick responses."),
    dict(name="llm-base-v1",    display_name="BaseLM 1.0",      model_type="causal_lm",  version="1.0.0", context_length=4096,  max_output_tokens=2048, is_default=False, description="General-purpose base language model."),
    dict(name="llm-base-v2",    display_name="BaseLM 2.0",      model_type="causal_lm",  version="2.0.0", context_length=8192,  max_output_tokens=4096, is_default=True,  description="Improved general-purpose model with longer context."),
    dict(name="llm-pro-v1",     display_name="ProLM 1.0",       model_type="causal_lm",  version="1.0.0", context_length=16384, max_output_tokens=8192, is_default=False, description="High-capability model for complex reasoning."),
    dict(name="llm-code-v1",    display_name="CodeLM 1.0",      model_type="causal_lm",  version="1.0.0", context_length=8192,  max_output_tokens=4096, is_default=False, description="Specialized for code generation and review."),
    dict(name="llm-rag-v1",     display_name="RAGLM 1.0",       model_type="rag",        version="1.0.0", context_length=16384, max_output_tokens=4096, is_default=False, description="Retrieval-augmented generation model."),
    dict(name="llm-agent-v1",   display_name="AgentLM 1.0",     model_type="agent",      version="1.0.0", context_length=32768, max_output_tokens=8192, is_default=False, description="Agentic model with tool-use capabilities."),
    dict(name="enc-bert-v1",    display_name="BERT Encoder 1.0",model_type="encoder_only",version="1.0.0",context_length=512,   max_output_tokens=0,    is_default=False, description="Encoder-only model for embeddings and classification."),
    dict(name="seq2seq-t5-v1",  display_name="T5 Seq2Seq 1.0",  model_type="seq2seq",    version="1.0.0", context_length=1024,  max_output_tokens=512,  is_default=False, description="Sequence-to-sequence model for translation/summarisation."),
    dict(name="llm-vision-v1",  display_name="VisionLM 1.0",    model_type="causal_lm",  version="1.0.0", context_length=8192,  max_output_tokens=4096, is_default=False, description="Multimodal model supporting images and text."),
]

PROMPT_TEMPLATES = [
    dict(name="Python Expert",       category="coding",       is_public=True,  content="You are an expert Python developer. Write clean, PEP-8-compliant, well-documented code. Include type hints and docstrings. Suggest tests where appropriate.",  description="Specialized assistant for Python development."),
    dict(name="SQL Analyst",         category="coding",       is_public=True,  content="You are a senior SQL analyst. Write optimised queries. Prefer CTEs over subqueries. Always explain the execution plan for complex queries.",                        description="Expert SQL query writing and optimisation."),
    dict(name="DevOps Engineer",     category="coding",       is_public=True,  content="You are a senior DevOps engineer specialising in Kubernetes, Terraform, and CI/CD. Provide infrastructure-as-code examples and follow security best practices.",    description="DevOps and cloud infrastructure guidance."),
    dict(name="Technical Writer",    category="writing",      is_public=True,  content="You are a precise technical writer. Structure documentation clearly with headings, bullet points, and code examples. Target developer audiences.",                  description="Clear technical documentation and guides."),
    dict(name="Creative Writer",     category="writing",      is_public=True,  content="You are a creative writing coach. Help with storytelling, character development, dialogue, and narrative structure. Provide constructive critique.",               description="Creative writing assistance and coaching."),
    dict(name="Executive Summariser",category="writing",      is_public=True,  content="Summarise content into crisp executive summaries: key points, decisions required, and next steps. Maximum 200 words unless instructed otherwise.",                  description="Concise executive-level summaries."),
    dict(name="Data Scientist",      category="data",         is_public=True,  content="You are a senior data scientist. Recommend appropriate statistical methods and ML models. Provide Python (pandas/sklearn/pytorch) code snippets.",                   description="Data analysis and machine-learning guidance."),
    dict(name="Research Assistant",  category="research",     is_public=True,  content="You are a rigorous research assistant. Cite sources, distinguish fact from inference, and present balanced perspectives. Flag areas of uncertainty.",                description="Structured research and literature support."),
    dict(name="Socratic Tutor",      category="education",    is_public=True,  content="You are a Socratic tutor. Guide learners through discovery with probing questions rather than direct answers. Adapt difficulty to the learner's level.",            description="Inquiry-based learning facilitation."),
    dict(name="Product Manager",     category="business",     is_public=True,  content="You are an experienced product manager. Frame problems in terms of user value, business impact, and feasibility. Use frameworks like RICE, Jobs-to-be-done.",       description="Product strategy and roadmap support."),
    dict(name="Legal Drafter",       category="legal",        is_public=False, content="You are a legal drafting assistant. Produce precise, plain-English contract language. Flag ambiguities. Do not provide legal advice — label all output as draft only.", description="Contract and legal document drafting."),
    dict(name="Financial Analyst",   category="finance",      is_public=False, content="You are a CFA-level financial analyst. Perform ratio analysis, DCF modelling, and scenario planning. Show all workings. Do not provide investment advice.",         description="Financial modelling and analysis."),
    dict(name="Customer Support",    category="support",      is_public=True,  content="You are an empathetic customer support agent. Acknowledge the customer's issue, apologise sincerely, offer a clear resolution path, and follow up proactively.",    description="Empathetic and effective customer support."),
    dict(name="Marketing Copywriter",category="marketing",    is_public=True,  content="You are a conversion-focused copywriter. Write compelling headlines, CTAs, and body copy. Use AIDA and PAS frameworks. A/B-test-friendly phrasing preferred.",      description="High-converting marketing copy."),
    dict(name="Cybersecurity Advisor",category="security",    is_public=True,  content="You are a senior cybersecurity advisor (CISSP-level). Evaluate risks, recommend controls aligned to NIST CSF, and produce threat models using STRIDE.",           description="Cybersecurity risk and architecture advice."),
]

TRAINING_DATASETS = [
    dict(name="General QA v1",            format="jsonl",   num_samples=120000, description="Broad question-answer pairs covering science, history, and culture."),
    dict(name="Code Instruction v2",       format="jsonl",   num_samples=85000,  description="Coding tasks with Python, JS, SQL, Bash solutions."),
    dict(name="Summarisation Corpus",      format="jsonl",   num_samples=45000,  description="Long-form articles paired with human-written summaries."),
    dict(name="Dialogue & Roleplay",       format="jsonl",   num_samples=60000,  description="Multi-turn conversational data for chat tuning."),
    dict(name="Legal Contracts Corpus",    format="jsonl",   num_samples=15000,  description="Anonymised contract clauses with plain-English explanations."),
    dict(name="Medical QA (PubMed)",       format="jsonl",   num_samples=30000,  description="Medical question-answer pairs derived from PubMed abstracts."),
    dict(name="Financial Reports",         format="parquet", num_samples=8000,   description="10-K / 10-Q excerpts with analyst annotations."),
    dict(name="Math & Reasoning",          format="jsonl",   num_samples=50000,  description="Grade-school to olympiad-level maths problems with step-by-step solutions."),
    dict(name="Multilingual Pairs (OPUS)", format="csv",     num_samples=200000, description="Parallel sentences across 12 languages for translation fine-tuning."),
    dict(name="Creative Writing Prompts",  format="txt",     num_samples=20000,  description="Creative story prompts paired with high-quality continuations."),
]

KNOWLEDGE_BASES = [
    dict(name="Company Handbook",        description="HR policies, benefits, onboarding, and company culture documents.", is_public=False),
    dict(name="Product Documentation",   description="Full product docs, API reference, and integration guides.",         is_public=True),
    dict(name="Engineering Runbooks",    description="Operational runbooks, incident playbooks, and SRE guides.",         is_public=False),
    dict(name="Legal & Compliance",      description="GDPR, SOC 2, and internal legal policies.",                        is_public=False),
    dict(name="Sales Enablement",        description="Pitch decks, battle cards, case studies, and pricing sheets.",     is_public=False),
    dict(name="Research Papers",         description="Curated ML / AI research papers with summaries.",                  is_public=True),
    dict(name="Customer FAQ",            description="Common support questions and their vetted answers.",               is_public=True),
    dict(name="Financial Reports KB",    description="Quarterly earnings summaries and financial analysis.",             is_public=False),
]

KNOWLEDGE_DOCS_PER_BASE = [
    dict(title="Introduction",                   content="This document provides an overview and getting-started guide for new users. It covers installation, authentication, and first steps."),
    dict(title="Architecture Overview",          content="The system uses a microservices architecture deployed on Kubernetes. Key services include the API gateway, inference server, and vector store."),
    dict(title="Authentication & Security",      content="All API requests must include a Bearer token in the Authorization header. Tokens expire after 24 hours and can be refreshed via /auth/refresh."),
    dict(title="Rate Limits",                    content="Free tier: 60 requests/min. Plus: 500/min. Team: 2000/min. Enterprise: custom. Headers X-RateLimit-Remaining and X-RateLimit-Reset are returned on every response."),
    dict(title="Error Codes Reference",          content="4xx codes indicate client errors (400 Bad Request, 401 Unauthorized, 429 Too Many Requests). 5xx codes are server-side. Retry 503/504 with exponential backoff."),
    dict(title="Frequently Asked Questions",     content="Q: Can I export my data? A: Yes, via Settings → Export. Q: Is my data used for training? A: Only if you opt in. Q: How do I cancel? A: Settings → Billing → Cancel plan."),
    dict(title="Changelog v2.0",                 content="v2.0 introduces streaming responses, function calling, improved context handling, and a new vector search endpoint. Breaking changes: /v1/complete renamed to /v1/chat."),
    dict(title="Privacy Policy Summary",         content="We collect usage telemetry and conversation metadata. Conversation content is encrypted at rest (AES-256) and in transit (TLS 1.3). Data is retained for 90 days by default."),
]

CONVERSATION_TOPICS = [
    ("Explain transformer architecture", "technical"),
    ("Help me debug this Python script", "coding"),
    ("Write a cover letter for a senior engineer role", "writing"),
    ("Summarise the key points of GDPR", "legal"),
    ("Plan a 7-day trip to Japan", "travel"),
    ("Analyse this financial statement", "finance"),
    ("Create a marketing campaign for a SaaS product", "marketing"),
    ("Explain quantum computing in simple terms", "education"),
    ("Help me write unit tests for my API", "coding"),
    ("Draft an NDA for a contractor", "legal"),
    ("What is retrieval-augmented generation?", "technical"),
    ("Help me refactor this React component", "coding"),
    ("Write a blog post about AI trends in 2025", "writing"),
    ("Build a SQL query to find top customers", "data"),
    ("Explain the STAR interview technique", "hr"),
    ("Create a product roadmap for Q3", "product"),
    ("Help me understand my blood test results", "health"),
    ("Debug my Kubernetes deployment", "devops"),
    ("Translate this text to French", "language"),
    ("Create a data visualisation plan", "data"),
    ("Write a Python web scraper", "coding"),
    ("Explain chain-of-thought prompting", "technical"),
    ("Help me negotiate my salary", "career"),
    ("Build a recommendation system", "ml"),
    ("Write a press release for our product launch", "marketing"),
    ("Explain Bayesian inference", "statistics"),
    ("Help me structure my thesis introduction", "education"),
    ("Audit this Terraform configuration", "devops"),
    ("Create a customer journey map", "product"),
    ("Explain the CAP theorem", "technical"),
]

USER_MESSAGES = [
    "Can you explain this in simpler terms?",
    "Give me a concrete example.",
    "What are the trade-offs here?",
    "How would you implement this in Python?",
    "Can you make that shorter?",
    "What are the best practices?",
    "Is there a more efficient approach?",
    "Can you provide code for that?",
    "What could go wrong with this approach?",
    "How does this compare to the alternative?",
    "Please elaborate on that last point.",
    "Can you format this as a bullet list?",
    "What's your recommendation?",
    "How do I test this?",
    "Can you write the documentation for this?",
]

ASSISTANT_MESSAGES = [
    "Great question! Let me break that down step by step. First, it's important to understand the core concept, then we can look at how it applies practically.",
    "Certainly. The key trade-off here is between simplicity and performance. For most use cases, the simpler approach is preferable unless you're operating at scale.",
    "Here's a concrete Python implementation:\n\n```python\ndef process(data: list[dict]) -> list:\n    return [item for item in data if item.get('active')]\n```\n\nThis uses a list comprehension for readability and performance.",
    "The best practices in this area include: (1) always validate input, (2) use dependency injection for testability, (3) keep functions small and single-purpose, and (4) document edge cases.",
    "To summarise: the approach works well for small datasets but may encounter memory issues beyond ~1M records. Consider streaming or chunked processing for larger workloads.",
    "There are three main alternatives: (a) the in-process approach I described, (b) an async queue-based pattern, and (c) a distributed map-reduce pipeline. Your choice depends on latency requirements and team expertise.",
    "The documentation would look like this:\n\n```\n## Function: process_records\n**Parameters:** records (List[Dict]) – input data\n**Returns:** List of processed items\n**Raises:** ValueError if records is empty\n```",
    "Testing strategy: write unit tests for the happy path, edge cases (empty input, null values), and error conditions. Use `pytest` with `unittest.mock` for external dependencies.",
    "Potential failure modes: network timeouts, malformed JSON payloads, race conditions under concurrent load, and schema drift when the upstream API changes. Add circuit breakers and schema validation.",
    "My recommendation is to start with the simpler solution, instrument it with metrics (latency, error rate, throughput), and optimise only once you have real data showing where the bottleneck is.",
]

AGENT_DEFINITIONS = [
    dict(name="Codex",          description="Expert programming assistant for all languages.", system_prompt="You are Codex, an expert software engineer. Write clean, efficient, well-tested code. Always include type annotations and docstrings.",           tools_config=["code_interpreter", "file_reader"], is_public=True),
    dict(name="Aria",           description="Professional writing and editing assistant.",     system_prompt="You are Aria, a skilled writer and editor. Help craft clear, compelling, and grammatically perfect prose for any audience.",                        tools_config=["web_search"],                      is_public=True),
    dict(name="DataBot",        description="Data analysis and visualisation specialist.",     system_prompt="You are DataBot, a senior data analyst. Analyse datasets, suggest visualisations, and write Python/SQL for data tasks.",                           tools_config=["code_interpreter", "file_reader"],  is_public=True),
    dict(name="LexAI",          description="Legal document review and drafting assistant.",   system_prompt="You are LexAI, a legal drafting assistant. Review and draft legal documents. Always label output as DRAFT. Do not give legal advice.",              tools_config=[],                                  is_public=False),
    dict(name="MarketingMind",  description="Marketing copy and campaign planning.",           system_prompt="You are MarketingMind, a conversion-focused marketing strategist. Create campaigns, copy, and positioning using AIDA, PAS, and other frameworks.", tools_config=["web_search"],                      is_public=True),
    dict(name="ResearchOwl",    description="Deep research and academic literature assistant.",system_prompt="You are ResearchOwl, an academic research assistant. Synthesise literature, cite sources, and present balanced, evidence-based answers.",           tools_config=["web_search", "knowledge_base"],     is_public=True),
    dict(name="OpsBot",         description="DevOps, SRE, and cloud infrastructure guide.",   system_prompt="You are OpsBot, a senior SRE. Help with Kubernetes, Terraform, CI/CD, monitoring, and incident response. Follow security-first principles.",        tools_config=["code_interpreter", "file_reader"],  is_public=True),
    dict(name="FinanceGuru",    description="Financial analysis and modelling assistant.",     system_prompt="You are FinanceGuru, a CFA-level analyst. Perform financial analysis, build models, and explain concepts. Do not give investment advice.",           tools_config=["code_interpreter"],                is_public=False),
]

FOLDER_NAMES = [
    "Work Projects", "Personal", "Research", "Code Reviews",
    "Client Work", "Learning", "Side Projects", "Archive",
    "Team Docs", "Experiments",
]

FOLDER_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#3b82f6", "#8e8ea0",
]

PLANS = ["free", "free", "free", "plus", "plus", "team", "team", "enterprise"]
THEMES = ["dark", "dark", "light", "system"]
FONT_SIZES = ["small", "medium", "medium", "large"]
LANGUAGES = ["en", "en", "en", "fr", "de", "es", "ja", "pt"]

FIRST_NAMES = [
    "Alice", "Bob", "Carol", "David", "Emma", "Frank", "Grace", "Henry",
    "Iris", "James", "Kate", "Liam", "Maya", "Noah", "Olivia", "Paul",
    "Quinn", "Rachel", "Sam", "Tara", "Uma", "Victor", "Wendy", "Xander",
    "Yara", "Zoe", "Aaron", "Beth", "Carlos", "Diana", "Ethan", "Fiona",
    "George", "Hannah", "Ivan", "Julia", "Kevin", "Laura", "Mike", "Nina",
    "Oscar", "Petra", "Rafael", "Sofia", "Tom", "Ursula", "Vera", "Will",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Jackson",
    "White", "Harris", "Martin", "Thompson", "Young", "Robinson", "Clark",
    "Lewis", "Lee", "Walker", "Hall", "Allen", "Wright", "King", "Scott",
    "Adams", "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez",
    "Roberts", "Turner", "Phillips", "Campbell", "Evans", "Edwards", "Collins",
]

DOMAINS = [
    "gmail.com", "yahoo.com", "outlook.com", "proton.me",
    "company.io", "techcorp.com", "startup.dev", "enterprise.com",
]

MIME_TYPES = [
    ("application/pdf", ".pdf"),
    ("image/png", ".png"),
    ("image/jpeg", ".jpg"),
    ("text/plain", ".txt"),
    ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"),
    ("text/csv", ".csv"),
    ("application/json", ".json"),
]

SAMPLE_PROMPTS = [
    ("Explain recursion", "Recursion is a function calling itself with a simpler input. Base case stops infinite calls.", "You are a helpful tutor."),
    ("What is gradient descent?", "Gradient descent minimises a loss function by iteratively moving in the direction of steepest descent.", "You are an ML tutor."),
    ("Write a hello world in Rust", "fn main() { println!(\"Hello, world!\"); }", "You are a coding assistant."),
    ("Summarise the French Revolution", "The French Revolution (1789–1799) overthrew the monarchy, established a republic, and radically changed French society.", ""),
    ("What is a p-value?", "A p-value measures the probability of obtaining results at least as extreme as observed, assuming the null hypothesis is true.", ""),
    ("Explain TCP vs UDP", "TCP provides reliable, ordered delivery; UDP is faster but connectionless with no guaranteed delivery.", "You are a networking expert."),
    ("Write a haiku about coding", "Silent compile runs / Bug hides in the nested loop / Coffee grows cold, waits", ""),
    ("What is Docker?", "Docker is a platform for packaging applications into containers that run consistently across environments.", "You are a DevOps expert."),
]


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _fake_embedding(text: str, dim: int = 128) -> bytes:
    """Deterministic fake embedding as packed floats."""
    digest = hashlib.sha256(text.encode()).digest()
    seed = int.from_bytes(digest[:4], "big")
    rng = random.Random(seed)
    values = [rng.gauss(0, 1) for _ in range(dim)]
    return struct.pack(f"{dim}f", *values)


def _rand_date_in_past(days: int = 365) -> date:
    return (timezone.now() - timedelta(days=random.randint(0, days))).date()


def _rand_dt_in_past(days: int = 365):
    return timezone.now() - timedelta(
        days=random.randint(0, days),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )


# ══════════════════════════════════════════════════════════════════════════════
# COMMAND
# ══════════════════════════════════════════════════════════════════════════════

class Command(BaseCommand):
    help = "Seed the database with realistic prototype data (fast bulk_create)."

    def add_arguments(self, parser):
        parser.add_argument("--clear",         action="store_true",  help="Delete existing data before seeding.")
        parser.add_argument("--users",         type=int, default=40, help="Number of regular users (default 40).")
        parser.add_argument("--conversations", type=int, default=6,  help="Conversations per user (default 6).")
        parser.add_argument("--messages",      type=int, default=10, help="Messages per conversation (default 10).")
        parser.add_argument("--samples",       type=int, default=20, help="Training samples per dataset (default 20).")
        parser.add_argument("--usage-days",    type=int, default=90, help="Days of usage records to seed (default 90).")

    # ──────────────────────────────────────────────────────────────────────────
    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("🌱  Starting seed…"))

        if options["clear"]:
            self._clear_data()

        with transaction.atomic():
            ai_models   = self._seed_ai_models()
            admin       = self._seed_admin()
            templates   = self._seed_prompt_templates(admin)
            datasets    = self._seed_training_datasets(admin)
            self._seed_training_samples(datasets, options["samples"])
            kbs         = self._seed_knowledge_bases(ai_models, admin)
            self._seed_knowledge_docs(kbs)
            users       = self._seed_users(options["users"])
            self._seed_user_preferences(users, ai_models)
            folders     = self._seed_folders(users)
            agents      = self._seed_agents(users, ai_models, kbs)
            convs       = self._seed_conversations(users, ai_models, kbs, folders, options["conversations"])
            messages    = self._seed_messages(convs, ai_models, options["messages"])
            self._seed_attachments(messages, convs, users)
            self._seed_feedback(messages, users)
            self._seed_usage_records(users, ai_models, options["usage_days"])

        self._print_summary(users, convs, messages)

    # ──────────────────────────────────────────────────────────────────────────
    def _clear_data(self):
        self.stdout.write("  🗑  Clearing existing data…")
        for model in [
            Feedback, Attachment, Message, Conversation, ConversationFolder,
            Agent, UserPreference, UsageRecord, KnowledgeDocument, KnowledgeBase,
            TrainingSample, TrainingDataset, PromptTemplate, AIModel,
            User,
        ]:
            model.objects.all().delete()
        self.stdout.write(self.style.WARNING("  ✓  Data cleared."))

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_ai_models(self) -> list[AIModel]:
        self.stdout.write("  🤖  Seeding AI models…")
        objs = [AIModel(**m) for m in AI_MODELS]
        AIModel.objects.bulk_create(objs, ignore_conflicts=True)
        models = list(AIModel.objects.all())
        self.stdout.write(f"      {len(models)} AI models ready.")
        return models

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_admin(self) -> User:
        self.stdout.write("  👑  Seeding admin user…")
        admin, _ = User.objects.get_or_create(
            email="admin@example.com",
            defaults=dict(
                username="admin",
                first_name="Admin",
                last_name="User",
                plan="enterprise",
                is_staff=True,
                is_superuser=True,
                password=make_password("admin1234"),
            ),
        )
        return admin

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_prompt_templates(self, admin: User) -> list[PromptTemplate]:
        self.stdout.write("  📝  Seeding prompt templates…")
        objs = [
            PromptTemplate(created_by=admin, **t)
            for t in PROMPT_TEMPLATES
        ]
        PromptTemplate.objects.bulk_create(objs, ignore_conflicts=True)
        templates = list(PromptTemplate.objects.all())
        self.stdout.write(f"      {len(templates)} templates ready.")
        return templates

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_training_datasets(self, admin: User) -> list[TrainingDataset]:
        self.stdout.write("  📚  Seeding training datasets…")
        objs = [
            TrainingDataset(created_by=admin, file_path=f"/data/datasets/{d['name'].lower().replace(' ', '_')}.{d['format']}", **d)
            for d in TRAINING_DATASETS
        ]
        TrainingDataset.objects.bulk_create(objs, ignore_conflicts=True)
        datasets = list(TrainingDataset.objects.all())
        self.stdout.write(f"      {len(datasets)} datasets ready.")
        return datasets

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_training_samples(self, datasets: list[TrainingDataset], per_dataset: int):
        self.stdout.write("  🧪  Seeding training samples…")
        samples = []
        for ds in datasets:
            for i in range(per_dataset):
                base = SAMPLE_PROMPTS[i % len(SAMPLE_PROMPTS)]
                samples.append(TrainingSample(
                    dataset=ds,
                    prompt=base[0],
                    completion=base[1],
                    system=base[2],
                    source=f"seed-{ds.id}",
                    quality=round(random.uniform(0.6, 1.0), 2),
                    metadata={"seed_index": i},
                ))
        TrainingSample.objects.bulk_create(samples, batch_size=500)
        self.stdout.write(f"      {len(samples)} training samples ready.")

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_knowledge_bases(self, ai_models: list[AIModel], admin: User) -> list[KnowledgeBase]:
        self.stdout.write("  🧠  Seeding knowledge bases…")
        rag_model = next((m for m in ai_models if m.model_type == "rag"), ai_models[0])
        objs = [
            KnowledgeBase(model=rag_model, created_by=admin, **kb)
            for kb in KNOWLEDGE_BASES
        ]
        KnowledgeBase.objects.bulk_create(objs, ignore_conflicts=True)
        kbs = list(KnowledgeBase.objects.all())
        self.stdout.write(f"      {len(kbs)} knowledge bases ready.")
        return kbs

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_knowledge_docs(self, kbs: list[KnowledgeBase]):
        self.stdout.write("  📄  Seeding knowledge documents…")
        docs = []
        for kb in kbs:
            for chunk_idx, doc_template in enumerate(KNOWLEDGE_DOCS_PER_BASE):
                content = f"[{kb.name}] {doc_template['content']}"
                docs.append(KnowledgeDocument(
                    knowledge_base=kb,
                    title=doc_template["title"],
                    content=content,
                    chunk_index=chunk_idx,
                    embedding=_fake_embedding(content),
                    embedding_model="enc-bert-v1",
                    metadata={"kb": kb.name, "chunk": chunk_idx},
                ))
        KnowledgeDocument.objects.bulk_create(docs, batch_size=200)
        self.stdout.write(f"      {len(docs)} documents ready.")

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_users(self, count: int) -> list[User]:
        self.stdout.write(f"  👤  Seeding {count} users…")
        used_emails: set[str] = {"admin@example.com"}
        hashed_pw = make_password("password123")
        objs = []
        for _ in range(count):
            first = random.choice(FIRST_NAMES)
            last  = random.choice(LAST_NAMES)
            domain = random.choice(DOMAINS)
            base_email = f"{first.lower()}.{last.lower()}@{domain}"
            email = base_email
            suffix = 1
            while email in used_emails:
                email = f"{first.lower()}.{last.lower()}{suffix}@{domain}"
                suffix += 1
            used_emails.add(email)
            objs.append(User(
                email=email,
                username=email,
                first_name=first,
                last_name=last,
                plan=random.choice(PLANS),
                avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={first}{last}",
                password=hashed_pw,
                is_active=True,
            ))
        User.objects.bulk_create(objs, batch_size=200, ignore_conflicts=True)
        users = list(User.objects.exclude(is_superuser=True))
        self.stdout.write(f"      {len(users)} users ready.")
        return users

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_user_preferences(self, users: list[User], ai_models: list[AIModel]):
        self.stdout.write("  ⚙️   Seeding user preferences…")
        causal = [m for m in ai_models if m.model_type == "causal_lm"]
        prefs = [
            UserPreference(
                user=u,
                default_model=random.choice(causal) if causal else None,
                theme=random.choice(THEMES),
                font_size=random.choice(FONT_SIZES),
                language=random.choice(LANGUAGES),
                send_on_enter=random.choice([True, True, False]),
                show_code_line_nums=random.choice([True, True, False]),
                memory_enabled=random.choice([True, True, False]),
                analytics_opt_in=random.choice([True, False]),
                custom_instructions=random.choice([
                    "", "", "",
                    "Always respond in bullet points.",
                    "I am a senior software engineer. Skip beginner explanations.",
                    "Be concise. No fluff.",
                    "I prefer Python examples.",
                ]),
            )
            for u in users
        ]
        UserPreference.objects.bulk_create(prefs, batch_size=200, ignore_conflicts=True)
        self.stdout.write(f"      {len(prefs)} preference records ready.")

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_folders(self, users: list[User]) -> list[ConversationFolder]:
        self.stdout.write("  📁  Seeding conversation folders…")
        folders = []
        for user in users:
            num_folders = random.randint(1, 4)
            names = random.sample(FOLDER_NAMES, num_folders)
            for name in names:
                folders.append(ConversationFolder(
                    user=user,
                    name=name,
                    color=random.choice(FOLDER_COLORS),
                ))
        ConversationFolder.objects.bulk_create(folders, batch_size=300)
        result = list(ConversationFolder.objects.all())
        self.stdout.write(f"      {len(result)} folders ready.")
        return result

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_agents(self, users: list[User], ai_models: list[AIModel], kbs: list[KnowledgeBase]) -> list[Agent]:
        self.stdout.write("  🤖  Seeding agents…")
        causal = [m for m in ai_models if m.model_type == "causal_lm"]
        owner_cycle = cycle(users)
        agents = []
        for defn in AGENT_DEFINITIONS:
            agents.append(Agent(
                owner=next(owner_cycle),
                model=random.choice(causal) if causal else None,
                knowledge_base=random.choice(kbs) if random.random() > 0.5 else None,
                **defn,
            ))
        Agent.objects.bulk_create(agents, ignore_conflicts=True)
        result = list(Agent.objects.all())
        self.stdout.write(f"      {len(result)} agents ready.")
        return result

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_conversations(
        self,
        users: list[User],
        ai_models: list[AIModel],
        kbs: list[KnowledgeBase],
        folders: list[ConversationFolder],
        per_user: int,
    ) -> list[Conversation]:
        self.stdout.write(f"  💬  Seeding conversations ({per_user} per user)…")

        # Group folders by user for quick lookup
        user_folders: dict[uuid.UUID, list[ConversationFolder]] = {}
        for f in folders:
            user_folders.setdefault(f.user_id, []).append(f)

        convs = []
        topics_cycle = cycle(CONVERSATION_TOPICS)
        for user in users:
            uf = user_folders.get(user.id, [])
            for _ in range(per_user):
                title, _ = next(topics_cycle)
                convs.append(Conversation(
                    user=user,
                    title=title,
                    model=random.choice(ai_models),
                    knowledge_base=random.choice(kbs) if random.random() > 0.7 else None,
                    folder=random.choice(uf) if uf and random.random() > 0.5 else None,
                    is_archived=random.random() < 0.1,
                    is_pinned=random.random() < 0.05,
                    is_shared=random.random() < 0.08,
                    share_token=uuid.uuid4().hex if random.random() < 0.08 else None,
                    system_prompt=random.choice(["", "", PROMPT_TEMPLATES[0]["content"]]),
                    metadata={"topic": title},
                ))
        Conversation.objects.bulk_create(convs, batch_size=500)
        result = list(Conversation.objects.all())
        self.stdout.write(f"      {len(result)} conversations ready.")
        return result

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_messages(
        self,
        convs: list[Conversation],
        ai_models: list[AIModel],
        per_conv: int,
    ) -> list[Message]:
        self.stdout.write(f"  ✉️   Seeding messages ({per_conv} per conversation)…")
        messages = []
        user_msgs_cycle  = cycle(USER_MESSAGES)
        asst_msgs_cycle  = cycle(ASSISTANT_MESSAGES)

        for conv in convs:
            # Interleave user/assistant turns
            for turn in range(per_conv // 2):
                prompt_tokens = random.randint(50, 800)
                completion_tokens = random.randint(80, 1200)
                messages.append(Message(
                    conversation=conv,
                    role="user",
                    content=next(user_msgs_cycle),
                    model=None,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=0,
                    total_tokens=prompt_tokens,
                    latency_ms=0,
                    status="done",
                    user_rating=None,
                ))
                messages.append(Message(
                    conversation=conv,
                    role="assistant",
                    content=next(asst_msgs_cycle),
                    model=conv.model,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens,
                    latency_ms=random.randint(300, 4000),
                    status="done",
                    user_rating=random.choice([None, None, None, 1, 1, -1]),
                    rag_sources=([{"doc_id": str(uuid.uuid4()), "score": round(random.uniform(0.7, 0.99), 3)}]
                                 if conv.knowledge_base and random.random() > 0.5 else []),
                ))

        Message.objects.bulk_create(messages, batch_size=1000)
        result = list(Message.objects.all())
        self.stdout.write(f"      {len(result)} messages ready.")
        return result

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_attachments(
        self,
        messages: list[Message],
        convs: list[Conversation],
        users: list[User],
    ):
        self.stdout.write("  📎  Seeding attachments…")
        # ~15 % of conversations get an attachment
        sampled = random.sample(convs, max(1, len(convs) // 7))
        conv_msg_map: dict[uuid.UUID, list[Message]] = {}
        for m in messages:
            if m.role == "user":
                conv_msg_map.setdefault(m.conversation_id, []).append(m)

        user_map = {u.id: u for u in users}
        attachments = []
        for conv in sampled:
            msgs = conv_msg_map.get(conv.id, [])
            if not msgs:
                continue
            msg = random.choice(msgs)
            mime, ext = random.choice(MIME_TYPES)
            fname = f"document_{uuid.uuid4().hex[:6]}{ext}"
            fsize = random.randint(4096, 5_000_000)
            attachments.append(Attachment(
                message=msg,
                conversation=conv,
                user=user_map.get(conv.user_id, users[0]),
                file=f"attachments/2024/01/{fname}",
                file_name=fname,
                file_size=fsize,
                mime_type=mime,
                extracted_text="Sample extracted text content for prototype purposes. " * 10,
            ))
        Attachment.objects.bulk_create(attachments, batch_size=200)
        self.stdout.write(f"      {len(attachments)} attachments ready.")

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_feedback(self, messages: list[Message], users: list[User]):
        self.stdout.write("  ⭐  Seeding feedback…")
        rated = [m for m in messages if m.role == "assistant" and m.user_rating is not None]
        # Deduplicate (message, user) pairs
        seen: set[tuple] = set()
        feedbacks = []
        conv_user_map = {m.conversation_id: m for m in messages}  # not used; we'll use rated directly

        # Build a conversation → user mapping from messages
        # We need the conversation's user_id; simplest: attach to message.conversation.user
        # Since we don't want N+1, sample from rated messages and use the conversation's user
        # We stored user on Conversation; bulk-fetch conversation user IDs
        conv_ids = list({m.conversation_id for m in rated})
        conv_user: dict[uuid.UUID, uuid.UUID] = dict(
            Conversation.objects.filter(id__in=conv_ids).values_list("id", "user_id")
        )
        user_objs = {u.id: u for u in users}

        categories = ["accuracy", "helpfulness", "tone", "formatting", "speed", ""]
        comments   = [
            "Very helpful, thanks!",
            "Not quite what I needed.",
            "The code example was perfect.",
            "A bit too verbose.",
            "Saved me hours of work.",
            "Response was incorrect.",
            "",
        ]

        for m in rated:
            u_id = conv_user.get(m.conversation_id)
            if not u_id or u_id not in user_objs:
                continue
            key = (m.id, u_id)
            if key in seen:
                continue
            seen.add(key)
            feedbacks.append(Feedback(
                message=m,
                user=user_objs[u_id],
                rating=m.user_rating,
                category=random.choice(categories),
                comment=random.choice(comments),
            ))

        Feedback.objects.bulk_create(feedbacks, batch_size=500, ignore_conflicts=True)
        self.stdout.write(f"      {len(feedbacks)} feedback records ready.")

    # ──────────────────────────────────────────────────────────────────────────
    def _seed_usage_records(
        self,
        users: list[User],
        ai_models: list[AIModel],
        days: int,
    ):
        self.stdout.write(f"  📊  Seeding {days} days of usage records…")
        today = date.today()
        records = []
        # Use a subset of users (active users) for usage records
        active_users = random.sample(users, min(len(users), 30))
        causal_models = [m for m in ai_models if m.model_type in ("causal_lm", "rag", "agent")]

        seen_combos: set[tuple] = set()
        for user in active_users:
            for day_offset in range(days):
                if random.random() < 0.3:    # ~70 % of days have activity
                    continue
                d = today - timedelta(days=day_offset)
                model = random.choice(causal_models)
                key = (user.id, model.id, d)
                if key in seen_combos:
                    continue
                seen_combos.add(key)
                req_count = random.randint(1, 50)
                prompt_tok = req_count * random.randint(200, 1000)
                completion_tok = req_count * random.randint(100, 800)
                records.append(UsageRecord(
                    user=user,
                    model=model,
                    date=d,
                    prompt_tokens=prompt_tok,
                    completion_tokens=completion_tok,
                    total_tokens=prompt_tok + completion_tok,
                    request_count=req_count,
                    error_count=random.randint(0, max(1, req_count // 20)),
                ))

        UsageRecord.objects.bulk_create(records, batch_size=500, ignore_conflicts=True)
        self.stdout.write(f"      {len(records)} usage records ready.")

    # ──────────────────────────────────────────────────────────────────────────
    def _print_summary(self, users, convs, messages):
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("✅  Seed complete! Database summary:"))
        counts = [
            ("Users",               User.objects.count()),
            ("AI Models",           AIModel.objects.count()),
            ("Prompt Templates",    PromptTemplate.objects.count()),
            ("Training Datasets",   TrainingDataset.objects.count()),
            ("Training Samples",    TrainingSample.objects.count()),
            ("Knowledge Bases",     KnowledgeBase.objects.count()),
            ("Knowledge Documents", KnowledgeDocument.objects.count()),
            ("Agents",              Agent.objects.count()),
            ("Conversation Folders",ConversationFolder.objects.count()),
            ("Conversations",       Conversation.objects.count()),
            ("Messages",            Message.objects.count()),
            ("Attachments",         Attachment.objects.count()),
            ("Feedback Records",    Feedback.objects.count()),
            ("Usage Records",       UsageRecord.objects.count()),
        ]
        for label, count in counts:
            self.stdout.write(f"   {label:<25} {count:>6,}")
        self.stdout.write("")
        self.stdout.write("  Admin login:  admin@example.com / admin1234")
        self.stdout.write("  User password: password123  (all regular users)")