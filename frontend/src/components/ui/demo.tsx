'use client';

import AIComposer from '@/components/ui/ai-prompt-composer-with-model-selector';

const settings = {
  lightTheme: false,
  showUpgradeBanner: true,
  showWalkthroughControl: true,
};

export default function AIComposerDemo(
  props: Partial<typeof settings>
) {
  const options = { ...settings, ...props };

  return (
    <div className="w-full">
      <AIComposer
        initialTheme={options.lightTheme ? 'light' : 'dark'}
        showUpgradeBanner={options.showUpgradeBanner}
        showWalkthroughControl={options.showWalkthroughControl}
      />
    </div>
  );
}

