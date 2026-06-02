import React, { createContext, useContext, useState, useCallback } from "react";

type StoryProgress = {
  storyId: string | null;
  currentChapter: string;
  currentBeat: string;
  completedBeats: string[];
  choicesMade: string[];
  setStoryId: (id: string) => void;
  setCurrentChapter: (id: string) => void;
  setCurrentBeat: (id: string) => void;
  markBeatCompleted: (id: string) => void;
  addChoice: (id: string) => void;
  resetProgress: () => void;
  loadProgress: (data: {
    storyId: string;
    currentChapter: string;
    currentBeat: string;
    completedBeats: string[];
    choicesMade: string[];
  }) => void;
};

const StoryProgressContext = createContext<StoryProgress>({
  storyId: null,
  currentChapter: "",
  currentBeat: "",
  completedBeats: [],
  choicesMade: [],
  setStoryId: () => {},
  setCurrentChapter: () => {},
  setCurrentBeat: () => {},
  markBeatCompleted: () => {},
  addChoice: () => {},
  resetProgress: () => {},
  loadProgress: () => {},
});

export function StoryProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [storyId, setStoryId] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState("");
  const [currentBeat, setCurrentBeat] = useState("");
  const [completedBeats, setCompletedBeats] = useState<string[]>([]);
  const [choicesMade, setChoicesMade] = useState<string[]>([]);

  const markBeatCompleted = useCallback((id: string) => {
    setCompletedBeats((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const addChoice = useCallback((id: string) => {
    setChoicesMade((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const resetProgress = useCallback(() => {
    setStoryId(null);
    setCurrentChapter("");
    setCurrentBeat("");
    setCompletedBeats([]);
    setChoicesMade([]);
  }, []);

  const loadProgress = useCallback(
    (data: {
      storyId: string;
      currentChapter: string;
      currentBeat: string;
      completedBeats: string[];
      choicesMade: string[];
    }) => {
      setStoryId(data.storyId);
      setCurrentChapter(data.currentChapter);
      setCurrentBeat(data.currentBeat);
      setCompletedBeats(data.completedBeats);
      setChoicesMade(data.choicesMade);
    },
    []
  );

  return (
    <StoryProgressContext.Provider
      value={{
        storyId,
        currentChapter,
        currentBeat,
        completedBeats,
        choicesMade,
        setStoryId,
        setCurrentChapter,
        setCurrentBeat,
        markBeatCompleted,
        addChoice,
        resetProgress,
        loadProgress,
      }}
    >
      {children}
    </StoryProgressContext.Provider>
  );
}

export function useStoryProgress() {
  return useContext(StoryProgressContext);
}
