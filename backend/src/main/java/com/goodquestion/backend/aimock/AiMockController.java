package com.goodquestion.backend.aimock;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * AI 서버 mock 스텁 (B-11, work-items.md 7장). 실제 AI 서버가 없는 동안 백엔드 전체 흐름을
 * 검증하기 위한 임시 대역이다. 고정 JSON만 반환한다 — 요청 내용은 보지 않는다.
 *
 * "존재하지 않는 evidence를 반환하는 mock을 물리면 해당 요소가 삭제된다" 같은 케이스를
 * 테스트하려면 이 파일의 값을 직접 바꿔서 재기동한다 (plan.md Phase 4 완료 조건).
 *
 * 실제 AI 서버 주소가 정해지면(U-01) `AI_SERVER_BASE_URL`을 교체하고 이 컨트롤러는 지운다.
 */
@RestController
@RequestMapping("/mock-ai")
public class AiMockController {

    /**
     * childIntent만 발화 내용에 따라 갈라준다. 미션 노출 조건(PRD 7.6)이 childIntent를 보기 때문에
     * 고정값만 돌려주면 그 경로를 호출로 검증할 수 없어서다. 나머지 필드는 여전히 고정이다.
     */
    @PostMapping("/analyze")
    public Map<String, Object> analyze(@RequestBody(required = false) Map<String, Object> request) {
        String childUtterance = request == null ? "" : String.valueOf(request.getOrDefault("childUtterance", ""));
        boolean looksLikeProposal = childUtterance.contains("방귀") || childUtterance.contains("장대");

        return Map.of(
                "childIntent", looksLikeProposal ? "SOLUTION" : "PERSPECTIVE",
                "mainPoint", "며느리가 창피해서 참았던 것 같다",
                "detectedElements", List.of(
                        Map.of("type", "PERSPECTIVE", "evidence", "창피해서 계속 참았던 것 같아요")
                ),
                "utteranceValidity", "VALID"
        );
    }

    @PostMapping("/respond")
    public Map<String, Object> respond(@RequestBody(required = false) Map<String, Object> request) {
        return Map.of("text", "그랬구나, 네 말을 들으니 마음이 좀 놓이는구나.", "characterState", "MOVED");
    }
}
