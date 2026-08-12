package com.goodquestion.backend.voice.client;

import org.springframework.web.multipart.MultipartFile;

public interface OpenAiSttClient {

    String transcribe(MultipartFile audio);
}
