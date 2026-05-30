# chat/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    User, AIModel, TrainingDataset, TrainingSample,
    KnowledgeBase, KnowledgeDocument,
    Conversation, ConversationFolder, Message, Attachment,
    Agent, PromptTemplate, UserPreference, UsageRecord, Feedback,
)


# ──────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ["id", "email", "username", "password", "password2"]

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data["email"], password=data["password"])
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        data["user"] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ["id", "email", "username", "first_name", "last_name",
                  "avatar_url", "plan", "created_at"]
        read_only_fields = ["id", "plan", "created_at"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Wrong current password.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


# ──────────────────────────────────────────────
# AI MODELS
# ──────────────────────────────────────────────

class AIModelSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AIModel
        fields = [
            "id", "name", "display_name", "description",
            "version", "model_type", "model_path", "tokenizer_path",
            "inference_config", "context_length", "max_output_tokens",
            "is_active", "is_default", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AIModelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns."""
    class Meta:
        model  = AIModel
        fields = ["id", "name", "display_name", "description",
                  "model_type", "context_length", "is_default"]


# ──────────────────────────────────────────────
# TRAINING DATA
# ──────────────────────────────────────────────

class TrainingDatasetSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    sample_count = serializers.SerializerMethodField()

    class Meta:
        model  = TrainingDataset
        fields = ["id", "name", "description", "file_path", "format",
                  "num_samples", "sample_count", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_sample_count(self, obj):
        return obj.samples.count()

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class TrainingSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TrainingSample
        fields = ["id", "dataset", "prompt", "completion", "system",
                  "source", "quality", "metadata", "created_at"]
        read_only_fields = ["id", "created_at"]


class TrainingSampleBulkSerializer(serializers.Serializer):
    dataset_id = serializers.UUIDField()
    samples    = TrainingSampleSerializer(many=True)

    def create(self, validated_data):
        dataset = TrainingDataset.objects.get(pk=validated_data["dataset_id"])
        objs = [
            TrainingSample(dataset=dataset, **s)
            for s in validated_data["samples"]
        ]
        return TrainingSample.objects.bulk_create(objs)


# ──────────────────────────────────────────────
# KNOWLEDGE BASE
# ──────────────────────────────────────────────

class KnowledgeBaseSerializer(serializers.ModelSerializer):
    document_count = serializers.SerializerMethodField()

    class Meta:
        model  = KnowledgeBase
        fields = ["id", "name", "description", "model", "is_public",
                  "document_count", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at", "document_count"]

    def get_document_count(self, obj):
        return obj.documents.count()

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class KnowledgeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = KnowledgeDocument
        fields = ["id", "knowledge_base", "title", "content", "source_url",
                  "file_path", "embedding_model", "chunk_index", "metadata", "created_at"]
        read_only_fields = ["id", "created_at", "embedding"]


# ──────────────────────────────────────────────
# CONVERSATIONS & MESSAGES
# ──────────────────────────────────────────────

class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model  = Attachment
        fields = ["id", "file_name", "file_size", "mime_type", "url", "created_at"]
        read_only_fields = ["id", "file_size", "mime_type", "created_at", "url"]

    def get_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class MessageSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    model_name  = serializers.CharField(source="model.display_name", read_only=True, default=None)

    class Meta:
        model  = Message
        fields = [
            "id", "conversation", "role", "content",
            "tool_name", "tool_input", "tool_output",
            "model", "model_name",
            "prompt_tokens", "completion_tokens", "total_tokens", "latency_ms",
            "user_rating", "is_edited", "parent_message",
            "status", "rag_sources", "metadata",
            "attachments", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "model_name", "prompt_tokens", "completion_tokens",
            "total_tokens", "latency_ms", "status", "created_at", "updated_at",
        ]


class MessageCreateSerializer(serializers.Serializer):
    """Used when sending a new user message."""
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    content         = serializers.CharField()
    model_id        = serializers.UUIDField(required=False, allow_null=True)
    agent_id        = serializers.UUIDField(required=False, allow_null=True)
    attachment_ids  = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight — for sidebar list."""
    model_name = serializers.CharField(source="model.display_name", read_only=True, default=None)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model  = Conversation
        fields = ["id", "title", "model_name", "is_pinned", "is_archived",
                  "message_count", "created_at", "updated_at"]

    def get_message_count(self, obj):
        return obj.messages.count()


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    model    = AIModelListSerializer(read_only=True)

    class Meta:
        model  = Conversation
        fields = [
            "id", "title", "model", "system_prompt",
            "is_archived", "is_pinned", "is_shared", "share_token",
            "knowledge_base", "folder", "metadata",
            "messages", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "share_token", "created_at", "updated_at"]


class ConversationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Conversation
        fields = ["title", "model", "system_prompt", "knowledge_base", "folder"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ConversationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Conversation
        fields = ["title", "model", "system_prompt",
                  "is_archived", "is_pinned", "folder"]


class ConversationFolderSerializer(serializers.ModelSerializer):
    conversation_count = serializers.SerializerMethodField()

    class Meta:
        model  = ConversationFolder
        fields = ["id", "name", "color", "conversation_count", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_conversation_count(self, obj):
        return obj.conversations.count()

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


# ──────────────────────────────────────────────
# AGENTS
# ──────────────────────────────────────────────

class AgentSerializer(serializers.ModelSerializer):
    owner      = UserSerializer(read_only=True)
    model_info = AIModelListSerializer(source="model", read_only=True)

    class Meta:
        model  = Agent
        fields = [
            "id", "owner", "name", "description", "avatar_url",
            "system_prompt", "model", "model_info", "knowledge_base",
            "tools_config", "is_public", "is_active", "datasets",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "model_info", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        datasets = validated_data.pop("datasets", [])
        agent = super().create(validated_data)
        agent.datasets.set(datasets)
        return agent


class AgentListSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Agent
        fields = ["id", "name", "description", "avatar_url",
                  "is_public", "is_active", "created_at"]


# ──────────────────────────────────────────────
# PROMPT TEMPLATES
# ──────────────────────────────────────────────

class PromptTemplateSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model  = PromptTemplate
        fields = ["id", "name", "description", "content",
                  "category", "is_public", "created_by", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


# ──────────────────────────────────────────────
# USER PREFERENCES
# ──────────────────────────────────────────────

class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserPreference
        fields = [
            "default_model", "default_agent", "theme", "font_size",
            "language", "send_on_enter", "show_code_line_nums",
            "memory_enabled", "analytics_opt_in", "custom_instructions",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


# ──────────────────────────────────────────────
# USAGE
# ──────────────────────────────────────────────

class UsageRecordSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source="model.display_name", read_only=True, default=None)

    class Meta:
        model  = UsageRecord
        fields = ["id", "model", "model_name", "date",
                  "prompt_tokens", "completion_tokens", "total_tokens",
                  "request_count", "error_count"]
        read_only_fields = ["id"]


# ──────────────────────────────────────────────
# FEEDBACK
# ──────────────────────────────────────────────

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Feedback
        fields = ["id", "message", "rating", "category", "comment", "created_at"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


# ──────────────────────────────────────────────
# INFERENCE (chat completion)
# ──────────────────────────────────────────────

class ChatCompletionRequestSerializer(serializers.Serializer):
    """Payload for POST /api/chat/completions/ (streaming)."""
    model_id       = serializers.UUIDField(required=False, allow_null=True)
    agent_id       = serializers.UUIDField(required=False, allow_null=True)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    messages       = serializers.ListField(child=serializers.DictField())
    stream         = serializers.BooleanField(default=True)
    temperature    = serializers.FloatField(default=0.7, min_value=0.0, max_value=2.0)
    max_tokens     = serializers.IntegerField(default=1024, min_value=1, max_value=8192)
    top_p          = serializers.FloatField(default=1.0, min_value=0.0, max_value=1.0)
    system_prompt  = serializers.CharField(required=False, allow_blank=True)
    knowledge_base_id = serializers.UUIDField(required=False, allow_null=True)


class RegenerateRequestSerializer(serializers.Serializer):
    """Regenerate the last assistant message."""
    message_id  = serializers.UUIDField()
    temperature = serializers.FloatField(default=0.7)
    max_tokens  = serializers.IntegerField(default=1024)


class MessageRatingSerializer(serializers.Serializer):
    message_id = serializers.UUIDField()
    rating     = serializers.ChoiceField(choices=[1, -1])


class ConversationShareSerializer(serializers.Serializer):
    """Enable/disable sharing for a conversation."""
    enabled = serializers.BooleanField()