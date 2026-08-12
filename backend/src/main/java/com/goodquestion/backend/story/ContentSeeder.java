package com.goodquestion.backend.story;

import com.goodquestion.backend.story.entity.PostActivityCard;
import com.goodquestion.backend.story.entity.PostActivityConfig;
import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.story.entity.StoryScene;
import com.goodquestion.backend.story.enums.SceneType;
import com.goodquestion.backend.story.repository.StoryRepository;
import com.goodquestion.backend.story.repository.StorySceneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * "방귀 뀌는 며느리" 이야기 1건 + 장면 9건을 기동 시 적재한다 (PRD 7장, work-items.md M-13~M-18).
 * 값을 여기 말고 다른 곳에 복사하지 않는다 — 이 클래스가 유일한 시드 소스다.
 *
 * ddl-auto가 데이터를 넣어주지 않으므로 직접 채우되, existsByTitle로 재기동 시 중복 삽입을 막는다
 * (setup.md 5장). scene_goal 등 dialogue 전용 컬럼은 intro/narrative 장면에 채우지 않는다 (PRD I-05).
 *
 * 대화 장면 4건의 scene_description은 PRD 7.4가 아니라 팀이 한 줄로 작성했다 — 7.4는 도입·전개
 * 장면 텍스트만 제공하고, 대화 장면의 sceneContext(= scene_description + conflict, PRD 7.5.1)용
 * 서술은 제공 자료에 없다. conflict·elementCriteria와 같은 성격의 팀 창작 값이다 (decisions.md D-19).
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class ContentSeeder implements ApplicationRunner {

    private static final String STORY_TITLE = "방귀 뀌는 며느리";

    private final StoryRepository storyRepository;
    private final StorySceneRepository storySceneRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (storyRepository.existsByTitle(STORY_TITLE)) {
            log.info("[ContentSeeder] '{}' 이미 존재 — 시드를 건너뜁니다.", STORY_TITLE);
            return;
        }

        Story story = Story.create(
                STORY_TITLE,
                "큰 방귀를 부끄러워하던 며느리가 자신의 다름을 장점으로 바꾸는 이야기",
                "큰 방귀 때문에 며느리가 집에서 쫓겨날 위기에 놓였어요.",
                "며느리의 방귀가 특별한 장점이 될 수 있도록 도와주세요.",
                "보통",
                List.of("다름", "자기이해", "장점 발견"),
                20
        );
        story.updatePostActivityConfig(new PostActivityConfig(
                List.of(
                        new PostActivityCard("card_1", "며느리는 방귀를 꾹 참고 또 참았어요.", 1),
                        new PostActivityCard("card_2", "며느리의 큰 방귀에 시아버지의 갓이 날아갔어요.", 2),
                        new PostActivityCard("card_3", "며느리의 방귀로 높은 배나무의 배가 우수수 떨어졌어요.", 3),
                        new PostActivityCard("card_4", "시아버지가 며느리에게 미안하다고 말했어요.", 4)
                ),
                List.of("며느리", "방귀", "배나무", "시아버지")
        ));
        story.publish();
        storyRepository.save(story);

        storySceneRepository.saveAll(List.of(
                StoryScene.createNarrative(story, 1, SceneType.INTRO,
                        "옛날 어느 마을에 방귀를 아주 크게 뀌는 며느리가 살았습니다. 며느리는 시집에 온 뒤로 늘 얌전하고 예의 바르게 보이고 싶었습니다. 시댁 식구들이 자신을 이상하게 볼까 봐 걱정했기 때문입니다.",
                        null),
                StoryScene.createNarrative(story, 2, SceneType.NARRATIVE,
                        "그래서 며느리는 방귀가 나오려고 할 때마다 꾹꾹 참았습니다. 하루도 참고, 이틀도 참고, 그렇게 오래 참다 보니 배는 점점 빵빵하게 부풀어 올랐고 얼굴은 노랗게 변했습니다. 몸도 마음도 너무 힘들었지만, 며느리는 차마 가족들에게 솔직하게 말하지 못했습니다.",
                        null),
                StoryScene.createDialogue(story, 3,
                        "며느리가 배가 아파 더는 참지 못하고 가족들에게 조심스럽게 말을 꺼내려 합니다.",
                        null,
                        "참으면 몸이 점점 힘들어지지만, 사실을 말하면 가족들이 자신을 이상하게 볼까 봐 말하지 못하고 있다.",
                        "ch_banggui_daughter_in_law",
                        "\"ㅇㅇ아, 내 방귀가 너무 크다는 걸 알면 가족들이 나를 이상하게 생각하지 않을까?\"",
                        "\"그래도 아직은 못 말하겠어. 조금만 더 참아 볼게.\"",
                        "방귀를 숨기고 싶어하는 며느리의 입장을 이해하고, 공감해주며 문제를 숨기지 않고 솔직하게 말할 수 있는 용기를 준다",
                        List.of("PERSPECTIVE", "EMOTION", "REASON", "SOLUTION"),
                        Map.of(
                                "PERSPECTIVE", "며느리가 처한 상황이나 가족이 받아들일 방식을 며느리·가족 중 한쪽의 입장에서 헤아려 말한 경우",
                                "EMOTION", "며느리 또는 아이 자신의 감정을 직접 가리키는 말을 한 경우. 감정어가 발화에 실제로 나타나야 함",
                                "REASON", "말해야 한다 또는 말하지 않아도 된다는 판단의 까닭을 말한 경우. \"그러면 안 돼요\" 같은 당위만으로는 인정하지 않음",
                                "SOLUTION", "며느리가 실제로 해볼 수 있는 행동을 말한 경우. 대상과 방법이 함께 드러나야 하며 \"잘 말해요\" 수준은 인정하지 않음"
                        ),
                        2, 4),
                StoryScene.createNarrative(story, 4, SceneType.NARRATIVE,
                        "그러던 어느 날, 며느리는 더 이상 참을 수 없었습니다. 배가 너무 아프고 숨 쉬기도 힘들었습니다. 며느리는 조심스럽게 가족들에게 말했습니다. \"저… 사실은 방귀를 너무 오래 참아서 배가 아파요. 조금만 뀌어도 될까요?\" 며느리는 아주 살짝만 뀌려고 했습니다. 하지만 그동안 너무 오래 참았던 탓에 방귀는 생각보다 훨씬 크게 터져 나왔습니다. 마당의 먼지가 휘리릭 날아가고, 기왓장이 달그락거리고, 시아버지의 갓까지 휙 날아가 버렸습니다.",
                        null),
                StoryScene.createDialogue(story, 5,
                        "놀란 시아버지가 집안 체면을 걱정하며 며느리를 나무랍니다.",
                        null,
                        "며느리의 방귀에 크게 놀라 집안 체면을 걱정하면서도, 며느리를 정말 내보내야 하는지 마음을 정하지 못하고 있다.",
                        "ch_banggui_father_in_law",
                        "\"아이고 이게 무슨 일이냐! 우리 집안이 다 흔들리는구나! 이렇게 창피한 며느리와 함께 못살겠다! 그렇지 않니?\"",
                        "\"흥, 그래도 도저히 이런 며느리와는 함께 살 수 없으니 친정으로 데려다줘야겠다.\"",
                        "시아버지가 놀란 마음을 이해하면서도, 며느리가 일부러 그런 것이 아니라 오래 참아서 힘들었던 것임을 말하고, 며느리를 따뜻하게 이해해 달라고 설득한다",
                        List.of("PERSPECTIVE", "EMOTION", "REASON", "SOLUTION"),
                        Map.of(
                                "PERSPECTIVE", "시아버지가 놀란 이유 또는 며느리의 사정 중 하나를 그 사람의 입장에서 설명한 경우",
                                "EMOTION", "시아버지의 놀람·화 또는 며느리의 속상함을 직접 가리키는 말을 한 경우",
                                "REASON", "며느리가 일부러 그런 것이 아님을 뒷받침하는 까닭을 말한 경우. 오래 참았다, 몸이 아팠다 등 근거가 발화 안에 있어야 함",
                                "SOLUTION", "시아버지가 며느리에게 취할 수 있는 행동을 구체적으로 말한 경우. \"이해해 주세요\" 단독은 인정하지 않고 무엇을 어떻게 할지가 함께 있어야 함"
                        ),
                        3, 5),
                StoryScene.createNarrative(story, 6, SceneType.NARRATIVE,
                        "한참 걷다 보니 아랫마을 길가에 아주 높은 배나무가 한 그루 서 있었습니다. 나무 꼭대기에는 노랗고 탐스러운 배들이 주렁주렁 매달려 있었습니다. 시아버지는 배를 보자 군침이 돌았습니다. 마침 아랫마을 사람들도 그 배를 먹고 싶어 했지만, 나무가 너무 높아 아무도 딸 수 없었습니다.",
                        null),
                StoryScene.createDialogue(story, 7,
                        "마을 이장이 높은 배나무의 배를 딸 방법을 아이와 함께 궁리합니다.",
                        null,
                        "배를 따고 싶지만 장대도 닿지 않고 나무에 오를 수도 없어 방법을 찾지 못하고 있다.",
                        "ch_banggui_village_chief",
                        "\"이 배나무는 해마다 탐스러운 배가 열리지만, 너무 높아서 아무도 딸 수가 없었소. 무슨 뾰족한 방법이 없겠는가?\"",
                        "\"아이고, 방귀 뀌는 며느리 덕분에 온 마을이 배 잔치를 할 수 있겠구려, 고맙소!\"",
                        "높은 배나무의 배를 떨어뜨릴 방법을 생각하고, 며느리의 큰 방귀를 안전하게 사용할 수 있는 해결책을 제안한다",
                        List.of("SOLUTION", "REASON", "REQUEST", "RESULT"),
                        Map.of(
                                "SOLUTION", "배를 떨어뜨릴 실행 방법을 말한 경우. 며느리의 방귀를 쓰는지 여부는 무관하나 실제 행동이 드러나야 함",
                                "REASON", "그 방법이 가능하다고 보는 까닭을 말한 경우. 방귀가 세다, 바람이 분다 등 근거가 발화에 있어야 함",
                                "REQUEST", "며느리나 마을 사람에게 요구하는 행동을 구체적으로 말한 경우. 부탁하기, 물러나기, 미리 알리기 등",
                                "RESULT", "방법을 실행한 뒤 일어날 일을 예상해 말한 경우. 배가 떨어진다, 사람이 다칠 수 있다 등"
                        ),
                        3, 5),
                StoryScene.createNarrative(story, 8, SceneType.NARRATIVE,
                        "시아버지는 며느리의 방귀가 시끄럽고 별난 것이 아니라, 모두를 도울 수 있는 특별한 힘이라는 것을 깨닫습니다. 자신이 며느리를 구박했던 일을 후회하고 사과합니다.",
                        null),
                StoryScene.createDialogue(story, 9,
                        "며느리가 자신의 방귀가 도움이 되었다는 사실을 알고 다름을 받아들일 준비를 합니다.",
                        null,
                        "자신의 방귀가 도움이 된 것은 알았지만, 앞으로도 부끄러워해야 하는지 아닌지 확신하지 못하고 있다.",
                        "ch_banggui_daughter_in_law",
                        "\"ㅇㅇ이 덕분에 내 방귀가 누군가에게 도움이 될 수 있다는 걸 처음 알았어. 이제는 방귀 소리가 큰 걸 부끄러워하지 않아도 될까?\"",
                        "\"이제는 부끄러워하며 숨기지 않고, 조심해서 좋은 일에 써 볼게.\"",
                        "다름을 인정하고, 자신의 특징을 긍정적으로 받아들이는 태도를 말한다",
                        List.of("EMOTION", "PERSPECTIVE", "RESULT", "SOLUTION"),
                        Map.of(
                                "EMOTION", "며느리 또는 아이 자신의 감정을 직접 가리키는 말을 한 경우",
                                "PERSPECTIVE", "며느리 또는 다른 사람의 특징을 그 사람 입장에서 바라보고 말한 경우",
                                "RESULT", "그 특징을 좋은 일에 썼을 때 생기는 일을 말한 경우",
                                "SOLUTION", "특징을 숨기지 않고 쓰기 위한 구체적 방법을 말한 경우. 미리 알려주기, 필요한 때만 쓰기 등"
                        ),
                        2, 4)
        ));

        log.info("[ContentSeeder] '{}' 시드 완료 — 장면 9건 적재.", STORY_TITLE);
    }
}
