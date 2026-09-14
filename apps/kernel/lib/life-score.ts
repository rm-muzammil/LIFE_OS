import type { Province, CharacterRating, WeeklyReview } from '@/db/schema';

export const CHARACTER_WEIGHT = 0.03;
export const MISSION_WEIGHT = 0.02;

export interface DimensionContribution {
  slug: string;
  name: string;
  weight: number;
  score: number | null; // 0-100, null if never reported
  contribution: number; // score * weight (0 if null)
}

export interface LifeScoreResult {
  lifeScore: number; // 0-100
  totalWeight: number;
  dimensions: DimensionContribution[];
  characterScore: number | null;
  missionScore: number | null;
}

export function characterScoreFromRating(rating: CharacterRating | null | undefined): number | null {
  if (!rating) return null;
  const { patience, discipline, gratitude, humility, truthfulness } = rating;
  const avg = (patience + discipline + gratitude + humility + truthfulness) / 5;
  return (avg / 5) * 100;
}

export function missionScoreFromReview(review: WeeklyReview | null | undefined): number | null {
  if (!review || review.missionAlignScore == null) return null;
  return ((review.missionAlignScore - 1) / 4) * 100;
}

export function computeLifeScore(
  activeProvinces: Province[],
  currentCharacter: CharacterRating | null | undefined,
  currentReview: WeeklyReview | null | undefined
): LifeScoreResult {
  const characterScore = characterScoreFromRating(currentCharacter);
  const missionScore = missionScoreFromReview(currentReview);

  const dimensions: DimensionContribution[] = activeProvinces.map((p) => ({
    slug: p.slug,
    name: p.name,
    weight: p.weight,
    score: p.cachedScore ?? null,
    contribution: (p.cachedScore ?? 0) * p.weight,
  }));

  const provinceWeightSum = activeProvinces.reduce((sum, p) => sum + p.weight, 0);
  const totalWeight = provinceWeightSum + CHARACTER_WEIGHT + MISSION_WEIGHT;

  const provinceContribution = dimensions.reduce((sum, d) => sum + d.contribution, 0);
  const characterContribution = (characterScore ?? 0) * CHARACTER_WEIGHT;
  const missionContribution = (missionScore ?? 0) * MISSION_WEIGHT;

  const lifeScore =
    totalWeight > 0
      ? (provinceContribution + characterContribution + missionContribution) / totalWeight
      : 0;

  return {
    lifeScore: Math.round(lifeScore * 100) / 100,
    totalWeight,
    dimensions,
    characterScore,
    missionScore,
  };
}
