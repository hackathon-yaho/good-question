package com.goodquestion.backend.story.constant;

import java.util.List;
import java.util.Map;

/**
 * "방귀 뀌는 며느리"의 미션 2건 (PRD 7.6). 노출 시점 판정(M-47~M-49)은 Phase 4 규칙 엔진의 몫이고,
 * 여기서는 정의(제목·목적·확인 항목)만 코드 상수로 둔다.
 */
public final class Missions {

    /**
     * 체크리스트 순서·element 매핑은 api.md 3.5 missionTriggered 예시와 PRD 7.6 확인 항목이
     * 기본적으로 일치하지만, 2번째 항목은 D-54로 정정했다 — PRD 원문("주변에 있는 마을
     * 사람들과 시아버지는 어디로 피해야 할지")도 element도 1번째 항목과 똑같이 SOLUTION이라
     * 장면7의 element_criteria(SOLUTION 1회만 감지)로는 두 슬롯이 절대 안 채워졌다. 장면7에
     * 이미 있는 REASON("그 방법이 가능하다고 보는 까닭")으로 바꾸고 문구도 그에 맞춰 정정했다.
     */
    public static final MissionDefinition MISSION_1 = new MissionDefinition(
            "mission_1",
            "높이 있는 배 따기",
            "높은 배나무의 배를 떨어뜨리기 위해 며느리의 큰 방귀를 안전하게 사용하는 방법을 구성한다",
            List.of(
                    new MissionChecklistItem("무엇을 사용할 것인지", "SOLUTION"),
                    new MissionChecklistItem("그 방법이 왜 가능한지", "REASON"),
                    new MissionChecklistItem("며느리에게 어떻게 부탁할 것인지", "REQUEST"),
                    new MissionChecklistItem("그 결과 어떤 일이 생길지", "RESULT")
            )
    );

    /** PRD 7.6은 미션2에 확인 항목 대신 예시 4개만 제공한다 — checklist는 비워 둔다. */
    public static final MissionDefinition MISSION_2 = new MissionDefinition(
            "mission_2",
            "친구들의 단점을 장점으로 바꾸기",
            "친구나 주변 사람의 특징을 다른 관점에서 바라보고, 단점처럼 보이는 특징을 장점이나 가능성으로 바꾸어 말한다",
            List.of()
    );

    private static final Map<Integer, MissionDefinition> BY_SCENE_ORDER = Map.of(7, MISSION_1, 9, MISSION_2);

    private Missions() {
    }

    /** 미션이 없는 장면이면 null이다 — 대화1·2에는 미션이 없다 (PRD 7.5). */
    public static MissionDefinition forSceneOrder(int sceneOrder) {
        return BY_SCENE_ORDER.get(sceneOrder);
    }
}
