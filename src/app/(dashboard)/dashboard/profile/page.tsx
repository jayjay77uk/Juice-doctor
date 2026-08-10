import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { Tabs } from '@/components/admin/tabs';
import { member } from '@/services/member';
import { HealthBasicsForm } from '@/components/dashboard/profile-forms';
import type { HealthProfile, FitnessProfile, NutritionProfile } from '@/types/health';

export const metadata = createMetadata({ title: 'Health profile', path: '/dashboard/profile' });

const healthFallback: HealthProfile = {
  userId: '',
  organisationId: '',
  dateOfBirth: null,
  biologicalSex: null,
  heightCm: null,
  weightKg: null,
  bloodType: null,
  conditions: [],
  allergies: [],
  medications: [],
  emergencyContact: null,
  notes: null,
  updatedAt: '',
};

const fitnessFallback: FitnessProfile = {
  userId: '',
  organisationId: '',
  activityLevel: 'moderate',
  restingHeartRate: null,
  trainingDaysPerWeek: null,
  baselineMetrics: {},
  notes: null,
};

const nutritionFallback: NutritionProfile = {
  userId: '',
  organisationId: '',
  dietaryPattern: null,
  restrictions: [],
  intolerances: [],
  hydrationTargetMl: null,
  notes: null,
};

function DefinitionGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function HealthProfilePage() {
  const [healthResult, fitnessResult, nutritionResult] = await Promise.all([
    member.healthProfile(),
    member.fitnessProfile(),
    member.nutritionProfile(),
  ]);

  const health = healthResult.ok ? healthResult.data : healthFallback;
  const fitness = fitnessResult.ok ? fitnessResult.data : fitnessFallback;
  const nutrition = nutritionResult.ok ? nutritionResult.data : nutritionFallback;

  const healthItems: { label: string; value: string }[] = [
    { label: 'Height', value: health.heightCm !== null ? `${health.heightCm} cm` : '—' },
    { label: 'Weight', value: health.weightKg !== null ? `${health.weightKg} kg` : '—' },
    { label: 'Blood type', value: health.bloodType ?? '—' },
    { label: 'Allergies', value: health.allergies.join(', ') || 'None' },
    { label: 'Conditions', value: health.conditions.join(', ') || 'None' },
    { label: 'Notes', value: health.notes ?? '—' },
  ];

  const fitnessItems: { label: string; value: string }[] = [
    { label: 'Activity level', value: fitness.activityLevel },
    {
      label: 'Resting heart rate',
      value: fitness.restingHeartRate !== null ? `${fitness.restingHeartRate} bpm` : '—',
    },
    {
      label: 'Training days / week',
      value: fitness.trainingDaysPerWeek !== null ? `${fitness.trainingDaysPerWeek}` : '—',
    },
  ];

  const nutritionItems: { label: string; value: string }[] = [
    { label: 'Dietary pattern', value: nutrition.dietaryPattern ?? '—' },
    { label: 'Restrictions', value: nutrition.restrictions.join(', ') || 'None' },
    { label: 'Intolerances', value: nutrition.intolerances.join(', ') || 'None' },
    {
      label: 'Hydration target',
      value: nutrition.hydrationTargetMl !== null ? `${nutrition.hydrationTargetMl} ml` : '—',
    },
  ];

  const tabs = [
    {
      value: 'health',
      label: 'Health',
      content: (
        <Panel title="Health" description="The basic details on file for this profile.">
          <DefinitionGrid items={healthItems} />
        </Panel>
      ),
    },
    {
      value: 'fitness',
      label: 'Fitness',
      content: (
        <Panel title="Fitness" description="Activity details on file for this profile.">
          <DefinitionGrid items={fitnessItems} />
        </Panel>
      ),
    },
    {
      value: 'nutrition',
      label: 'Nutrition',
      content: (
        <Panel title="Nutrition" description="Dietary details on file for this profile.">
          <DefinitionGrid items={nutritionItems} />
        </Panel>
      ),
    },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Health profile"
        description="The information stored on this profile."
        actions={
          <HealthBasicsForm
            dateOfBirth={health.dateOfBirth}
            biologicalSex={health.biologicalSex}
            heightCm={health.heightCm}
            weightKg={health.weightKg}
          />
        }
      />

      <Tabs tabs={tabs} defaultValue="health" />

      <p className="text-sm text-muted-foreground">
        You can edit your basics above. For conditions, allergies or medication changes, please speak with the team so
        they are recorded correctly.
      </p>

      <p className="text-sm text-muted-foreground">
        This page shows the information stored on your record. AI replies are AI-generated and not clinically reviewed — not for emergencies.
      </p>
    </div>
  );
}
