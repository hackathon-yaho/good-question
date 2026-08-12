package com.goodquestion.backend.message.service.ai;

/** api.md 4.2 — analysis에는 childIntent·mainPoint만 넘긴다. detectedElements·utteranceValidity는 넣지 않는다. */
public record RespondAnalysisPayload(String childIntent, String mainPoint) {
}
