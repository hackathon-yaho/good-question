package com.goodquestion.backend.voice.service;

import org.springframework.web.multipart.MultipartFile;

public interface SttService {

    String transcribe(MultipartFile audio);
}
