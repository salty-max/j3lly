import { Combobox } from '@briks/ui';
import { Meta, StoryFn } from '@storybook/react';

const meta = {
  title: 'Atoms/Combobox',
  component: Combobox,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryFn<typeof meta>;

export const Default: Story = () => {
  const frameworks = [
    {
      value: 'next.js',
      label: 'Next.js',
    },
    {
      value: 'sveltekit',
      label: 'SvelteKit',
    },
    {
      value: 'nuxt.js',
      label: 'Nuxt.js',
    },
    {
      value: 'remix',
      label: 'Remix',
    },
    {
      value: 'astro',
      label: 'Astro',
    },
  ];

  return <Combobox items={frameworks} />;
};