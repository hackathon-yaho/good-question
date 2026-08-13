package com.goodquestion.backend.voice.service;

import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.message.enums.SpeakerType;
import com.goodquestion.backend.message.repository.MessageRepository;
import com.goodquestion.backend.voice.client.OpenAiTtsClient;
import com.goodquestion.backend.voice.entity.TtsCache;
import com.goodquestion.backend.voice.repository.TtsCacheRepository;
import com.goodquestion.backend.voice.support.VoiceProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

/**
 * B-16, B-17. 캐시 키는 messageId가 아니라 텍스트 해시다 — 같은 문장이면 세션이 달라도 캐시를
 * 공유한다 (D-05). D-35부터는 캐릭터마다 목소리·연기 지시가 달라지므로, 해시 입력에 텍스트뿐
 * 아니라 voice·instructions도 함께 넣는다 — 같은 문장이라도 화자가 다르면 다른 오디오다.
 */
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
        VoiceProfile profile = message.getSpeakerType() == SpeakerType.CHARACTER
                ? VoiceProfile.forScene(message.getScene())
                : VoiceProfile.NARRATOR;
        return getOrGenerate(message.getText(), profile);
    }

    @Override
    @Transactional
    public byte[] getAudioForText(String text) {
        return getOrGenerate(text, VoiceProfile.NARRATOR);
    }

    @Override
    @Transactional
    public boolean ensureCached(String text, String voice, String instructions) {
        VoiceProfile profile = new VoiceProfile(voice, instructions);
        String hash = hash(text, profile);
        if (ttsCacheRepository.findByTextHash(hash).isPresent()) return false;
        generate(hash, text, profile);
        return true;
    }

    private byte[] getOrGenerate(String text, VoiceProfile profile) {
        String hash = hash(text, profile);
        Optional<TtsCache> cached = ttsCacheRepository.findByTextHash(hash);
        return cached.isPresent() ? cached.get().getAudio() : generate(hash, text, profile);
    }

    private byte[] generate(String hash, String text, VoiceProfile profile) {
        byte[] audio = openAiTtsClient.synthesize(text, profile.voice(), profile.instructions());
        ttsCacheRepository.save(TtsCache.create(hash, audio));
        return audio;
    }

    private String hash(String text, VoiceProfile profile) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String input = profile.voice() + "|" + profile.instructions() + "|" + text;
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
