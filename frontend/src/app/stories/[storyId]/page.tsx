import { StoryDetailScreen } from "@/features/stories/StoryDetailScreen";

export const metadata = { title: "이야기 상세 — 굿퀘스천" };

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  return <StoryDetailScreen storyId={storyId} />;
}
