"""
chat/admin.py  —  Fully customised, colourful Django admin
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Count, Sum, Avg
from django.urls import reverse
from django.utils import timezone

from .models import (
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
# ADMIN SITE CUSTOMISATION
# ══════════════════════════════════════════════════════════════════════════════

admin.site.site_header  = mark_safe('<span style="color:#a78bfa;font-weight:800;font-size:1.3rem;letter-spacing:.04em;">⚡ LLM Platform Admin</span>')
admin.site.site_title   = "LLM Platform"
admin.site.index_title  = mark_safe('<span style="color:#64748b;">Dashboard — Welcome back 👋</span>')


# ══════════════════════════════════════════════════════════════════════════════
# COLOUR / BADGE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _badge(text, bg, fg="#fff", radius="6px"):
    return format_html(
        '<span style="background:{};color:{};padding:2px 10px;border-radius:{}; '
        'font-size:.78rem;font-weight:700;letter-spacing:.04em;white-space:nowrap;">{}</span>',
        bg, fg, radius, text,
    )

def _dot(colour, size=10):
    return format_html(
        '<span style="display:inline-block;width:{s}px;height:{s}px;border-radius:50%;'
        'background:{c};margin-right:5px;vertical-align:middle;"></span>',
        s=size, c=colour,
    )

PLAN_COLOURS = {
    "free":       ("#94a3b8", "#fff"),
    "plus":       ("#3b82f6", "#fff"),
    "team":       ("#8b5cf6", "#fff"),
    "enterprise": ("#f59e0b", "#000"),
}

MODEL_TYPE_COLOURS = {
    "causal_lm":    "#6366f1",
    "seq2seq":      "#06b6d4",
    "encoder_only": "#10b981",
    "rag":          "#f59e0b",
    "agent":        "#ef4444",
}

STATUS_COLOURS = {
    "pending":   "#94a3b8",
    "streaming": "#3b82f6",
    "done":      "#22c55e",
    "error":     "#ef4444",
}

ROLE_COLOURS = {
    "system":    "#8b5cf6",
    "user":      "#3b82f6",
    "assistant": "#10b981",
    "tool":      "#f97316",
}

FORMAT_COLOURS = {
    "jsonl":   "#6366f1",
    "csv":     "#10b981",
    "txt":     "#94a3b8",
    "parquet": "#f59e0b",
}


# ══════════════════════════════════════════════════════════════════════════════
# INLINE ADMINS
# ══════════════════════════════════════════════════════════════════════════════

class UserPreferenceInline(admin.StackedInline):
    model       = UserPreference
    extra       = 0
    can_delete  = False
    verbose_name = "Preferences"
    fieldsets = (
        ("Display", {"fields": ("theme", "font_size", "language")}),
        ("Behaviour", {"fields": ("send_on_enter", "show_code_line_nums", "memory_enabled", "analytics_opt_in")}),
        ("Models", {"fields": ("default_model", "default_agent")}),
        ("Custom Instructions", {"fields": ("custom_instructions",)}),
    )


class MessageInline(admin.TabularInline):
    model          = Message
    extra          = 0
    max_num        = 20
    readonly_fields = ("role_badge", "content_preview", "model", "total_tokens", "status_badge", "created_at")
    fields         = ("role_badge", "content_preview", "model", "total_tokens", "status_badge", "created_at")
    show_change_link = True
    can_delete     = False

    def role_badge(self, obj):
        c = ROLE_COLOURS.get(obj.role, "#94a3b8")
        return _badge(obj.role.upper(), c)
    role_badge.short_description = "Role"

    def status_badge(self, obj):
        c = STATUS_COLOURS.get(obj.status, "#94a3b8")
        return _badge(obj.status, c)
    status_badge.short_description = "Status"

    def content_preview(self, obj):
        preview = obj.content[:80] + ("…" if len(obj.content) > 80 else "")
        return format_html('<span style="color:#cbd5e1;font-size:.85rem;">{}</span>', preview)
    content_preview.short_description = "Content"


class KnowledgeDocumentInline(admin.TabularInline):
    model           = KnowledgeDocument
    extra           = 0
    max_num         = 15
    readonly_fields = ("title", "chunk_index", "embedding_model", "content_preview", "created_at")
    fields          = ("chunk_index", "title", "embedding_model", "content_preview", "created_at")
    can_delete      = True
    show_change_link = True

    def content_preview(self, obj):
        preview = obj.content[:60] + ("…" if len(obj.content) > 60 else "")
        return format_html('<span style="color:#94a3b8;font-size:.82rem;">{}</span>', preview)
    content_preview.short_description = "Content"


class TrainingSampleInline(admin.TabularInline):
    model           = TrainingSample
    extra           = 0
    max_num         = 10
    readonly_fields = ("prompt_preview", "quality_bar", "source", "created_at")
    fields          = ("prompt_preview", "quality_bar", "source", "created_at")
    can_delete      = True

    def prompt_preview(self, obj):
        return format_html('<span style="color:#cbd5e1;font-size:.82rem;">{}</span>', obj.prompt[:70])
    prompt_preview.short_description = "Prompt"

    def quality_bar(self, obj):
        pct  = int(obj.quality * 100)
        col  = "#22c55e" if pct >= 80 else "#f59e0b" if pct >= 50 else "#ef4444"
        return format_html(
            '<div style="background:#1e293b;border-radius:4px;height:10px;width:100px;overflow:hidden;">'
            '<div style="background:{};height:100%;width:{}%;border-radius:4px;"></div></div>'
            '<span style="font-size:.75rem;color:{};">&nbsp;{}%</span>',
            col, pct, col, pct,
        )
    quality_bar.short_description = "Quality"


class AttachmentInline(admin.TabularInline):
    model           = Attachment
    extra           = 0
    max_num         = 5
    readonly_fields = ("file_name", "mime_badge", "size_display", "created_at")
    fields          = ("file_name", "mime_badge", "size_display", "created_at")
    can_delete      = True

    def mime_badge(self, obj):
        colours = {"pdf": "#ef4444", "png": "#8b5cf6", "jpg": "#f59e0b",
                   "csv": "#10b981", "json": "#3b82f6", "txt": "#94a3b8", "docx": "#6366f1"}
        ext = obj.file_name.rsplit(".", 1)[-1].lower()
        return _badge(ext.upper(), colours.get(ext, "#64748b"))
    mime_badge.short_description = "Type"

    def size_display(self, obj):
        size = obj.file_size
        if size >= 1_000_000:
            return format_html('<span style="color:#94a3b8;">{:.1f} MB</span>', size / 1_000_000)
        return format_html('<span style="color:#94a3b8;">{:.1f} KB</span>', size / 1_000)
    size_display.short_description = "Size"


class FeedbackInline(admin.TabularInline):
    model           = Feedback
    extra           = 0
    max_num         = 10
    readonly_fields = ("rating_icon", "category", "comment", "user", "created_at")
    fields          = ("rating_icon", "user", "category", "comment", "created_at")
    can_delete      = True

    def rating_icon(self, obj):
        if obj.rating > 0:
            return format_html('<span style="font-size:1.2rem;" title="Positive">👍</span>')
        return format_html('<span style="font-size:1.2rem;" title="Negative">👎</span>')
    rating_icon.short_description = "Rating"


# ══════════════════════════════════════════════════════════════════════════════
# USER ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display        = ("avatar_img", "email", "full_name", "plan_badge", "conversation_count", "is_active", "created_at")
    list_display_links  = ("email",)
    list_filter         = ("plan", "is_active", "is_staff", "created_at")
    search_fields       = ("email", "first_name", "last_name", "username")
    ordering            = ("-created_at",)
    readonly_fields     = ("id", "created_at", "updated_at", "conversation_count", "avatar_img")
    inlines             = [UserPreferenceInline]
    list_per_page       = 25
    date_hierarchy      = "created_at"

    fieldsets = (
        (None,          {"fields": ("id", "email", "username", "password")}),
        ("Personal",    {"fields": ("avatar_img", "avatar_url", "first_name", "last_name")}),
        ("Plan",        {"fields": ("plan",)}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
                         "classes": ("collapse",)}),
        ("Timestamps",  {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "username", "password1", "password2", "plan")}),
    )

    def avatar_img(self, obj):
        if obj.avatar_url:
            return format_html(
                '<img src="{}" style="width:32px;height:32px;border-radius:50%;'
                'object-fit:cover;border:2px solid #6366f1;" />',
                obj.avatar_url,
            )
        initials = (obj.first_name[:1] + obj.last_name[:1]).upper() or "?"
        colours  = ["#6366f1", "#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"]
        bg       = colours[hash(str(obj.id)) % len(colours)]
        return format_html(
            '<div style="width:32px;height:32px;border-radius:50%;background:{};'
            'display:flex;align-items:center;justify-content:center;'
            'color:#fff;font-size:.7rem;font-weight:700;">{}</div>',
            bg, initials,
        )
    avatar_img.short_description = ""

    def full_name(self, obj):
        return format_html('<span style="font-weight:600;">{}</span>', obj.get_full_name() or obj.username)
    full_name.short_description = "Name"

    def plan_badge(self, obj):
        bg, fg = PLAN_COLOURS.get(obj.plan, ("#64748b", "#fff"))
        return _badge(obj.plan.upper(), bg, fg)
    plan_badge.short_description = "Plan"
    plan_badge.admin_order_field = "plan"

    def conversation_count(self, obj):
        count = obj.conversations.count()
        colour = "#22c55e" if count > 10 else "#3b82f6" if count > 3 else "#94a3b8"
        return format_html('<span style="color:{};font-weight:700;">{}</span>', colour, count)
    conversation_count.short_description = "Chats"

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("conversations")


# ══════════════════════════════════════════════════════════════════════════════
# AI MODEL ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(AIModel)
class AIModelAdmin(admin.ModelAdmin):
    list_display       = ("model_icon", "display_name", "name", "type_badge", "version", "context_display",
                          "active_badge", "default_badge", "created_at")
    list_display_links = ("display_name",)
    list_filter        = ("model_type", "is_active", "is_default")
    search_fields      = ("name", "display_name", "description")
    ordering           = ("-created_at",)
    readonly_fields    = ("id", "created_at", "updated_at")
    list_per_page      = 20

    fieldsets = (
        ("Identity",      {"fields": ("id", "name", "display_name", "description", "version")}),
        ("Architecture",  {"fields": ("model_type", "context_length", "max_output_tokens")}),
        ("Paths",         {"fields": ("model_path", "tokenizer_path"), "classes": ("collapse",)}),
        ("Config",        {"fields": ("inference_config",), "classes": ("collapse",)}),
        ("Status",        {"fields": ("is_active", "is_default")}),
        ("Timestamps",    {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def model_icon(self, obj):
        icons = {"causal_lm": "🧠", "seq2seq": "🔄", "encoder_only": "🔍", "rag": "📚", "agent": "🤖"}
        return format_html('<span style="font-size:1.3rem;">{}</span>', icons.get(obj.model_type, "⚙️"))
    model_icon.short_description = ""

    def type_badge(self, obj):
        colour = MODEL_TYPE_COLOURS.get(obj.model_type, "#64748b")
        return _badge(obj.get_model_type_display(), colour)
    type_badge.short_description = "Type"
    type_badge.admin_order_field = "model_type"

    def context_display(self, obj):
        k = obj.context_length // 1000
        return format_html('<span style="color:#a78bfa;font-weight:600;">{}K</span>', k)
    context_display.short_description = "Context"

    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color:#22c55e;font-size:1.1rem;" title="Active">●</span>')
        return format_html('<span style="color:#ef4444;font-size:1.1rem;" title="Inactive">●</span>')
    active_badge.short_description = "Active"

    def default_badge(self, obj):
        if obj.is_default:
            return format_html('<span style="color:#f59e0b;">★ Default</span>')
        return format_html('<span style="color:#334155;">—</span>')
    default_badge.short_description = "Default"


# ══════════════════════════════════════════════════════════════════════════════
# TRAINING DATASET ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(TrainingDataset)
class TrainingDatasetAdmin(admin.ModelAdmin):
    list_display       = ("name", "format_badge", "samples_display", "created_by", "created_at")
    list_display_links = ("name",)
    list_filter        = ("format", "created_at")
    search_fields      = ("name", "description")
    ordering           = ("-created_at",)
    readonly_fields    = ("id", "created_at")
    inlines            = [TrainingSampleInline]
    list_per_page      = 20

    fieldsets = (
        ("Info",        {"fields": ("id", "name", "description")}),
        ("Data",        {"fields": ("format", "num_samples", "file_path")}),
        ("Ownership",   {"fields": ("created_by", "created_at")}),
    )

    def format_badge(self, obj):
        colour = FORMAT_COLOURS.get(obj.format, "#64748b")
        return _badge(obj.format.upper(), colour)
    format_badge.short_description = "Format"
    format_badge.admin_order_field = "format"

    def samples_display(self, obj):
        n     = obj.num_samples
        label = f"{n:,}"
        col   = "#22c55e" if n > 50000 else "#3b82f6" if n > 10000 else "#f59e0b"
        return format_html('<span style="color:{};font-weight:700;">{}</span>', col, label)
    samples_display.short_description = "Samples"
    samples_display.admin_order_field = "num_samples"


# ══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE BASE ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display       = ("name", "model", "doc_count", "public_badge", "created_by", "created_at")
    list_display_links = ("name",)
    list_filter        = ("is_public", "created_at")
    search_fields      = ("name", "description")
    readonly_fields    = ("id", "created_at", "doc_count")
    ordering           = ("-created_at",)
    inlines            = [KnowledgeDocumentInline]
    list_per_page      = 20

    fieldsets = (
        ("Info",      {"fields": ("id", "name", "description")}),
        ("Config",    {"fields": ("model", "is_public")}),
        ("Stats",     {"fields": ("doc_count",)}),
        ("Ownership", {"fields": ("created_by", "created_at")}),
    )

    def doc_count(self, obj):
        count = obj.documents.count()
        return format_html('<span style="color:#a78bfa;font-weight:700;">{} docs</span>', count)
    doc_count.short_description = "Documents"

    def public_badge(self, obj):
        if obj.is_public:
            return _badge("PUBLIC", "#10b981")
        return _badge("PRIVATE", "#64748b")
    public_badge.short_description = "Visibility"
    public_badge.admin_order_field = "is_public"

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("documents")


@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    list_display       = ("title", "knowledge_base", "chunk_index", "embedding_model", "has_embedding", "created_at")
    list_display_links = ("title",)
    list_filter        = ("knowledge_base", "embedding_model")
    search_fields      = ("title", "content")
    readonly_fields    = ("id", "created_at", "has_embedding")
    ordering           = ("knowledge_base", "chunk_index")
    list_per_page      = 30

    fieldsets = (
        ("Document",   {"fields": ("id", "knowledge_base", "title", "chunk_index")}),
        ("Content",    {"fields": ("content", "source_url", "file_path")}),
        ("Embedding",  {"fields": ("embedding_model", "has_embedding"), "classes": ("collapse",)}),
        ("Meta",       {"fields": ("metadata", "created_at")}),
    )

    def has_embedding(self, obj):
        if obj.embedding:
            return format_html('<span style="color:#22c55e;font-weight:700;">✓ Embedded</span>')
        return format_html('<span style="color:#ef4444;">✗ None</span>')
    has_embedding.short_description = "Embedding"


# ══════════════════════════════════════════════════════════════════════════════
# CONVERSATION ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display       = ("title_display", "user", "model", "message_count", "flags", "knowledge_base", "created_at")
    list_display_links = ("title_display",)
    list_filter        = ("is_archived", "is_pinned", "is_shared", "model", "created_at")
    search_fields      = ("title", "user__email")
    readonly_fields    = ("id", "created_at", "updated_at", "message_count", "share_link")
    ordering           = ("-updated_at",)
    inlines            = [MessageInline, AttachmentInline]
    date_hierarchy     = "created_at"
    list_per_page      = 25

    fieldsets = (
        ("Conversation",  {"fields": ("id", "title", "user", "model")}),
        ("Config",        {"fields": ("system_prompt", "knowledge_base", "folder")}),
        ("Status",        {"fields": ("is_archived", "is_pinned", "is_shared", "share_token", "share_link")}),
        ("Stats",         {"fields": ("message_count",)}),
        ("Meta",          {"fields": ("metadata", "created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def title_display(self, obj):
        return format_html(
            '<span style="font-weight:600;color:#e2e8f0;max-width:260px;display:inline-block;'
            'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{}</span>',
            obj.title or "Untitled",
        )
    title_display.short_description = "Title"

    def message_count(self, obj):
        count = obj.messages.count()
        col   = "#22c55e" if count > 20 else "#3b82f6" if count > 5 else "#94a3b8"
        return format_html('<span style="color:{};font-weight:700;">💬 {}</span>', col, count)
    message_count.short_description = "Messages"

    def flags(self, obj):
        tags = []
        if obj.is_pinned:   tags.append(_badge("📌 Pinned",   "#f59e0b", "#000"))
        if obj.is_archived: tags.append(_badge("🗄 Archived", "#64748b"))
        if obj.is_shared:   tags.append(_badge("🔗 Shared",   "#3b82f6"))
        return mark_safe(" ".join(tags)) if tags else format_html('<span style="color:#334155;">—</span>')
    flags.short_description = "Flags"

    def share_link(self, obj):
        if obj.share_token:
            return format_html(
                '<a href="/share/{}" style="color:#3b82f6;" target="_blank">/share/{}</a>',
                obj.share_token, obj.share_token[:16] + "…",
            )
        return "—"
    share_link.short_description = "Share URL"

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("messages").select_related("user", "model")


@admin.register(ConversationFolder)
class ConversationFolderAdmin(admin.ModelAdmin):
    list_display       = ("colour_swatch", "name", "user", "conv_count", "created_at")
    list_display_links = ("name",)
    search_fields      = ("name", "user__email")
    list_filter        = ("created_at",)
    ordering           = ("name",)
    readonly_fields    = ("id", "created_at", "conv_count")

    def colour_swatch(self, obj):
        return format_html(
            '<div style="width:20px;height:20px;border-radius:4px;background:{};'
            'display:inline-block;border:1px solid rgba(255,255,255,.15);"></div>',
            obj.color,
        )
    colour_swatch.short_description = ""

    def conv_count(self, obj):
        return format_html('<span style="color:#a78bfa;font-weight:700;">{}</span>', obj.conversations.count())
    conv_count.short_description = "Conversations"

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("conversations").select_related("user")


# ══════════════════════════════════════════════════════════════════════════════
# MESSAGE ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display       = ("role_badge", "content_preview", "conversation_link", "model",
                          "tokens_display", "latency_display", "status_badge", "rating_icon", "created_at")
    list_display_links = ("content_preview",)
    list_filter        = ("role", "status", "user_rating", "created_at")
    search_fields      = ("content", "conversation__user__email")
    ordering           = ("-created_at",)
    readonly_fields    = ("id", "created_at", "updated_at")
    date_hierarchy     = "created_at"
    list_per_page      = 30
    inlines            = [AttachmentInline, FeedbackInline]

    fieldsets = (
        ("Message",     {"fields": ("id", "conversation", "role", "content")}),
        ("Tool Use",    {"fields": ("tool_name", "tool_input", "tool_output"), "classes": ("collapse",)}),
        ("Generation",  {"fields": ("model", "prompt_tokens", "completion_tokens", "total_tokens", "latency_ms")}),
        ("Quality",     {"fields": ("user_rating", "is_edited", "status")}),
        ("RAG",         {"fields": ("rag_sources",), "classes": ("collapse",)}),
        ("Threading",   {"fields": ("parent_message",), "classes": ("collapse",)}),
        ("Meta",        {"fields": ("metadata", "created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def role_badge(self, obj):
        c = ROLE_COLOURS.get(obj.role, "#94a3b8")
        return _badge(obj.role.upper(), c)
    role_badge.short_description = "Role"
    role_badge.admin_order_field = "role"

    def content_preview(self, obj):
        return format_html(
            '<span style="color:#cbd5e1;font-size:.85rem;max-width:280px;display:inline-block;'
            'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{}</span>',
            obj.content[:100],
        )
    content_preview.short_description = "Content"

    def conversation_link(self, obj):
        url = reverse("admin:chat_conversation_change", args=[obj.conversation_id])
        return format_html(
            '<a href="{}" style="color:#6366f1;font-size:.82rem;">{}</a>',
            url, str(obj.conversation_id)[:8] + "…",
        )
    conversation_link.short_description = "Conversation"

    def tokens_display(self, obj):
        t = obj.total_tokens
        col = "#22c55e" if t < 500 else "#f59e0b" if t < 2000 else "#ef4444"
        return format_html('<span style="color:{};font-weight:600;font-size:.82rem;">{:,}</span>', col, t)
    tokens_display.short_description = "Tokens"
    tokens_display.admin_order_field = "total_tokens"

    def latency_display(self, obj):
        ms = obj.latency_ms
        if ms == 0:
            return format_html('<span style="color:#334155;">—</span>')
        col = "#22c55e" if ms < 1000 else "#f59e0b" if ms < 3000 else "#ef4444"
        return format_html('<span style="color:{};font-size:.82rem;">{}ms</span>', col, ms)
    latency_display.short_description = "Latency"

    def status_badge(self, obj):
        c = STATUS_COLOURS.get(obj.status, "#94a3b8")
        return _badge(obj.status, c)
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    def rating_icon(self, obj):
        if obj.user_rating == 1:
            return format_html('<span style="font-size:1.1rem;">👍</span>')
        if obj.user_rating == -1:
            return format_html('<span style="font-size:1.1rem;">👎</span>')
        return format_html('<span style="color:#334155;">—</span>')
    rating_icon.short_description = "Rating"


# ══════════════════════════════════════════════════════════════════════════════
# ATTACHMENT ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display       = ("file_name", "mime_badge", "size_display", "user", "conversation", "created_at")
    list_display_links = ("file_name",)
    list_filter        = ("mime_type", "created_at")
    search_fields      = ("file_name", "user__email")
    ordering           = ("-created_at",)
    readonly_fields    = ("id", "created_at", "mime_badge", "size_display")
    list_per_page      = 30

    fieldsets = (
        ("File",     {"fields": ("id", "file_name", "file", "mime_type", "file_size")}),
        ("Linked",   {"fields": ("message", "conversation", "user")}),
        ("Content",  {"fields": ("extracted_text",), "classes": ("collapse",)}),
        ("Meta",     {"fields": ("created_at",)}),
    )

    def mime_badge(self, obj):
        colours = {"pdf": "#ef4444", "png": "#8b5cf6", "jpg": "#f59e0b",
                   "csv": "#10b981", "json": "#3b82f6", "txt": "#94a3b8", "docx": "#6366f1"}
        ext = obj.file_name.rsplit(".", 1)[-1].lower() if "." in obj.file_name else "?"
        return _badge(ext.upper(), colours.get(ext, "#64748b"))
    mime_badge.short_description = "Type"

    def size_display(self, obj):
        size = obj.file_size
        if size >= 1_000_000:
            label, col = f"{size/1_000_000:.1f} MB", "#ef4444"
        elif size >= 1_000:
            label, col = f"{size/1_000:.1f} KB", "#f59e0b"
        else:
            label, col = f"{size} B", "#94a3b8"
        return format_html('<span style="color:{};font-weight:600;">{}</span>', col, label)
    size_display.short_description = "Size"


# ══════════════════════════════════════════════════════════════════════════════
# AGENT ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display       = ("avatar_img", "name", "owner", "model", "public_badge", "active_badge",
                          "knowledge_base", "tool_count", "created_at")
    list_display_links = ("name",)
    list_filter        = ("is_public", "is_active", "model", "created_at")
    search_fields      = ("name", "description", "owner__email")
    ordering           = ("-created_at",)
    readonly_fields    = ("id", "created_at", "updated_at", "avatar_img")
    filter_horizontal  = ("datasets",)
    list_per_page      = 20

    fieldsets = (
        ("Identity",      {"fields": ("id", "name", "description", "avatar_img", "avatar_url")}),
        ("Behaviour",     {"fields": ("system_prompt",)}),
        ("Config",        {"fields": ("model", "knowledge_base", "tools_config")}),
        ("Training Data", {"fields": ("datasets",)}),
        ("Status",        {"fields": ("is_public", "is_active", "owner")}),
        ("Timestamps",    {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def avatar_img(self, obj):
        if obj.avatar_url:
            return format_html(
                '<img src="{}" style="width:32px;height:32px;border-radius:8px;object-fit:cover;border:2px solid #8b5cf6;" />',
                obj.avatar_url,
            )
        icons = {"🤖": "#6366f1", "🧠": "#8b5cf6", "💼": "#3b82f6"}
        return format_html('<span style="font-size:1.5rem;">🤖</span>')
    avatar_img.short_description = ""

    def public_badge(self, obj):
        return _badge("PUBLIC", "#10b981") if obj.is_public else _badge("PRIVATE", "#64748b")
    public_badge.short_description = "Visibility"

    def active_badge(self, obj):
        return (format_html('<span style="color:#22c55e;font-weight:700;">● Active</span>') if obj.is_active
                else format_html('<span style="color:#ef4444;font-weight:700;">● Inactive</span>'))
    active_badge.short_description = "Status"

    def tool_count(self, obj):
        n = len(obj.tools_config)
        return format_html('<span style="color:#a78bfa;font-weight:700;">🔧 {}</span>', n)
    tool_count.short_description = "Tools"


# ══════════════════════════════════════════════════════════════════════════════
# PROMPT TEMPLATE ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(PromptTemplate)
class PromptTemplateAdmin(admin.ModelAdmin):
    list_display       = ("name", "category_badge", "public_badge", "content_preview", "created_by", "created_at")
    list_display_links = ("name",)
    list_filter        = ("category", "is_public", "created_at")
    search_fields      = ("name", "description", "content", "category")
    ordering           = ("category", "name")
    readonly_fields    = ("id", "created_at")
    list_per_page      = 25

    CATEGORY_COLOURS = {
        "coding":    "#6366f1", "writing": "#10b981", "data":     "#3b82f6",
        "research":  "#8b5cf6", "education": "#f59e0b", "business": "#ec4899",
        "legal":     "#ef4444", "finance": "#f97316",  "support":  "#14b8a6",
        "marketing": "#84cc16", "security": "#dc2626",
    }

    def category_badge(self, obj):
        col = self.CATEGORY_COLOURS.get(obj.category, "#64748b")
        return _badge(obj.category.upper(), col) if obj.category else format_html('<span style="color:#334155;">—</span>')
    category_badge.short_description = "Category"
    category_badge.admin_order_field = "category"

    def public_badge(self, obj):
        return _badge("PUBLIC", "#10b981") if obj.is_public else _badge("PRIVATE", "#64748b")
    public_badge.short_description = "Visibility"

    def content_preview(self, obj):
        return format_html(
            '<span style="color:#94a3b8;font-size:.82rem;font-style:italic;">{}</span>',
            obj.content[:80] + "…",
        )
    content_preview.short_description = "Preview"


# ══════════════════════════════════════════════════════════════════════════════
# USER PREFERENCE ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display       = ("user", "theme_badge", "font_size", "language", "memory_badge",
                          "analytics_badge", "default_model", "updated_at")
    list_display_links = ("user",)
    list_filter        = ("theme", "font_size", "language", "memory_enabled", "analytics_opt_in")
    search_fields      = ("user__email",)
    ordering           = ("-updated_at",)
    readonly_fields    = ("updated_at",)
    list_per_page      = 25

    THEME_COLOURS = {"dark": ("#1e293b", "#e2e8f0"), "light": ("#f8fafc", "#1e293b"), "system": ("#6366f1", "#fff")}

    def theme_badge(self, obj):
        bg, fg = self.THEME_COLOURS.get(obj.theme, ("#64748b", "#fff"))
        icons  = {"dark": "🌙", "light": "☀️", "system": "💻"}
        return _badge(f"{icons.get(obj.theme, '')} {obj.theme.upper()}", bg, fg)
    theme_badge.short_description = "Theme"

    def memory_badge(self, obj):
        return (_badge("✓ Memory", "#10b981") if obj.memory_enabled
                else _badge("✗ Memory", "#64748b"))
    memory_badge.short_description = "Memory"

    def analytics_badge(self, obj):
        return (_badge("✓ Analytics", "#3b82f6") if obj.analytics_opt_in
                else _badge("✗ Analytics", "#64748b"))
    analytics_badge.short_description = "Analytics"


# ══════════════════════════════════════════════════════════════════════════════
# USAGE RECORD ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(UsageRecord)
class UsageRecordAdmin(admin.ModelAdmin):
    list_display       = ("user", "model", "date", "requests_display", "prompt_tokens_display",
                          "completion_tokens_display", "total_tokens_display", "error_display")
    list_display_links = ("user",)
    list_filter        = ("model", "date")
    search_fields      = ("user__email",)
    ordering           = ("-date",)
    readonly_fields    = ("id",)
    date_hierarchy     = "date"
    list_per_page      = 30

    def requests_display(self, obj):
        return format_html('<span style="color:#3b82f6;font-weight:700;">{:,}</span>', obj.request_count)
    requests_display.short_description = "Requests"
    requests_display.admin_order_field = "request_count"

    def _token_badge(self, n, thresholds=((200000, "#ef4444"), (50000, "#f59e0b"), (0, "#22c55e"))):
        col = next(c for limit, c in thresholds if n >= limit)
        return format_html('<span style="color:{};font-weight:600;">{:,}</span>', col, n)

    def prompt_tokens_display(self, obj):
        return self._token_badge(obj.prompt_tokens)
    prompt_tokens_display.short_description = "Prompt Tok."
    prompt_tokens_display.admin_order_field = "prompt_tokens"

    def completion_tokens_display(self, obj):
        return self._token_badge(obj.completion_tokens)
    completion_tokens_display.short_description = "Completion Tok."

    def total_tokens_display(self, obj):
        return self._token_badge(obj.total_tokens)
    total_tokens_display.short_description = "Total Tok."
    total_tokens_display.admin_order_field = "total_tokens"

    def error_display(self, obj):
        if obj.error_count == 0:
            return format_html('<span style="color:#22c55e;">✓ 0</span>')
        col = "#f59e0b" if obj.error_count < 5 else "#ef4444"
        return format_html('<span style="color:{};font-weight:700;">⚠ {}</span>', col, obj.error_count)
    error_display.short_description = "Errors"


# ══════════════════════════════════════════════════════════════════════════════
# FEEDBACK ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display       = ("rating_display", "user", "category_badge", "comment_preview", "message_link", "created_at")
    list_display_links = ("comment_preview",)
    list_filter        = ("rating", "category", "created_at")
    search_fields      = ("user__email", "comment", "category")
    ordering           = ("-created_at",)
    readonly_fields    = ("id", "created_at")
    date_hierarchy     = "created_at"
    list_per_page      = 30

    CATEGORY_COLOURS = {
        "accuracy": "#ef4444", "helpfulness": "#22c55e", "tone": "#3b82f6",
        "formatting": "#8b5cf6", "speed": "#f59e0b", "": "#64748b",
    }

    def rating_display(self, obj):
        if obj.rating > 0:
            return format_html('<span style="font-size:1.3rem;" title="Positive">👍</span>')
        return format_html('<span style="font-size:1.3rem;" title="Negative">👎</span>')
    rating_display.short_description = "Rating"
    rating_display.admin_order_field = "rating"

    def category_badge(self, obj):
        col = self.CATEGORY_COLOURS.get(obj.category, "#64748b")
        label = obj.category.upper() if obj.category else "—"
        return _badge(label, col) if obj.category else format_html('<span style="color:#334155;">—</span>')
    category_badge.short_description = "Category"

    def comment_preview(self, obj):
        if not obj.comment:
            return format_html('<span style="color:#334155;font-style:italic;">No comment</span>')
        return format_html('<span style="color:#cbd5e1;font-size:.85rem;">{}</span>', obj.comment[:70])
    comment_preview.short_description = "Comment"

    def message_link(self, obj):
        url = reverse("admin:chat_message_change", args=[obj.message_id])
        return format_html('<a href="{}" style="color:#6366f1;font-size:.82rem;">View message ↗</a>', url)
    message_link.short_description = "Message"


# ══════════════════════════════════════════════════════════════════════════════
# TRAINING SAMPLE ADMIN (standalone)
# ══════════════════════════════════════════════════════════════════════════════

@admin.register(TrainingSample)
class TrainingSampleAdmin(admin.ModelAdmin):
    list_display       = ("prompt_preview", "dataset", "quality_bar", "source", "created_at")
    list_display_links = ("prompt_preview",)
    list_filter        = ("dataset", "created_at")
    search_fields      = ("prompt", "completion", "source")
    ordering           = ("-created_at",)
    readonly_fields    = ("id", "created_at", "quality_bar")
    list_per_page      = 40

    fieldsets = (
        ("Content",  {"fields": ("id", "dataset", "prompt", "completion", "system")}),
        ("Quality",  {"fields": ("quality", "quality_bar", "source")}),
        ("Meta",     {"fields": ("metadata", "created_at")}),
    )

    def prompt_preview(self, obj):
        return format_html('<span style="color:#cbd5e1;font-size:.85rem;">{}</span>', obj.prompt[:80])
    prompt_preview.short_description = "Prompt"

    def quality_bar(self, obj):
        pct = int(obj.quality * 100)
        col = "#22c55e" if pct >= 80 else "#f59e0b" if pct >= 50 else "#ef4444"
        return format_html(
            '<div style="background:#1e293b;border-radius:4px;height:10px;width:100px;'
            'overflow:hidden;display:inline-block;vertical-align:middle;">'
            '<div style="background:{};height:100%;width:{}%;border-radius:4px;"></div></div>'
            '&nbsp;<span style="color:{};font-size:.8rem;font-weight:700;">{}%</span>',
            col, pct, col, pct,
        )
    quality_bar.short_description = "Quality"