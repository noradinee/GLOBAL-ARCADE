import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Modal System Audit & Dismiss Logic', async (t) => {

  await t.test('1. useModalDismiss hook implementation verifies all requirements', () => {
    const hookPath = path.join(ROOT_DIR, 'src/hooks/useModalDismiss.ts');
    assert.ok(fs.existsSync(hookPath), 'src/hooks/useModalDismiss.ts must exist');

    const content = fs.readFileSync(hookPath, 'utf8');

    // 1. Escape key handling
    assert.ok(content.includes("event.key === 'Escape'"), 'Must handle Escape key');
    assert.ok(content.includes("addEventListener('keydown'"), 'Must register keydown listener');
    assert.ok(content.includes("removeEventListener('keydown'"), 'Must clean up keydown listener on unmount');

    // 2. Body scroll locking & reference counting
    assert.ok(content.includes("document.body.style.overflow = 'hidden'"), 'Must lock document body overflow');
    assert.ok(content.includes("activeModalCount"), 'Must use reference counting for nested modals');
    assert.ok(content.includes("document.body.style.overflow = originalOverflowStyle"), 'Must restore original overflow style');

    // 3. Backdrop click handling
    assert.ok(content.includes("e.target === e.currentTarget"), 'Must only dismiss on direct backdrop target click');
    assert.ok(content.includes("e.stopPropagation()"), 'Must stop propagation on backdrop click');
  });

  await t.test('2. ProfileModal (Achievements) fixes verify all user issues resolved', () => {
    const profileModalPath = path.join(ROOT_DIR, 'src/components/profile/ProfileModal.tsx');
    assert.ok(fs.existsSync(profileModalPath), 'ProfileModal.tsx must exist');

    const content = fs.readFileSync(profileModalPath, 'utf8');

    // Uses the universal dismiss hook
    assert.ok(content.includes('useModalDismiss'), 'ProfileModal must use useModalDismiss');

    // Sticky header with persistent close button
    assert.ok(content.includes('sticky top-0'), 'Must contain sticky top header');
    assert.ok(content.includes('sticky bottom-0'), 'Must contain sticky bottom footer');
    assert.ok(content.includes('aria-label='), 'Close button must have aria-label for accessibility');

    // Viewport containment and scrollability
    assert.ok(content.includes('max-h-[90vh]'), 'Must restrict height to 90vh to prevent screen overflow');
    assert.ok(content.includes('overflow-y-auto'), 'Must have scrollable content body');
    assert.ok(!content.includes('no-scrollbar'), 'Must not hide scrollbar with no-scrollbar class');

    // Bilingual support
    assert.ok(content.includes('الأوسمة والإنجازات') || content.includes('الأوسمة'), 'Must support Arabic achievements title');
    assert.ok(content.includes('Badges & Achievements'), 'Must support English achievements title');

    // Dialog accessibility
    assert.ok(content.includes('role="dialog"'), 'Must have role="dialog"');
    assert.ok(content.includes('aria-modal="true"'), 'Must have aria-modal="true"');
  });

  await t.test('3. Universal ModalWrapper is available for application-wide consistency', () => {
    const wrapperPath = path.join(ROOT_DIR, 'src/components/common/ModalWrapper.tsx');
    assert.ok(fs.existsSync(wrapperPath), 'ModalWrapper.tsx must exist');

    const content = fs.readFileSync(wrapperPath, 'utf8');
    assert.ok(content.includes('export const ModalWrapper'), 'Must export ModalWrapper component');
    assert.ok(content.includes('useModalDismiss'), 'Must wrap useModalDismiss hook');
    assert.ok(content.includes('role={role}'), 'Must apply dialog role');
  });

  await t.test('4. InterstitialModal integrates universal dismiss safely', () => {
    const adModalPath = path.join(ROOT_DIR, 'src/components/ads/InterstitialModal.tsx');
    assert.ok(fs.existsSync(adModalPath), 'InterstitialModal.tsx must exist');

    const content = fs.readFileSync(adModalPath, 'utf8');
    assert.ok(content.includes('useModalDismiss'), 'InterstitialModal must use useModalDismiss');
    assert.ok(content.includes('closeOnEscape: canSkip'), 'Escape must respect canSkip timer');
    assert.ok(content.includes('closeOnBackdrop: canSkip'), 'Backdrop click must respect canSkip timer');
  });

  await t.test('5. CandidateDetailDrawer integrates dismiss and prevents modal conflicts', () => {
    const drawerPath = path.join(ROOT_DIR, 'src/components/inbox/CandidateDetailDrawer.tsx');
    assert.ok(fs.existsSync(drawerPath), 'CandidateDetailDrawer.tsx must exist');

    const content = fs.readFileSync(drawerPath, 'utf8');
    assert.ok(content.includes('useModalDismiss'), 'CandidateDetailDrawer must use useModalDismiss');
    assert.ok(
      content.includes('!directPublishOpen && !fixIssuesOpen'),
      'Drawer must not capture Escape when nested modals are open'
    );
  });

  await t.test('6. Admin modals (FixIssuesModal & OwnerDirectPublishModal) integrate dismiss', () => {
    const fixPath = path.join(ROOT_DIR, 'src/components/admin/FixIssuesModal.tsx');
    const pubPath = path.join(ROOT_DIR, 'src/components/admin/OwnerDirectPublishModal.tsx');

    const fixContent = fs.readFileSync(fixPath, 'utf8');
    const pubContent = fs.readFileSync(pubPath, 'utf8');

    assert.ok(fixContent.includes('useModalDismiss'), 'FixIssuesModal must use useModalDismiss');
    assert.ok(fixContent.includes('closeOnEscape: !isRepairing'), 'Must not close while repairing');

    assert.ok(pubContent.includes('useModalDismiss'), 'OwnerDirectPublishModal must use useModalDismiss');
    assert.ok(pubContent.includes('closeOnEscape: !isSubmitting'), 'Must not close while submitting');
  });

  await t.test('7. OwnerReviewCenterTab wraps all inline modals with ModalWrapper', () => {
    const tabPath = path.join(ROOT_DIR, 'src/components/admin/OwnerReviewCenterTab.tsx');
    const content = fs.readFileSync(tabPath, 'utf8');

    assert.ok(content.includes('ModalWrapper'), 'Must import ModalWrapper');
    assert.ok(content.includes('<ModalWrapper'), 'Must wrap inline modals with ModalWrapper');
  });
});
