package com.goodquestion.backend.session.support;

/**
 * PRD 7.5의 "ㅇㅇ" 자리를 아이 이름으로 치환한다 (M-26, decisions.md D-04).
 * 대상은 두 곳뿐이다 — 대화1 "ㅇㅇ아"(호격), 대화4 "ㅇㅇ이"(주격 조사).
 * 받침 유무에 따라 조사가 갈린다: 받침 있으면 아/이, 없으면 야/(생략).
 *
 * 판정식은 한글 완성형 코드포인트(0xAC00~0xD7A3)에서만 유효하다.
 * 이름이 한글 완성형이 아니면(영문 등) 받침 없음으로 취급한다 — 크래시보다 안전한 기본값이다.
 */
public final class NameSubstitutor {

    private static final int HANGUL_BASE = 0xAC00;
    private static final int HANGUL_END = 0xD7A3;
    private static final int JONGSEONG_COUNT = 28;

    private NameSubstitutor() {
    }

    public static String substitute(String template, String childName) {
        if (template == null) return null;

        boolean hasBatchim = hasBatchim(childName);
        String result = template.replace("ㅇㅇ아", childName + (hasBatchim ? "아" : "야"));
        result = result.replace("ㅇㅇ이", childName + (hasBatchim ? "이" : ""));
        return result;
    }

    private static boolean hasBatchim(String name) {
        if (name == null || name.isEmpty()) return false;
        char lastChar = name.charAt(name.length() - 1);
        if (lastChar < HANGUL_BASE || lastChar > HANGUL_END) return false;
        return (lastChar - HANGUL_BASE) % JONGSEONG_COUNT != 0;
    }
}
