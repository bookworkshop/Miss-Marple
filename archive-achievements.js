const achievementSection = document.querySelector('#achievements');
const achievementList = document.querySelector('#achievementList');
const achievementDialog = document.querySelector('#achievementDialog');
const achievementDialogContent = document.querySelector('#achievementDialogContent');
document.querySelector('.about')?.remove();
const gameGrid = document.querySelector('.game-grid');
const collectionEyebrow = document.querySelector('.games-section .section-title p');
if (collectionEyebrow) collectionEyebrow.textContent = 'Three unsolved cases';

function renderArchiveAchievements() {
  if (!window.MysteryAchievements || !achievementSection || !achievementList) return;
  const unlocked = window.MysteryAchievements.loadAchievements();
  const entries = Object.entries(window.MysteryAchievements.definitions).filter(([id]) => unlocked[id]?.unlocked === true);
  achievementSection.hidden = entries.length === 0;
  achievementList.innerHTML = entries.map(([id, definition]) => `<button class="achievement-card" type="button" data-achievement="${id}">
    <span class="achievement-badge-wrap">
      <img class="achievement-badge" src="${window.MysteryAchievements.getAchievementBadgeUrl(id)}" alt="${definition.title} achievement">
      <span class="achievement-css-medallion" aria-hidden="true">TNC</span>
    </span>
    <div><h3>${definition.title}</h3><em>${definition.caseTitle}</em><p>Case № ${definition.caseNumber} solved</p></div>
  </button>`).join('');
  achievementList.querySelectorAll('.achievement-badge').forEach(image => image.addEventListener('error', () => {
    image.style.display = 'none';
    image.nextElementSibling.style.display = 'grid';
  }, { once: true }));
  achievementList.querySelectorAll('[data-achievement]').forEach(card => card.addEventListener('click', () => openAchievement(card.dataset.achievement)));
}

function openAchievement(id) {
  const definition = window.MysteryAchievements?.getAchievementDefinition(id);
  if (!definition || !achievementDialog) return;
  achievementDialogContent.innerHTML = `<img class="achievement-dialog-badge" src="${window.MysteryAchievements.getAchievementBadgeUrl(id)}" alt="${definition.title} achievement">
    <span class="achievement-eyebrow">CASE № ${definition.caseNumber} COMPLETE</span>
    <h2 id="achievementDialogTitle">${definition.title}</h2>
    <h3>${definition.caseTitle}</h3>
    <p>${definition.description}</p>
    <div class="achievement-dialog-actions"><a href="./${definition.caseUrl}">Return to the case →</a><button type="button" data-close-achievement>Close</button></div>`;
  achievementDialogContent.querySelector('[data-close-achievement]').addEventListener('click', () => achievementDialog.close());
  achievementDialog.showModal();
}

achievementDialog?.addEventListener('click', event => { if (event.target === achievementDialog) achievementDialog.close(); });
window.addEventListener('storage', event => { if (event.key === window.MysteryAchievements?.key) renderArchiveAchievements(); });
renderArchiveAchievements();
