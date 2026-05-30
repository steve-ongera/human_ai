import uuid
import secrets
import time

from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse
from django.db.models import Sum
from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from openai import OpenAI

from .models import (
    User, AIModel, TrainingDataset, TrainingSample,
    KnowledgeBase, KnowledgeDocument,
    Conversation, ConversationFolder, Message, Attachment,
    Agent, PromptTemplate, UserPreference, UsageRecord, Feedback,
)
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer, ChangePasswordSerializer,
    AIModelSerializer, AIModelListSerializer,
    TrainingDatasetSerializer, TrainingSampleSerializer, TrainingSampleBulkSerializer,
    KnowledgeBaseSerializer, KnowledgeDocumentSerializer,
    ConversationListSerializer, ConversationDetailSerializer,
    ConversationCreateSerializer, ConversationUpdateSerializer,
    ConversationFolderSerializer,
    MessageSerializer, MessageCreateSerializer,
    AttachmentSerializer,
    AgentSerializer, AgentListSerializer,
    PromptTemplateSerializer,
    UserPreferenceSerializer,
    UsageRecordSerializer,
    FeedbackSerializer,
    ChatCompletionRequestSerializer, RegenerateRequestSerializer,
    MessageRatingSerializer, ConversationShareSerializer,
)
from django.conf import settings


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def get_openai_client():
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# ──────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Create default preferences
        UserPreference.objects.get_or_create(user=user)
        tokens = get_tokens_for_user(user)
        return Response(
            {"user": UserSerializer(user).data, **tokens},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = get_tokens_for_user(user)
        return Response({"user": UserSerializer(user).data, **tokens})


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
        return Response({"detail": "Logged out."}, status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated."})


# ──────────────────────────────────────────────
# AI MODELS
# ──────────────────────────────────────────────

class AIModelViewSet(viewsets.ModelViewSet):
    queryset = AIModel.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == "list":
            return AIModelListSerializer
        return AIModelSerializer

    @action(detail=False, methods=["get"])
    def default(self, request):
        model = AIModel.objects.filter(is_default=True, is_active=True).first()
        if not model:
            model = AIModel.objects.filter(is_active=True).first()
        if not model:
            return Response({"detail": "No model configured."}, status=404)
        return Response(AIModelSerializer(model).data)


# ──────────────────────────────────────────────
# TRAINING DATA
# ──────────────────────────────────────────────

class TrainingDatasetViewSet(viewsets.ModelViewSet):
    serializer_class = TrainingDatasetSerializer

    def get_queryset(self):
        return TrainingDataset.objects.filter(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="bulk-samples")
    def bulk_samples(self, request, pk=None):
        dataset = self.get_object()
        samples_data = request.data.get("samples", [])
        objs = [
            TrainingSample(dataset=dataset, **{
                k: v for k, v in s.items()
                if k in ["prompt", "completion", "system", "source", "quality", "metadata"]
            })
            for s in samples_data
        ]
        created = TrainingSample.objects.bulk_create(objs)
        return Response({"created": len(created)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def samples(self, request, pk=None):
        dataset = self.get_object()
        qs = dataset.samples.all()
        serializer = TrainingSampleSerializer(qs, many=True)
        return Response(serializer.data)


class TrainingSampleViewSet(viewsets.ModelViewSet):
    serializer_class = TrainingSampleSerializer

    def get_queryset(self):
        return TrainingSample.objects.filter(dataset__created_by=self.request.user)


# ──────────────────────────────────────────────
# KNOWLEDGE BASE
# ──────────────────────────────────────────────

class KnowledgeBaseViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeBaseSerializer

    def get_queryset(self):
        user = self.request.user
        return KnowledgeBase.objects.filter(
            created_by=user
        ) | KnowledgeBase.objects.filter(is_public=True)

    @action(detail=True, methods=["get", "post"], url_path="documents")
    def documents(self, request, pk=None):
        kb = self.get_object()
        if request.method == "GET":
            docs = kb.documents.all()
            return Response(KnowledgeDocumentSerializer(docs, many=True).data)
        serializer = KnowledgeDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(knowledge_base=kb)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class KnowledgeDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeDocumentSerializer

    def get_queryset(self):
        return KnowledgeDocument.objects.filter(
            knowledge_base__created_by=self.request.user
        )


# ──────────────────────────────────────────────
# CONVERSATIONS & MESSAGES
# ──────────────────────────────────────────────

class ConversationFolderViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationFolderSerializer

    def get_queryset(self):
        return ConversationFolder.objects.filter(user=self.request.user)


class ConversationViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = Conversation.objects.filter(user=self.request.user)
        archived = self.request.query_params.get("archived")
        if archived == "true":
            qs = qs.filter(is_archived=True)
        elif archived == "false":
            qs = qs.filter(is_archived=False)
        folder_id = self.request.query_params.get("folder")
        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ConversationListSerializer
        if self.action in ("create",):
            return ConversationCreateSerializer
        if self.action in ("update", "partial_update"):
            return ConversationUpdateSerializer
        return ConversationDetailSerializer

    @action(detail=True, methods=["post"])
    def share(self, request, pk=None):
        convo = self.get_object()
        serializer = ConversationShareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data["enabled"]:
            if not convo.share_token:
                convo.share_token = secrets.token_urlsafe(32)
            convo.is_shared = True
        else:
            convo.is_shared = False
        convo.save()
        return Response(ConversationDetailSerializer(convo).data)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        convo = self.get_object()
        convo.is_archived = not convo.is_archived
        convo.save()
        return Response({"is_archived": convo.is_archived})

    @action(detail=True, methods=["post"])
    def pin(self, request, pk=None):
        convo = self.get_object()
        convo.is_pinned = not convo.is_pinned
        convo.save()
        return Response({"is_pinned": convo.is_pinned})

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        convo = self.get_object()
        msgs = convo.messages.all()
        return Response(MessageSerializer(msgs, many=True, context={"request": request}).data)


class SharedConversationView(APIView):
    """Public view for shared conversations."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        convo = get_object_or_404(Conversation, share_token=token, is_shared=True)
        return Response(ConversationDetailSerializer(convo).data)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer

    def get_queryset(self):
        return Message.objects.filter(conversation__user=self.request.user)

    @action(detail=True, methods=["post"])
    def rate(self, request, pk=None):
        message = self.get_object()
        serializer = MessageRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message.user_rating = serializer.validated_data["rating"]
        message.save()
        return Response({"user_rating": message.user_rating})


# ──────────────────────────────────────────────
# ATTACHMENTS
# ──────────────────────────────────────────────

class AttachmentUploadView(APIView):
    def post(self, request):
        file = request.FILES.get("file")
        conversation_id = request.data.get("conversation_id")
        if not file:
            return Response({"detail": "No file."}, status=400)

        convo = get_object_or_404(Conversation, pk=conversation_id, user=request.user)

        attachment = Attachment.objects.create(
            conversation=convo,
            user=request.user,
            file=file,
            file_name=file.name,
            file_size=file.size,
            mime_type=file.content_type or "",
        )
        return Response(
            AttachmentSerializer(attachment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────
# AGENTS
# ──────────────────────────────────────────────

class AgentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        return Agent.objects.filter(owner=user) | Agent.objects.filter(is_public=True)

    def get_serializer_class(self):
        if self.action == "list":
            return AgentListSerializer
        return AgentSerializer


# ──────────────────────────────────────────────
# PROMPT TEMPLATES
# ──────────────────────────────────────────────

class PromptTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = PromptTemplateSerializer

    def get_queryset(self):
        user = self.request.user
        return PromptTemplate.objects.filter(created_by=user) | PromptTemplate.objects.filter(is_public=True)


# ──────────────────────────────────────────────
# USER PREFERENCES
# ──────────────────────────────────────────────

class UserPreferenceView(generics.RetrieveUpdateAPIView):
    serializer_class = UserPreferenceSerializer

    def get_object(self):
        pref, _ = UserPreference.objects.get_or_create(user=self.request.user)
        return pref


# ──────────────────────────────────────────────
# USAGE / ANALYTICS
# ──────────────────────────────────────────────

class UsageView(APIView):
    def get(self, request):
        qs = UsageRecord.objects.filter(user=request.user)
        # Optional date range filter
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)

        records = UsageRecordSerializer(qs.order_by("-date"), many=True).data
        totals = qs.aggregate(
            total_tokens=Sum("total_tokens"),
            total_requests=Sum("request_count"),
        )
        return Response({"records": records, "totals": totals})


# ──────────────────────────────────────────────
# FEEDBACK
# ──────────────────────────────────────────────

class FeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = FeedbackSerializer
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        return Feedback.objects.filter(user=self.request.user)


# ──────────────────────────────────────────────
# CHAT COMPLETION  (OpenAI-backed)
# ──────────────────────────────────────────────

def _build_openai_messages(request_messages, system_prompt=None):
    """Convert our message format to OpenAI format."""
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    for m in request_messages:
        messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
    return messages


def _get_or_create_conversation(user, conversation_id, model_obj, system_prompt):
    if conversation_id:
        try:
            return Conversation.objects.get(pk=conversation_id, user=user)
        except Conversation.DoesNotExist:
            pass
    return Conversation.objects.create(
        user=user,
        model=model_obj,
        system_prompt=system_prompt or "",
        title="New Chat",
    )


def _update_usage(user, model_obj, usage):
    from django.utils import timezone
    record, _ = UsageRecord.objects.get_or_create(
        user=user, model=model_obj, date=timezone.now().date()
    )
    record.prompt_tokens += usage.prompt_tokens
    record.completion_tokens += usage.completion_tokens
    record.total_tokens += usage.total_tokens
    record.request_count += 1
    record.save()


class ChatCompletionView(APIView):
    """Non-streaming chat completion."""

    def post(self, request):
        serializer = ChatCompletionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Resolve model
        model_obj = None
        openai_model = "gpt-4o"
        if data.get("model_id"):
            try:
                model_obj = AIModel.objects.get(pk=data["model_id"], is_active=True)
                openai_model = model_obj.name
            except AIModel.DoesNotExist:
                pass

        # Resolve agent system prompt
        system_prompt = data.get("system_prompt", "")
        if data.get("agent_id"):
            try:
                agent = Agent.objects.get(pk=data["agent_id"])
                system_prompt = system_prompt or agent.system_prompt
                if not model_obj and agent.model:
                    model_obj = agent.model
                    openai_model = model_obj.name
            except Agent.DoesNotExist:
                pass

        messages = _build_openai_messages(data["messages"], system_prompt)

        client = get_openai_client()
        start = time.time()

        try:
            response = client.chat.completions.create(
                model=openai_model,
                messages=messages,
                temperature=data["temperature"],
                max_tokens=data["max_tokens"],
                top_p=data["top_p"],
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        latency = int((time.time() - start) * 1000)
        choice = response.choices[0]
        usage = response.usage

        # Persist conversation + messages
        convo = _get_or_create_conversation(
            request.user, data.get("conversation_id"), model_obj, system_prompt
        )

        # Save user message (last one from list)
        last_user_msg = next(
            (m for m in reversed(data["messages"]) if m.get("role") == "user"), None
        )
        if last_user_msg:
            Message.objects.create(
                conversation=convo,
                role="user",
                content=last_user_msg["content"],
                prompt_tokens=usage.prompt_tokens,
                model=model_obj,
                status="done",
            )

        # Save assistant message
        assistant_msg = Message.objects.create(
            conversation=convo,
            role="assistant",
            content=choice.message.content or "",
            model=model_obj,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens,
            latency_ms=latency,
            status="done",
        )

        # Update conversation title from first user message if untitled
        if convo.title == "New Chat" and last_user_msg:
            convo.title = last_user_msg["content"][:80]
            convo.save()

        _update_usage(request.user, model_obj, usage)

        return Response({
            "conversation_id": str(convo.id),
            "message": MessageSerializer(assistant_msg, context={"request": request}).data,
            "usage": {
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
            },
        })


class ChatStreamView(APIView):
    """Streaming chat completion via SSE."""

    def post(self, request):
        serializer = ChatCompletionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        model_obj = None
        openai_model = "gpt-4o"
        if data.get("model_id"):
            try:
                model_obj = AIModel.objects.get(pk=data["model_id"], is_active=True)
                openai_model = model_obj.name
            except AIModel.DoesNotExist:
                pass

        system_prompt = data.get("system_prompt", "")
        if data.get("agent_id"):
            try:
                agent = Agent.objects.get(pk=data["agent_id"])
                system_prompt = system_prompt or agent.system_prompt
            except Agent.DoesNotExist:
                pass

        messages = _build_openai_messages(data["messages"], system_prompt)
        convo = _get_or_create_conversation(
            request.user, data.get("conversation_id"), model_obj, system_prompt
        )

        client = get_openai_client()

        def event_stream():
            full_content = ""
            prompt_tokens = 0
            completion_tokens = 0
            try:
                stream = client.chat.completions.create(
                    model=openai_model,
                    messages=messages,
                    temperature=data["temperature"],
                    max_tokens=data["max_tokens"],
                    top_p=data["top_p"],
                    stream=True,
                    stream_options={"include_usage": True},
                )
                # Send conversation_id first
                yield f"data: {{\"conversation_id\": \"{convo.id}\"}}\n\n"

                for chunk in stream:
                    if chunk.usage:
                        prompt_tokens = chunk.usage.prompt_tokens
                        completion_tokens = chunk.usage.completion_tokens
                    delta = chunk.choices[0].delta if chunk.choices else None
                    if delta and delta.content:
                        full_content += delta.content
                        import json
                        yield f"data: {json.dumps({'delta': delta.content})}\n\n"

                # Save messages after stream completes
                last_user = next(
                    (m for m in reversed(data["messages"]) if m.get("role") == "user"), None
                )
                if last_user:
                    Message.objects.create(
                        conversation=convo, role="user",
                        content=last_user["content"], model=model_obj, status="done",
                    )
                assistant_msg = Message.objects.create(
                    conversation=convo, role="assistant",
                    content=full_content, model=model_obj,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens,
                    status="done",
                )
                if convo.title == "New Chat" and last_user:
                    convo.title = last_user["content"][:80]
                    convo.save()

                import json
                yield f"data: {json.dumps({'done': True, 'message_id': str(assistant_msg.id)})}\n\n"
            except Exception as exc:
                import json
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class RegenerateView(APIView):
    """Regenerate the last assistant message."""

    def post(self, request):
        serializer = RegenerateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        message = get_object_or_404(
            Message, pk=data["message_id"],
            conversation__user=request.user, role="assistant"
        )
        convo = message.conversation

        # Collect history before this message
        history = list(
            convo.messages.filter(created_at__lt=message.created_at)
            .values("role", "content")
        )
        system_prompt = convo.system_prompt or ""
        messages = _build_openai_messages(history, system_prompt)

        model_obj = convo.model
        openai_model = model_obj.name if model_obj else "gpt-4o"

        client = get_openai_client()
        try:
            response = client.chat.completions.create(
                model=openai_model,
                messages=messages,
                temperature=data["temperature"],
                max_tokens=data["max_tokens"],
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=502)

        choice = response.choices[0]
        message.content = choice.message.content or ""
        message.is_edited = True
        message.prompt_tokens = response.usage.prompt_tokens
        message.completion_tokens = response.usage.completion_tokens
        message.total_tokens = response.usage.total_tokens
        message.save()

        return Response(MessageSerializer(message, context={"request": request}).data)