import type {
  PersonalDailyLog,
  PersonalExerciseLog,
  PersonalWorkoutPlan,
} from '@/db/schema';

export type DailyLog = PersonalDailyLog;
export type ExerciseLog = PersonalExerciseLog;
export type WorkoutPlan = PersonalWorkoutPlan;

export interface PersonalReport {
  score: number;
  label: 'Personal';
  streak: number;
  todayDone: boolean;
  updatedAt: string;
  details: {
    workoutDone: boolean;
    allSetsDone: boolean;
    effort: number;
    calories: number;
    protein: number;
    meals: boolean;
    sleep: number;
    productiveHours: number;
    socialMediaOk: boolean;
  };
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes: string;
}

export interface DayPlan {
  day: string;
  date: string;
  exercises: Exercise[];
  focus: string;
}
