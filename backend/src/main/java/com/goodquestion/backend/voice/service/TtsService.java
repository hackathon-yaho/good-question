package com.goodquestion.backend.voice.service;

import java.util.UUID;

public interface TtsService {

    /** GET /api/tts?messageId=. 소유권 검증 후 캐시 히트 시 즉시, 미스 시 생성 후 반환한다. */
    byte[] getAudioForMessage(UUID messageId, UUID parentId);

    /** GET /api/tts?text=. messageId가 없는 내레이션·단어 발음용 (tts-audio-contract.md #1). */
    byte[] getAudioForText(String text);

    /** 기동 시 프리워밍(B-18) 전용. 이미 캐시에 있으면 아무것도 하지 않고 false를 반환한다. */
    boolean ensureCached(String text);
}
