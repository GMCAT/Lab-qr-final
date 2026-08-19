import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const backendSource = await readFile(new URL('../src/routes/application.routes.js', import.meta.url), 'utf8');
const uploadSource = await readFile(new URL('../src/config/uploads.js', import.meta.url), 'utf8');
const schemaSource = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const routerSource = await readFile(new URL('../../frontend/js/router.js', import.meta.url), 'utf8');
const issuePageSource = await readFile(new URL('../../frontend/js/pages/issues.js', import.meta.url), 'utf8');
const publicItemSource = await readFile(new URL('../../frontend/item.html', import.meta.url), 'utf8');

test('issue lifecycle uses separate report and append-only history models', () => {
  assert.match(schemaSource, /model IssueReport/);
  assert.match(schemaSource, /status String @default\("pending"\)/);
  assert.match(schemaSource, /model IssueStatusHistory/);
});

test('report creation keeps item state unchanged and prevents duplicate open reports', () => {
  const createRoute = backendSource.slice(
    backendSource.indexOf("app.post('/api/items/:id/issues'"),
    backendSource.indexOf("app.get('/api/my-issue-reports'")
  );
  assert.match(createRoute, /status: \{ in: \['pending', 'confirmed', 'repair'\] \}/);
  assert.doesNotMatch(createRoute, /prisma\.item\.update/);
});

test('Admin review is permission-gated and changes item status transactionally', () => {
  const reviewRoute = backendSource.slice(
    backendSource.indexOf("app.post('/api/issue-reports/:id/review'"),
    backendSource.indexOf("app.post('/api/issue-reports/:id/resolve'")
  );
  assert.match(reviewRoute, /requirePermission\('can_manage_items'/);
  assert.match(reviewRoute, /prisma\.\$transaction/);
  assert.match(reviewRoute, /decision === 'repair' \? 'ส่งซ่อม' : 'เสีย'/);
  assert.match(reviewRoute, /decision === 'rejected' && !reason/);
});

test('resolving cannot mark an actively borrowed item available', () => {
  assert.match(backendSource, /approval_status: 'approved', return_date: null/);
  assert.match(backendSource, /อุปกรณ์ยังมี BorrowLog ที่ไม่ปิด/);
});

test('frontend exposes report, personal history, and Admin review routes', () => {
  assert.match(routerSource, /#\/report-issue\//);
  assert.match(routerSource, /#\/my-issue-reports/);
  assert.match(routerSource, /#\/admin\/issue-reports/);
  assert.match(issuePageSource, /renderIssueReportForm/);
  assert.match(publicItemSource, /goIssueFromQr/);
});

test('issue form binds submit safely without nested inline quotes', () => {
  assert.match(issuePageSource, /id="issueReportForm"/);
  assert.match(issuePageSource, /addEventListener\('submit'/);
  assert.doesNotMatch(issuePageSource, /onsubmit="submitIssueReport/);
  assert.match(issuePageSource, /issueReportSuccess/);
});

test('issue attachments are restricted to images or PDF and 10 MB', () => {
  assert.match(uploadSource, /10 \* 1024 \* 1024/);
  assert.match(uploadSource, /application\/pdf/);
});
