/**
 * General life-stage care checklist. Wording is deliberately general: it points
 * owners to their veterinarian and never prescribes treatments or schedules.
 */

export type LifeStage = 'kitten' | 'young' | 'mature' | 'senior';

export interface LifeStageInfo {
  stage: LifeStage;
  label: string;
  ageRange: string;
  tips: string[];
}

export const LIFE_STAGES: Record<LifeStage, LifeStageInfo> = {
  kitten: {
    stage: 'kitten',
    label: 'Kitten',
    ageRange: 'under 1 year',
    tips: [
      'Ask your vet for a kitten vaccination plan and record each dose here.',
      'Discuss parasite prevention (fleas, worms) suitable for your kitten’s age and weight.',
      'Talk to your vet about the right time to neuter or spay.',
      'Microchip your kitten and keep the chip details up to date.',
      'Weigh regularly — steady growth is a good sign.',
      'Start handling paws, teeth and ears early to make grooming and vet visits easier.',
    ],
  },
  young: {
    stage: 'young',
    label: 'Young adult',
    ageRange: '1–6 years',
    tips: [
      'Have a wellness check at least once a year.',
      'Keep vaccinations up to date as advised by your vet.',
      'Watch weight and body condition — adult cats gain weight easily.',
      'Provide daily play to keep your cat active and mentally stimulated.',
      'Ask about dental care; many cats develop dental disease by middle age.',
    ],
  },
  mature: {
    stage: 'mature',
    label: 'Mature',
    ageRange: '7–10 years',
    tips: [
      'Ask your vet whether twice-yearly checks are right for your cat.',
      'Discuss screening blood and urine tests with your vet.',
      'Track water intake and litter box habits — changes can be an early sign of illness.',
      'Keep an eye on weight changes in either direction.',
      'Watch for stiffness or reluctance to jump.',
    ],
  },
  senior: {
    stage: 'senior',
    label: 'Senior',
    ageRange: '11 years and older',
    tips: [
      'Many vets recommend checks every 6 months for senior cats — ask yours.',
      'Record weight often; unexplained weight loss should be discussed with your vet.',
      'Note increased thirst or urination and mention it at the next visit.',
      'Make litter boxes, food and favourite spots easy to reach.',
      'Monitor appetite, grooming and behaviour changes, including confusion at night.',
      'Keep a medication list ready (the vet summary does this for you).',
    ],
  },
};

export function lifeStageFor(birthDate?: string, now = new Date()): LifeStageInfo | undefined {
  if (!birthDate) return undefined;
  const b = new Date(birthDate + 'T00:00:00');
  const years = (now.getTime() - b.getTime()) / (365.25 * 86_400_000);
  if (!Number.isFinite(years) || years < 0) return undefined;
  if (years < 1) return LIFE_STAGES.kitten;
  if (years < 7) return LIFE_STAGES.young;
  if (years < 11) return LIFE_STAGES.mature;
  return LIFE_STAGES.senior;
}
