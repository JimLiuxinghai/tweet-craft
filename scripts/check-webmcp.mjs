import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pages = [
  'index.html',
  'tweet-craft-introduction.html',
  'docs/notion-connection-introduction.html',
  'docs/notion-setup-tutorial.html',
];
const failures = [];

for (const page of pages) {
  const html = readFileSync(resolve(root, page), 'utf8');
  const count = (html.match(/<script\s+type="module"\s+src="\/public\/js\/webmcp\.js"><\/script>/g) ?? []).length;
  if (count !== 1) failures.push(`${page}: expected one WebMCP script, found ${count}`);
}

const script = readFileSync(resolve(root, 'public/js/webmcp.js'), 'utf8');
if (!script.includes('document.modelContext') || !script.includes("name: 'find_tweet_craft_help'")) {
  failures.push('public/js/webmcp.js: expected registration is missing');
}

if (failures.length) {
  console.error(`WebMCP check failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`WebMCP check passed: ${pages.length} public pages load find_tweet_craft_help.`);
