import React from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';

export const AccountScreen: React.FC = () => {
  return (
    <Layout>
      <div className="space-y-6 pb-24">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Account
          </h1>
          <p className="text-white/60">
            Sign in and manage your data.
          </p>
        </div>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-white">Coming soon</h2>
          <p className="text-white/60">
            Account features are not available yet. Planned:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-white/70">
            <li>Sign in / Sign up</li>
            <li>Sync splits across devices</li>
            <li>Backup and restore</li>
          </ul>
        </Card>
      </div>
    </Layout>
  );
};
