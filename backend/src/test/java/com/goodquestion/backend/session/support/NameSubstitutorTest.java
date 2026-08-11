package com.goodquestion.backend.session.support;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NameSubstitutorTest {

    @Test
    void 받침_있는_이름_대화1_호격() {
        String result = NameSubstitutor.substitute("ㅇㅇ아, 내 방귀가…", "민준");
        assertThat(result).isEqualTo("민준아, 내 방귀가…");
    }

    @Test
    void 받침_없는_이름_대화1_호격() {
        String result = NameSubstitutor.substitute("ㅇㅇ아, 내 방귀가…", "지호");
        assertThat(result).isEqualTo("지호야, 내 방귀가…");
    }

    @Test
    void 받침_있는_이름_대화4_주격() {
        String result = NameSubstitutor.substitute("ㅇㅇ이 덕분에…", "민준");
        assertThat(result).isEqualTo("민준이 덕분에…");
    }

    @Test
    void 받침_없는_이름_대화4_주격은_조사가_생략된다() {
        String result = NameSubstitutor.substitute("ㅇㅇ이 덕분에…", "지호");
        assertThat(result).isEqualTo("지호 덕분에…");
    }

    @Test
    void 치환_대상이_없으면_원문_그대로() {
        String result = NameSubstitutor.substitute("치환할 게 없는 문장입니다.", "민준");
        assertThat(result).isEqualTo("치환할 게 없는 문장입니다.");
    }

    @Test
    void 영문_이름은_받침_없음으로_취급한다() {
        String result = NameSubstitutor.substitute("ㅇㅇ아, 안녕", "Tom");
        assertThat(result).isEqualTo("Tom야, 안녕");
    }
}
