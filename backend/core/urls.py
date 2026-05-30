from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = DefaultRouter()
router.register(r"models",           views.AIModelViewSet,            basename="aimodel")
router.register(r"datasets",         views.TrainingDatasetViewSet,    basename="dataset")
router.register(r"samples",          views.TrainingSampleViewSet,     basename="sample")
router.register(r"knowledge-bases",  views.KnowledgeBaseViewSet,      basename="knowledgebase")
router.register(r"documents",        views.KnowledgeDocumentViewSet,  basename="document")
router.register(r"conversations",    views.ConversationViewSet,       basename="conversation")
router.register(r"messages",         views.MessageViewSet,            basename="message")
router.register(r"agents",           views.AgentViewSet,              basename="agent")
router.register(r"prompt-templates", views.PromptTemplateViewSet,     basename="prompttemplate")
router.register(r"feedback",         views.FeedbackViewSet,           basename="feedback")
router.register(r"folders",          views.ConversationFolderViewSet, basename="folder")

urlpatterns = [
    # ── Auth ──────────────────────────────────────────
    path("auth/register/",        views.RegisterView.as_view(),       name="register"),
    path("auth/login/",           views.LoginView.as_view(),          name="login"),
    path("auth/logout/",          views.LogoutView.as_view(),         name="logout"),
    path("auth/token/refresh/",   TokenRefreshView.as_view(),         name="token_refresh"),
    path("auth/me/",              views.MeView.as_view(),             name="me"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change_password"),

    # ── Chat completions ──────────────────────────────
    path("chat/completions/",     views.ChatCompletionView.as_view(), name="chat_completion"),
    path("chat/stream/",          views.ChatStreamView.as_view(),     name="chat_stream"),
    path("chat/regenerate/",      views.RegenerateView.as_view(),     name="regenerate"),

    # ── File uploads ──────────────────────────────────
    path("attachments/upload/",   views.AttachmentUploadView.as_view(), name="attachment_upload"),

    # ── Preferences ───────────────────────────────────
    path("preferences/",          views.UserPreferenceView.as_view(), name="preferences"),

    # ── Usage / analytics ─────────────────────────────
    path("usage/",                views.UsageView.as_view(),          name="usage"),

    # ── Shared conversations (public) ─────────────────
    path("shared/<str:token>/",   views.SharedConversationView.as_view(), name="shared_conversation"),

    # ── ViewSet routes ────────────────────────────────
    path("", include(router.urls)),
]