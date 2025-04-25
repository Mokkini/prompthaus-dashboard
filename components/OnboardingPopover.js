// components/OnboardingPopover.jsx
'use client';

import * as Popover from '@radix-ui/react-popover';
import { Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OnboardingPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="sm" className="p-1">
          <Terminal className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="sr-only">Anleitung anzeigen</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="w-64 bg-white border border-gray-200 rounded-md p-4 shadow-lg dark:bg-gray-800 dark:border-gray-700"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Kurze Anleitung für den Test
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Fülle einfach die Felder{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
              [mit eckigen Klammern]
            </code>{' '}
            unten mit deinen Infos aus und klicke dann auf “Text generieren”.
          </p>
          <Popover.Arrow className="fill-white dark:fill-gray-800" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
