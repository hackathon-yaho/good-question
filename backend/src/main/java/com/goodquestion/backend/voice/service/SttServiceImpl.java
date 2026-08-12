package com.goodquestion.backend.voice.service;

import com.goodquestion.backend.voice.client.OpenAiSttClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** B-13. 인식 결과가 없으면 빈 문자열을 그대로 반환한다 — 프론트가 그때 /messages를 호출하지 않는다 (api.md ①). */
@Service
@RequiredArgsConstructor
public class SttServiceImpl implements SttService {

    private final OpenAiSttClient openAiSttClient;

    @Override
    public String transcribe(MultipartFile audio) {
        if (audio == null || audio.isEmpty()) return "";
        return openAiSttClient.transcribe(audio).trim();
    }
}
