package com.goodquestion.backend.voice.controller;

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

    @GetMapping(produces = "audio/mpeg")
    public byte[] getAudio(@AuthenticationPrincipal UUID parentId, @RequestParam UUID messageId) {
        return ttsService.getAudioForMessage(messageId, parentId);
    }
}
