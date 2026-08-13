package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.story.constant.MissionChecklistItem;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

/**
 * 미션 체크리스트 항목 단위 진행 판정 (request/backend/mission-progress.md).
 *
 * 체크리스트가 같은 사고 요소를 두 번 요구할 수 있다(미션1의 1·2번이 둘 다 SOLUTION) —
 * accumulatedElements는 집합이라 이 반복을 표현하지 못한다. 그래서 미션 노출 이후
 * 아이 발화를 **턴 순서대로** 훑어, 각 턴에서 확인된 요소 종류마다 아직 안 채워진
 * 같은 종류의 체크리스트 칸을 하나씩 채운다.
 */
public final class MissionProgressCalculator {

    private MissionProgressCalculator() {
    }

    /**
     * @param checklist          미션 체크리스트 (순서대로)
     * @param perTurnDetectedTypes 미션 노출 이후 아이 턴마다, 그 턴에서 확인된 사고 요소 종류(턴 순서대로)
     * @return 채워진 체크리스트 인덱스(0-based), 채워진 순서대로
     */
    public static List<Integer> satisfiedIndexes(List<MissionChecklistItem> checklist,
                                                   List<List<String>> perTurnDetectedTypes) {
        List<Integer> satisfied = new ArrayList<>();
        for (List<String> turnTypes : perTurnDetectedTypes) {
            for (String type : new LinkedHashSet<>(turnTypes)) {
                nextUnfilledSlot(checklist, satisfied, type).ifPresent(satisfied::add);
            }
        }
        return List.copyOf(satisfied);
    }

    private static Optional<Integer> nextUnfilledSlot(List<MissionChecklistItem> checklist,
                                                        List<Integer> alreadySatisfied, String type) {
        for (int i = 0; i < checklist.size(); i++) {
            if (checklist.get(i).element().equals(type) && !alreadySatisfied.contains(i)) {
                return Optional.of(i);
            }
        }
        return Optional.empty();
    }
}
