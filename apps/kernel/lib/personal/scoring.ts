export interface DailyLogData {
  workoutDone: boolean;
  allSetsDone: boolean;
  effortRating: number;
  isRestDay: boolean;
  calories: number;
  protein: number;
  meals: boolean;
  sleepHours: number;
  productiveHours: number;
  socialMediaOk: boolean;
}

export function computeScore(data: DailyLogData): number {
  let trainingScore = 0;
  if (data.isRestDay) {
    trainingScore = 20;
  } else {
    if (data.workoutDone) trainingScore += 20;
    if (data.allSetsDone) trainingScore += 10;
    trainingScore += (data.effortRating / 5) * 10;
  }

  const caloriesScore = (Math.min(data.calories, 2500) / 2500) * 15;
  const proteinScore = (Math.min(data.protein, 120) / 120) * 15;
  const mealsScore = data.meals ? 5 : 0;
  const sleepScore = (Math.min(data.sleepHours, 7) / 7) * 15;
  const productiveScore = data.productiveHours >= 6 ? 7 : 0;
  const socialScore = data.socialMediaOk ? 3 : 0;

  return Math.min(
    100,
    Math.round(
      trainingScore +
        caloriesScore +
        proteinScore +
        mealsScore +
        sleepScore +
        productiveScore +
        socialScore
    )
  );
}

export function isRestDay(dateStr: string): boolean {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return day === 1 || day === 4;
}

export function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

export function getDayName(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`)
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();
}
