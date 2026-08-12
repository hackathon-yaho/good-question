package com.goodquestion.backend.voice.controller;

import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.voice.service.TtsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/tts")
@RequiredArgsConstructor
public class TtsController {

    private final TtsService ttsService;

    /** messageId·text 중 하나만 받는다 (tts-audio-contract.md #1). */
    @GetMapping(produces = "audio/mpeg")
    public byte[] getAudio(@AuthenticationPrincipal UUID parentId,
                            @RequestParam(required = false) UUID messageId,
                            @RequestParam(required = false) String text) {
        if (messageId != null) {
            return ttsService.getAudioForMessage(messageId, parentId);
        }
        if (text != null && !text.isBlank()) {
            return ttsService.getAudioForText(text);
        }
        throw new BusinessException(ErrorCode.INVALID_REQUEST, "messageId 또는 text 중 하나는 필요합니다.");
    }
}
