package com.goodquestion.backend.voice.service;

import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.message.repository.MessageRepository;
import com.goodquestion.backend.voice.client.OpenAiTtsClient;
import com.goodquestion.backend.voice.entity.TtsCache;
import com.goodquestion.backend.voice.repository.TtsCacheRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

/** B-16, B-17. 캐시 키는 messageId가 아니라 텍스트 해시다 — 같은 문장이면 세션이 달라도 캐시를 공유한다 (D-05). */
@Service
@RequiredArgsConstructor
public class TtsServiceImpl implements TtsService {

    private final MessageRepository messageRepository;
    private final TtsCacheRepository ttsCacheRepository;
    private final OpenAiTtsClient openAiTtsClient;

    @Override
    @Transactional
    public byte[] getAudioForMessage(UUID messageId, UUID parentId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!message.getSession().getChild().getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return getOrGenerate(message.getText());
    }

    @Override
    @Transactional
    public byte[] getAudioForText(String text) {
        return getOrGenerate(text);
    }

    @Override
    @Transactional
    public boolean ensureCached(String text) {
        String hash = hash(text);
        if (ttsCacheRepository.findByTextHash(hash).isPresent()) return false;
        generate(hash, text);
        return true;
    }

    private byte[] getOrGenerate(String text) {
        String hash = hash(text);
        Optional<TtsCache> cached = ttsCacheRepository.findByTextHash(hash);
        return cached.isPresent() ? cached.get().getAudio() : generate(hash, text);
    }

    private byte[] generate(String hash, String text) {
        byte[] audio = openAiTtsClient.synthesize(text);
        ttsCacheRepository.save(TtsCache.create(hash, audio));
        return audio;
    }

    private String hash(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
