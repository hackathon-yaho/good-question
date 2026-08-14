class AIServiceError(Exception):
    """Base error that is safe to map to a public service error."""


class ModelTimeoutError(AIServiceError):
    pass


class ModelUpstreamError(AIServiceError):
    pass
