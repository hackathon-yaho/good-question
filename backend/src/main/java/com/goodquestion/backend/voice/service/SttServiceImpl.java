package com.goodquestion.backend.voice.service;

import com.goodquestion.backend.voice.client.OpenAiSttClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** B-13. 인식 결과가 없으면 빈 문자열을 그대로 반환한다 — 프론트가 그때 /messages를 호출하지 않는다 (api.md ①). */
@Slf4j
@Service
@RequiredArgsConstructor
public class SttServiceImpl implements SttService {

    private final OpenAiSttClient openAiSttClient;

    @Override
    public String transcribe(MultipartFile audio) {
        if (audio == null || audio.isEmpty()) return "";
        // 진단용 임시 로그(D-42/43 환각 재현 확인) — 실사용 정착되면 제거한다.
        log.info("[STT] 수신 오디오: {}바이트, contentType={}, filename={}",
                audio.getSize(), audio.getContentType(), audio.getOriginalFilename());
        String text = openAiSttClient.transcribe(audio).trim();
        log.info("[STT] 인식 결과: \"{}\"", text);
        return text;
    }
}
