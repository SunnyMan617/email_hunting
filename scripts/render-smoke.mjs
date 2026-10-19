import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true } });

try {
  const { default: DirectoryOptions } = await server.ssrLoadModule('/src/DirectoryOptions.jsx');
  const options = renderToString(createElement(DirectoryOptions, {
    country: '',
    sort: 'newest',
    onCountryChange: () => {},
    onSortChange: () => {},
    onReset: () => {},
    filtered: true,
  }));
  assert.match(options, /Filter profiles by country/);
  assert.match(options, /Reset filters/);

  const { default: ProfileDetails } = await server.ssrLoadModule('/src/ProfileDetails.jsx');
  const details = renderToString(createElement(ProfileDetails, {
    profile: {
      name: 'Test Profile',
      country: 'Nigeria',
      email: 'person@example.com',
      status: 'Found',
      link: 'https://example.com/profile',
      additional_link: '',
      contact: { name: 'Ada Contact', email: 'ada@example.com', telegram: '@ada', whatsapp: '', discord: '' },
      note: 'Profile details render correctly.',
      created_at: '2026-10-18T12:00:00Z',
      updated_at: '2026-10-19T12:00:00Z',
    },
    onClose: () => {},
    onEdit: () => {},
  }));
  assert.match(details, /Test Profile/);
  assert.match(details, /Profile details render correctly/);
  assert.match(details, /https:\/\/example.com\/profile/);
  assert.match(details, /Ada Contact/);
  assert.match(details, /person@example.com/);

  const { default: DatabaseStatus } = await server.ssrLoadModule('/src/DatabaseStatus.jsx');
  assert.equal(renderToString(createElement(DatabaseStatus)), '');
  console.log('Component render checks passed.');
} finally {
  await server.close();
}
