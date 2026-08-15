package com.goodquestion.backend.aimock;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
    /** low-engagement-turn-protection.md가 정의한, AI 서버가 SHORT_RESPONSE+SHORT로 보정하는 키워드. */
    private static final List<String> ZERO_INFO_REJECTION_KEYWORDS = List.of("싫어", "몰라", "모르겠어", "닥쳐", "닥처");

    /**
     * 장면7(미션1) 요소별 감지 키워드. 한 발화에 여러 키워드가 같이 있으면 그만큼
     * detectedElements가 여러 개 나온다 — missionProgress.satisfiedIndexes가 한 턴에
     * 1개만 채워지는 경우와 여러 개가 한꺼번에 채워지는 경우를 둘 다 mock으로 재현하기 위함.
     */
    private static final List<ElementKeyword> ELEMENT_KEYWORDS = List.of(
            new ElementKeyword("SOLUTION", "방귀"),
            new ElementKeyword("SOLUTION", "장대"),
            new ElementKeyword("REASON", "세게"),
            new ElementKeyword("REQUEST", "부탁"),
            new ElementKeyword("RESULT", "떨어질")
    );

    private record ElementKeyword(String type, String keyword) {
    }

    @PostMapping("/analyze")
    public Map<String, Object> analyze(@RequestBody(required = false) Map<String, Object> request) {
        String childUtterance = request == null ? "" : String.valueOf(request.getOrDefault("childUtterance", ""));
        boolean looksLikeRejection = ZERO_INFO_REJECTION_KEYWORDS.stream().anyMatch(childUtterance::contains);

        if (looksLikeRejection) {
            return Map.of(
                    "childIntent", "SHORT_RESPONSE",
                    "mainPoint", "",
                    "detectedElements", List.of(),
                    "utteranceValidity", "SHORT"
            );
        }

        List<Map<String, Object>> detected = ELEMENT_KEYWORDS.stream()
                .filter(ek -> childUtterance.contains(ek.keyword()))
                .map(ek -> Map.<String, Object>of("type", ek.type(), "evidence", ek.keyword()))
                .toList();

        if (!detected.isEmpty()) {
            return Map.of(
                    "childIntent", intentFor(detected),
                    "mainPoint", "미션 관련 요소가 감지됐다",
                    "detectedElements", detected,
                    "utteranceValidity", "VALID"
            );
        }

        return Map.of(
                "childIntent", "PERSPECTIVE",
                "mainPoint", "며느리가 창피해서 참았던 것 같다",
                "detectedElements", List.of(
                        Map.of("type", "PERSPECTIVE", "evidence", "창피해서 계속 참았던 것 같아요")
                ),
                "utteranceValidity", "VALID"
        );
    }

    private String intentFor(List<Map<String, Object>> detected) {
        Set<Object> types = detected.stream().map(m -> m.get("type")).collect(Collectors.toSet());
        if (types.contains("SOLUTION")) return "SOLUTION";
        if (types.contains("REQUEST")) return "REQUEST";
        if (types.contains("REASON")) return "REASONING";
        return "OPINION";
    }

    @PostMapping("/respond")
    public Map<String, Object> respond(@RequestBody(required = false) Map<String, Object> request) {
        return Map.of("text", "그랬구나, 네 말을 들으니 마음이 좀 놓이는구나.", "characterState", "MOVED");
    }
}
