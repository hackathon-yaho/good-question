package com.goodquestion.backend.health.service;

public interface HealthService {

    /** DB에 `SELECT 1`을 날려 연결을 확인한다. 실패하면 예외가 그대로 올라간다. */
    void checkDatabase();
}
