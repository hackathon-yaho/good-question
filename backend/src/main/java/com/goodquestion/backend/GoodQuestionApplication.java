package com.goodquestion.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/** @EnableAsync — 보호자 리포트 AI 고도화(parent-report-ai-generation.md)가 @Async로 백그라운드 실행된다. */
@EnableAsync
@SpringBootApplication
public class GoodQuestionApplication {

	public static void main(String[] args) {
		SpringApplication.run(GoodQuestionApplication.class, args);
	}
}
