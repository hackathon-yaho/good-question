package com.goodquestion.backend.voice.controller;

import com.goodquestion.backend.voice.dto.response.SttResponse;
import com.goodquestion.backend.voice.service.SttService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/stt")
@RequiredArgsConstructor
public class SttController {

    private final SttService sttService;

    @PostMapping
    public SttResponse transcribe(@RequestParam("audio") MultipartFile audio) {
        return SttResponse.of(sttService.transcribe(audio));
    }
}
