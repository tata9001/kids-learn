import type { StudyState } from "./types";

export function grantTaskReward(state: StudyState, _taskId: string): StudyState {
  return {
    ...state,
    pet: {
      ...state.pet,
      mood: "proud",
      careItems: state.pet.careItems + 1
    }
  };
}
