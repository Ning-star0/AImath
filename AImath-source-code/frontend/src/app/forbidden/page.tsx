import { PermissionDeniedState } from '@/components/states/platform-states';

export default function ForbiddenPage() {
  return (
    <main className="storybook-scene min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <PermissionDeniedState />
    </main>
  );
}
