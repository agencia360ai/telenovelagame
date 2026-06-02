type EventParams = Record<string, string | number | boolean>;

class Analytics {
  private enabled = false;

  init(): void {
    this.enabled = false;
    console.log("[Analytics] init (mock mode)");
  }

  track(event: string, params?: EventParams): void {
    if (__DEV__ || !this.enabled) {
      console.log(`[Analytics] ${event}`, params ?? "");
      return;
    }
  }

  trackStoryStart(storyId: string): void {
    this.track("story_start", { story_id: storyId });
  }

  trackChapterStart(chapterId: string): void {
    this.track("chapter_start", { chapter_id: chapterId });
  }

  trackChapterComplete(chapterId: string): void {
    this.track("chapter_complete", { chapter_id: chapterId });
  }

  trackBeatView(beatId: string): void {
    this.track("beat_view", { beat_id: beatId });
  }

  trackChoiceMade(
    choiceId: string,
    gemCost: number,
    isPremium: boolean
  ): void {
    this.track("choice_made", {
      choice_id: choiceId,
      gem_cost: gemCost,
      is_premium: isPremium,
    });
  }

  trackShopOpen(): void {
    this.track("shop_open");
  }

  trackGemPurchase(amount: number, pack: string): void {
    this.track("gem_purchase", { amount, pack });
  }

  trackContinuaraReached(): void {
    this.track("continuara_reached");
  }
}

export const analytics = new Analytics();
