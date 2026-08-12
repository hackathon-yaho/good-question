package com.goodquestion.backend.health.controller;

import com.goodquestion.backend.health.service.HealthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * B-22. Render 무료 티어 슬립 + Supabase 일시정지를 동시에 방어한다 — 요청 하나로 앱과 DB를
 * 둘 다 깨운다. api.md 계약에 없는 운영 전용 엔드포인트라 ErrorCode/BusinessException을
 * 쓰지 않고 여기서 바로 응답한다.
 */
@Slf4j
@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
public class HealthController {

    private final HealthService healthService;

    @GetMapping
    public ResponseEntity<Map<String, String>> check() {
        try {
            healthService.checkDatabase();
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (Exception e) {
            log.error("[HealthController] DB 헬스체크 실패", e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("status", "down"));
        }
    }
}
