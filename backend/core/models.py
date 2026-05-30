# chat/models.py
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


# ──────────────────────────────────────────────
# CUSTOM USER
# ──────────────────────────────────────────────

class User(AbstractUser):
    """Extended user model."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email       = models.EmailField(unique=True)
    avatar_url  = models.URLField(blank=True, null=True)
    plan        = models.CharField(
        max_length=20,
        choices=[("free", "Free"), ("plus", "Plus"), ("team", "Team"), ("enterprise", "Enterprise")],
        default="free",
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"


# ──────────────────────────────────────────────
# AI MODEL REGISTRY
# ──────────────────────────────────────────────

class AIModel(models.Model):
    """Registered AI models (your own trained models)."""
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name             = models.CharField(max_length=100, unique=True)   # e.g. "my-gpt-v1"
    display_name     = models.CharField(max_length=150)                # e.g. "MyGPT 1.0"
    description      = models.TextField(blank=True)
    version          = models.CharField(max_length=50, default="1.0.0")
    model_type       = models.CharField(
        max_length=50,
        choices=[
            ("causal_lm",    "Causal Language Model"),
            ("seq2seq",      "Seq2Seq"),
            ("encoder_only", "Encoder Only"),
            ("rag",          "Retrieval-Augmented"),
            ("agent",        "Agent"),
        ],
        default="causal_lm",
    )
    # Path to your saved model weights / checkpoint
    model_path       = models.CharField(max_length=500, blank=True)
    # Path to your tokenizer
    tokenizer_path   = models.CharField(max_length=500, blank=True)
    # Inference config stored as JSON
    inference_config = models.JSONField(default=dict, blank=True)
    context_length   = models.IntegerField(default=4096)
    max_output_tokens = models.IntegerField(default=2048)
    is_active        = models.BooleanField(default=True)
    is_default       = models.BooleanField(default=False)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table  = "ai_models"
        ordering  = ["-created_at"]

    def __str__(self):
        return self.display_name


# ──────────────────────────────────────────────
# TRAINING DATA
# ──────────────────────────────────────────────

class TrainingDataset(models.Model):
    """Datasets used to train your models."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file_path   = models.CharField(max_length=500, blank=True)  # local or S3 path
    format      = models.CharField(
        max_length=30,
        choices=[("jsonl", "JSONL"), ("csv", "CSV"), ("txt", "Text"), ("parquet", "Parquet")],
        default="jsonl",
    )
    num_samples = models.BigIntegerField(default=0)
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="datasets")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "training_datasets"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class TrainingSample(models.Model):
    """Individual prompt/completion pairs stored in DB for RAG / fine-tuning."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset     = models.ForeignKey(TrainingDataset, on_delete=models.CASCADE, related_name="samples")
    prompt      = models.TextField()
    completion  = models.TextField()
    system      = models.TextField(blank=True)
    source      = models.CharField(max_length=200, blank=True)
    quality     = models.FloatField(default=1.0)   # 0–1 quality score
    metadata    = models.JSONField(default=dict, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "training_samples"
        indexes  = [models.Index(fields=["dataset", "quality"])]


# ──────────────────────────────────────────────
# KNOWLEDGE BASE (for RAG)
# ──────────────────────────────────────────────

class KnowledgeBase(models.Model):
    """Named knowledge base for retrieval-augmented generation."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    model       = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="knowledge_bases")
    is_public   = models.BooleanField(default=False)
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "knowledge_bases"

    def __str__(self):
        return self.name


class KnowledgeDocument(models.Model):
    """Individual documents in a knowledge base."""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    knowledge_base  = models.ForeignKey(KnowledgeBase, on_delete=models.CASCADE, related_name="documents")
    title           = models.CharField(max_length=500)
    content         = models.TextField()
    source_url      = models.URLField(blank=True)
    file_path       = models.CharField(max_length=500, blank=True)
    # Pre-computed embedding stored as binary blob or JSON array
    embedding       = models.BinaryField(blank=True, null=True)
    embedding_model = models.CharField(max_length=100, blank=True)
    chunk_index     = models.IntegerField(default=0)
    metadata        = models.JSONField(default=dict, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "knowledge_documents"
        indexes  = [models.Index(fields=["knowledge_base", "chunk_index"])]

    def __str__(self):
        return f"{self.title} (chunk {self.chunk_index})"


# ──────────────────────────────────────────────
# CONVERSATIONS & MESSAGES
# ──────────────────────────────────────────────

class Conversation(models.Model):
    """A single chat thread."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversations")
    title       = models.CharField(max_length=500, blank=True, default="New Chat")
    model       = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="conversations")
    # System prompt override per-conversation
    system_prompt  = models.TextField(blank=True)
    is_archived    = models.BooleanField(default=False)
    is_pinned      = models.BooleanField(default=False)
    is_shared      = models.BooleanField(default=False)
    share_token    = models.CharField(max_length=64, blank=True, unique=True, null=True)
    # Optional link to a knowledge base for RAG context
    knowledge_base = models.ForeignKey(KnowledgeBase, on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name="conversations")
    folder         = models.ForeignKey("ConversationFolder", on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name="conversations")
    metadata       = models.JSONField(default=dict, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "conversations"
        ordering = ["-updated_at"]
        indexes  = [
            models.Index(fields=["user", "is_archived"]),
            models.Index(fields=["share_token"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.title}"


class ConversationFolder(models.Model):
    """Optional folders for organizing conversations."""
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="folders")
    name       = models.CharField(max_length=200)
    color      = models.CharField(max_length=10, default="#8e8ea0")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "conversation_folders"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Message(models.Model):
    """A single message within a conversation."""

    ROLE_CHOICES = [
        ("system",    "System"),
        ("user",      "User"),
        ("assistant", "Assistant"),
        ("tool",      "Tool"),
    ]

    STATUS_CHOICES = [
        ("pending",   "Pending"),
        ("streaming", "Streaming"),
        ("done",      "Done"),
        ("error",     "Error"),
    ]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation    = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    role            = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content         = models.TextField()
    # For tool-use messages
    tool_name       = models.CharField(max_length=100, blank=True)
    tool_input      = models.JSONField(default=dict, blank=True)
    tool_output     = models.TextField(blank=True)
    # Model that generated this message
    model           = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True, blank=True)
    # Generation metadata
    prompt_tokens   = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)
    total_tokens    = models.IntegerField(default=0)
    latency_ms      = models.IntegerField(default=0)
    # Quality signals
    user_rating     = models.SmallIntegerField(null=True, blank=True)  # 1 = thumbs up, -1 = down
    is_edited       = models.BooleanField(default=False)
    parent_message  = models.ForeignKey("self", on_delete=models.SET_NULL,
                                        null=True, blank=True, related_name="children")
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default="done")
    # Raw sources used for RAG
    rag_sources     = models.JSONField(default=list, blank=True)
    metadata        = models.JSONField(default=dict, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]
        indexes  = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["role", "status"]),
        ]

    def __str__(self):
        return f"[{self.role}] {self.content[:80]}"


# ──────────────────────────────────────────────
# ATTACHMENTS
# ──────────────────────────────────────────────

class Attachment(models.Model):
    """Files uploaded and attached to messages."""
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message      = models.ForeignKey(Message, on_delete=models.CASCADE,
                                     null=True, blank=True, related_name="attachments")
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE,
                                     related_name="attachments")
    user         = models.ForeignKey(User, on_delete=models.CASCADE)
    file         = models.FileField(upload_to="attachments/%Y/%m/")
    file_name    = models.CharField(max_length=500)
    file_size    = models.BigIntegerField(default=0)
    mime_type    = models.CharField(max_length=200, blank=True)
    # Extracted text content (for documents)
    extracted_text = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attachments"

    def __str__(self):
        return self.file_name


# ──────────────────────────────────────────────
# AGENTS
# ──────────────────────────────────────────────

class Agent(models.Model):
    """Custom agents the user has configured (GPTs equivalent)."""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name="agents")
    name            = models.CharField(max_length=200)
    description     = models.TextField(blank=True)
    avatar_url      = models.URLField(blank=True, null=True)
    system_prompt   = models.TextField(blank=True)
    model           = models.ForeignKey(AIModel, on_delete=models.SET_NULL,
                                        null=True, blank=True, related_name="agents")
    knowledge_base  = models.ForeignKey(KnowledgeBase, on_delete=models.SET_NULL,
                                        null=True, blank=True, related_name="agents")
    tools_config    = models.JSONField(default=list, blank=True)  # list of tool names/configs
    is_public       = models.BooleanField(default=False)
    is_active       = models.BooleanField(default=True)
    # Training data associated with this agent
    datasets        = models.ManyToManyField(TrainingDataset, blank=True, related_name="agents")
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "agents"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


# ──────────────────────────────────────────────
# SYSTEM PROMPT TEMPLATES
# ──────────────────────────────────────────────

class PromptTemplate(models.Model):
    """Reusable system prompt templates."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    content     = models.TextField()
    category    = models.CharField(max_length=100, blank=True)
    is_public   = models.BooleanField(default=False)
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="templates")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "prompt_templates"
        ordering = ["category", "name"]

    def __str__(self):
        return self.name


# ──────────────────────────────────────────────
# USER PREFERENCES
# ──────────────────────────────────────────────

class UserPreference(models.Model):
    """Per-user app settings."""
    user               = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences")
    default_model      = models.ForeignKey(AIModel, on_delete=models.SET_NULL,
                                           null=True, blank=True, related_name="preferred_by")
    default_agent      = models.ForeignKey(Agent, on_delete=models.SET_NULL,
                                           null=True, blank=True, related_name="preferred_by")
    theme              = models.CharField(max_length=20,
                                          choices=[("dark","Dark"),("light","Light"),("system","System")],
                                          default="dark")
    font_size          = models.CharField(max_length=10, default="medium")
    language           = models.CharField(max_length=10, default="en")
    send_on_enter      = models.BooleanField(default=True)
    show_code_line_nums = models.BooleanField(default=True)
    memory_enabled     = models.BooleanField(default=True)
    analytics_opt_in   = models.BooleanField(default=True)
    custom_instructions = models.TextField(blank=True)
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_preferences"

    def __str__(self):
        return f"Prefs for {self.user.email}"


# ──────────────────────────────────────────────
# USAGE / ANALYTICS
# ──────────────────────────────────────────────

class UsageRecord(models.Model):
    """Token usage log per user/model/day."""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name="usage_records")
    model           = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True, related_name="usage_records")
    date            = models.DateField(default=timezone.now)
    prompt_tokens   = models.BigIntegerField(default=0)
    completion_tokens = models.BigIntegerField(default=0)
    total_tokens    = models.BigIntegerField(default=0)
    request_count   = models.IntegerField(default=0)
    error_count     = models.IntegerField(default=0)

    class Meta:
        db_table  = "usage_records"
        unique_together = [["user", "model", "date"]]
        indexes   = [models.Index(fields=["user", "date"])]

    def __str__(self):
        return f"{self.user.email} — {self.date} — {self.total_tokens} tokens"


# ──────────────────────────────────────────────
# FEEDBACK
# ──────────────────────────────────────────────

class Feedback(models.Model):
    """User feedback on assistant responses."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message     = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="feedback")
    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name="feedback")
    rating      = models.SmallIntegerField()   # 1 = positive, -1 = negative
    category    = models.CharField(max_length=100, blank=True)
    comment     = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = "feedback"
        unique_together = [["message", "user"]]

    def __str__(self):
        return f"{'👍' if self.rating > 0 else '👎'} on {self.message_id}"