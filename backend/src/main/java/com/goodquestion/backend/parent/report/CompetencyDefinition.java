package com.goodquestion.backend.parent.report;

import java.util.List;

/** 리포트 가이드 3-2·3-3 역량 하나의 정의. seen/unseen 두 버전의 문구를 미리 갖고, 매칭 여부로 고른다. */
public record CompetencyDefinition(
        String name,
        List<String> elements,
        String seenFeature,
        String unseenFeature,
        String strengthSeen,
        String strengthUnseen,
        String next
) {
}
