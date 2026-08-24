const STORAGE_KEY = 'tuesday-night-club-progress-v1';

const gameScreen = document.querySelector('#gameScreen');
const stageNav = document.querySelector('#stageNav');
const previousButton = document.querySelector('#previousButton');
const continueButton = document.querySelector('#continueButton');
const progressText = document.querySelector('#progressText');
const restartButton = document.querySelector('#restartButton');
const replaySceneButton = document.querySelector('#replaySceneButton');
const toast = document.querySelector('#toast');

let currentScene = 0;
let maxUnlockedScene = 0;
let completedScenes = new Set();
let sceneComplete = false;
let selectedDescription = null;
let clubState = { assignments: {}, correct: [], seated: false };
let debateProgress = { currentIndex: 0, recorded: [], part1Complete: false, part2Started: false };
let gameState = { detectiveApproach: null };
let debateCompleted = false;
let caseDinnerGuests = [null, null, null];
let caseDinnerGuestsComplete = false;
let caseDishesExamined = { lobster: false, trifle: false, breadCheese: false };
let caseDishesReviewed = false;
let caseOutcomes = { mrJones: 'unknown', mrsJones: 'unknown', missClark: 'unknown' };
let caseOutcomesComplete = false;
let medicalReportOpened = false;
let autopsyReportOpened = false;
let caseConfirmedAsMurder = false;
let openSeatMenu = null;
let activeDishNote = null;
let caseDishWords = { lobster: [], trifle: [], breadCheese: [] };
let replayingScene = null;
let mrJonesEvidenceOpened = { inheritance: false, poisonAccess: false, otherWoman: false, cornflour: false, letter: false };
let mrJonesFirstAssessment = null;
let mrJonesAssessmentDraft = null;
let mrJonesNewEvidenceProgress = 0;
let mrJonesEvidenceStatus = { inheritance: 'still-relevant', poisonAccess: 'still-relevant', otherWoman: null, cornflour: null, letter: null };
let mrJonesRevisedAssessment = null;
let mrJonesRevisedDraft = null;
let mrJonesLogicQuestionComplete = false;
let mrJonesSceneCompleted = false;
let theoryReconstruction = {};
let theoryReconstructionCorrect = {};
let theoryReconstructionCompleted = false;
let theoryChallengeProgress = 0;
let theoryChallengesCompleted = { pender: false, joyce: false, petherick: false, raymond: false };
let theoriesFinalQuestionComplete = false;
let theoriesCompleted = false;
let selectedTheoryNote = null;
let activeTheoryChallenge = false;
let clueMeaningSolved = false;
let clueHintsOpened = 0;
let clueSupperConnection = null;
let clueSupperConnectionSolved = false;
let clueInferenceSolved = false;
let clueCompleted = false;
let crimeSequence = [];
let crimeSequenceSolved = false;
let selectivePoisoningSolved = { mrsJones: false, mrJones: false, missClark: false };
let selectiveStatementIndex = 0;
let bantingNoteOpen = false;
let gladysMotiveSolved = false;
let finalCaseSolution = { murderer: null, accomplice: null, method: null, motive: null };
let finalCaseSolved = false;
let dragScrollFrame = null;
let dragScrollDirection = 0;

const answerOrderCache = new Map();
const multipleChoiceSelectors = [
  '.debate-options',
  '.method-options',
  '.murder-question > div',
  '.logic-choices',
  '.challenge-options',
  '.clue-options',
  '.crime-options',
  '.paper-choice-list'
].join(',');

function getAnswerIdentity(button) {
  const data = Object.entries(button.dataset).sort(([left], [right]) => left.localeCompare(right));
  return data.length ? JSON.stringify(data) : button.textContent.trim();
}

function randomizeAnswerGroups(root = gameScreen) {
  root.querySelectorAll(multipleChoiceSelectors).forEach(group => {
    if (group.dataset.answersShuffled === 'true') return;
    const buttons = [...group.children].filter(child => child.matches('button'));
    if (buttons.length < 2) return;

    const context = group.closest('article, section, aside');
    const question = context?.querySelector('h3, h4')?.textContent.trim() || '';
    const identities = buttons.map(getAnswerIdentity);
    const cacheKey = `${currentScene}|${group.className}|${question}|${[...identities].sort().join('||')}`;
    let order = answerOrderCache.get(cacheKey);

    if (!order) {
      order = [...identities];
      for (let index = order.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
      }
      answerOrderCache.set(cacheKey, order);
    }

    const byIdentity = new Map(buttons.map(button => [getAnswerIdentity(button), button]));
    order.forEach(identity => {
      const button = byIdentity.get(identity);
      if (button) group.append(button);
    });

    [...group.children].filter(child => child.matches('button')).forEach((button, index) => {
      const marker = button.querySelector(':scope > span');
      if (marker && /^[A-Z]\.$/.test(marker.textContent.trim())) {
        marker.textContent = `${String.fromCharCode(65 + index)}.`;
      }
    });
    group.dataset.answersShuffled = 'true';
  });
}

const answerShuffleObserver = new MutationObserver(() => randomizeAnswerGroups());
answerShuffleObserver.observe(gameScreen, { childList: true, subtree: true });

function showAchievementUnlocked(id) {
  if (document.querySelector(`[data-achievement-unlock="${id}"]`)) return;
  const achievements = window.MysteryAchievements;
  const definition = achievements?.getAchievementDefinition(id);
  if (!definition) return;
  const notice = document.createElement('aside');
  notice.className = 'achievement-unlock';
  notice.dataset.achievementUnlock = id;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.innerHTML = `<img src="${achievements.getAchievementBadgeUrl(id)}" alt="">
    <div class="achievement-unlock-copy"><span>ACHIEVEMENT UNLOCKED</span><strong>${definition.title}</strong><em>${definition.caseTitle}</em><p>${definition.notification}</p></div>
    <button class="achievement-unlock-close" type="button" aria-label="Close achievement notification">×</button>`;
  const close = () => {
    notice.classList.add('leaving');
    window.setTimeout(() => notice.remove(), 320);
  };
  notice.querySelector('button').addEventListener('click', close);
  document.body.append(notice);
  window.setTimeout(close, 9000);
}

function unlockSolvedCaseAchievement() {
  if (!finalCaseSolved || !window.MysteryAchievements) return;
  const result = window.MysteryAchievements.unlockAchievement('tuesday-night-club');
  if (result.isNew) showAchievementUnlocked('tuesday-night-club');
}

const clubGuests = [
  { id: 'marple', name: 'Miss Marple', image: 'images/miss-marple.png', description: 'Senior citizen' },
  { id: 'raymond', name: 'Raymond West', image: 'images/raymond-west.png', description: 'Writer' },
  { id: 'joyce', name: 'Joyce Lemprière', image: 'images/joyce-lempriere.png', description: 'Artist' },
  { id: 'henry', name: 'Sir Henry Clithering', image: 'images/sir-henry-clithering.png', description: 'Former police commissioner' },
  { id: 'pender', name: 'Dr Pender', image: 'images/dr-pender.png', description: 'Clergyman' },
  { id: 'petherick', name: 'Mr Petherick', image: 'images/mr-petherick.png', description: 'Solicitor' }
];
const descriptionOrder = clubGuests.map(guest => guest.id).sort(() => Math.random() - 0.5);

const debateEntries = [
  {
    id: 'raymond', name: 'Raymond West', record: 'Imagination & Motives', correct: 0,
    question: 'Which idea best matches Raymond’s view?',
    options: ['Imagination can reveal motives that are not immediately obvious.', 'Facts should be examined without prejudice or speculation.', 'Human behaviour usually follows familiar patterns.']
  },
  {
    id: 'joyce', name: 'Joyce Lemprière', record: 'Intuition', correct: 1,
    question: 'Which idea best matches Joyce’s view?',
    options: ['Real experience matters more than theories.', 'Intuition can reveal something important before you can fully explain it.', 'Only confirmed facts should guide an investigation.']
  },
  {
    id: 'petherick', name: 'Mr Petherick', record: 'Facts & Evidence', correct: 0,
    question: 'Which idea best matches Mr Petherick’s view?',
    options: ['Facts should be examined carefully and impartially.', 'The most important clue is often a person’s emotional reaction.', 'A good detective should imagine several unlikely explanations.']
  },
  {
    id: 'pender', name: 'Dr Pender', record: 'Hidden Human Character', correct: 0,
    question: 'Which idea best matches Dr Pender’s view?',
    options: ['People often have a hidden side that the outside world never sees.', 'A mystery should be solved only through physical evidence.', 'The best solution is usually the most imaginative one.']
  },
  {
    id: 'marple', name: 'Miss Marple', record: 'Human Nature', correct: 0,
    question: 'Which idea best matches Miss Marple’s view?',
    options: ['Human behaviour repeats itself in familiar patterns.', 'Official experience is the greatest advantage in solving crime.', 'A detective should ignore everyday behaviour and focus only on evidence.']
  },
  {
    id: 'henry', name: 'Sir Henry Clithering', record: 'Real Experience', correct: 1,
    question: 'Which idea best matches Sir Henry’s view?',
    options: ['Intuition is more reliable than evidence.', 'Experience with real cases gives a practical advantage.', 'Ordinary village life reveals every kind of crime.']
  }
];

const detectiveMethods = [
  { id: 'facts', name: 'Facts', description: 'Examine what is known and question every detail.' },
  { id: 'intuition', name: 'Intuition', description: 'Notice reactions and things that simply feel wrong.' },
  { id: 'imagination', name: 'Imagination', description: 'Consider possibilities that others may overlook.' },
  { id: 'human-nature', name: 'Human Nature', description: 'Look for familiar patterns in the way people behave.' }
];

const sceneShell = (scene, content) => `
  <section class="scene" data-scene="${scene.id}">
    <header class="scene-heading-card">
      <span class="scene-heading-index" aria-hidden="true">${String(scenes.findIndex(item => item.id === scene.id) + 1).padStart(2, '0')}</span>
      <div class="scene-heading-copy">
        <p class="scene-kicker">${scene.name}</p>
        <h2>${scene.title}</h2>
        <p class="scene-intro">${scene.description}</p>
      </div>
      <span class="scene-heading-seal" aria-hidden="true">MM</span>
    </header>
    <div class="rule">◆</div>
    ${content}
  </section>`;

function renderClubScene(resultMessage = '') {
  const allCorrect = clubState.correct.length === clubGuests.length;
  const assignedDescriptions = new Set(Object.values(clubState.assignments));
  const availableDescriptions = descriptionOrder.filter(id => !assignedDescriptions.has(id));

  if (clubState.seated) {
    gameScreen.innerHTML = sceneShell(scenes[0], `<div class="membership-scene">
      <span class="membership-pen" aria-hidden="true">✒</span>
      <span class="membership-photo" aria-hidden="true"></span>
      <span class="membership-glass" aria-hidden="true"></span>
      <article class="membership-card">
        <div class="club-seal">MEMBER<br><strong>NO. 07</strong></div>
        <span class="membership-key" aria-hidden="true">⚿</span>
        <h3>You are now<br>a member of the club.</h3>
        <div class="membership-flourish"><span></span><b>◆</b><span></span></div>
        <p>The fire is lit and the first<br>mystery is ready to be told.</p>
      </article>
    </div>`);
    return;
  }

  if (allCorrect) {
    gameScreen.innerHTML = sceneShell(scenes[0], `<div class="identified-scene" aria-live="polite">
      <article class="identified-card">
        <div class="identified-medallion"><img src="images/miss-marple.png" alt=""></div>
        <h3>The members of the<br>Tuesday Night Club have<br>been identified.</h3>
        <div class="identified-flourish"><span></span><b>♜</b><span></span></div>
        <p>Six guests are present.<br>One chair is still empty.</p>
        <button class="identified-button" id="takeSeatButton" type="button">TAKE YOUR SEAT</button>
      </article>
    </div>`);
    bindClubInteractions();
    return;
  }

  const guestCards = clubGuests.map(guest => {
    const descriptionId = clubState.assignments[guest.id];
    const description = clubGuests.find(item => item.id === descriptionId);
    const isCorrect = clubState.correct.includes(guest.id);
    return `<article class="guest-card ${isCorrect ? 'is-correct' : ''}" data-guest-id="${guest.id}" tabindex="0" role="button" aria-label="${guest.name}. ${description ? 'Описание назначено' : 'Выберите описание'}">
      <div class="guest-portrait"><img src="${guest.image}" alt="Портрет ${guest.name}"></div>
      <h3>${guest.name}</h3>
      <div class="description-slot ${description ? 'filled' : ''}">
        ${description ? `<button class="description-slip assigned ${selectedDescription === description.id ? 'selected' : ''}" type="button" draggable="${!isCorrect}" data-description-id="${description.id}">${description.description}</button>` : '<span>Place description here</span>'}
      </div>
      ${isCorrect ? '<span class="correct-stamp">CORRECT</span>' : ''}
    </article>`;
  }).join('');

  const descriptionCards = availableDescriptions.map(id => {
    const guest = clubGuests.find(item => item.id === id);
    return `<button class="description-slip ${selectedDescription === id ? 'selected' : ''}" type="button" draggable="true" data-description-id="${id}">${guest.description}</button>`;
  }).join('');

  gameScreen.innerHTML = sceneShell(scenes[0], `<div class="matching-board">
    <div class="matching-heading"><p>MATCH THE DESCRIPTION TO THE CHARACTER</p><span>Click a description, then a portrait — or drag the paper label.</span></div>
    <div class="guest-grid">${guestCards}</div>
    <section class="description-bank" aria-labelledby="descriptionBankTitle">
      <h3 id="descriptionBankTitle">Guest descriptions</h3>
      <div class="description-list">${descriptionCards || '<p class="bank-empty">All descriptions have been placed.</p>'}</div>
    </section>
    <div class="matching-actions">
      <button class="action-button" id="checkGuestsButton" type="button" ${Object.keys(clubState.assignments).length < clubGuests.length || allCorrect ? 'disabled' : ''}>CHECK THE GUEST LIST</button>
      <p class="match-message" id="clubMessage" aria-live="polite">${resultMessage}</p>
    </div>
  </div>`);

  bindClubInteractions();
}

function bindClubInteractions() {
  const selectDescription = id => {
    if (clubState.correct.includes(id)) return;
    selectedDescription = selectedDescription === id ? null : id;
    document.querySelectorAll('[data-description-id]').forEach(card => card.classList.toggle('selected', card.dataset.descriptionId === selectedDescription));
    const message = document.querySelector('#clubMessage');
    if (message) message.textContent = selectedDescription ? 'Now choose a guest portrait.' : '';
    if (selectedDescription && window.matchMedia('(max-width: 1050px)').matches) {
      document.querySelector('.guest-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const assignDescription = (guestId, descriptionId) => {
    if (!descriptionId || clubState.correct.includes(guestId)) return;
    Object.keys(clubState.assignments).forEach(id => {
      if (clubState.assignments[id] === descriptionId && !clubState.correct.includes(id)) delete clubState.assignments[id];
    });
    clubState.assignments[guestId] = descriptionId;
    selectedDescription = null;
    saveGame();
    renderClubScene();
    if (window.matchMedia('(max-width: 1050px)').matches) {
      window.setTimeout(() => document.querySelector('.description-bank')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    }
  };

  document.querySelectorAll('[data-description-id]').forEach(card => {
    card.addEventListener('click', event => { event.stopPropagation(); selectDescription(card.dataset.descriptionId); });
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); selectDescription(card.dataset.descriptionId); }
    });
    card.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', card.dataset.descriptionId);
      event.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  document.querySelectorAll('[data-guest-id]').forEach(card => {
    const chooseGuest = () => assignDescription(card.dataset.guestId, selectedDescription);
    card.addEventListener('click', chooseGuest);
    card.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === card) { event.preventDefault(); chooseGuest(); }
    });
    card.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', event => {
      event.preventDefault(); card.classList.remove('drag-over');
      assignDescription(card.dataset.guestId, event.dataTransfer.getData('text/plain'));
    });
  });

  const checkButton = document.querySelector('#checkGuestsButton');
  if (checkButton) checkButton.addEventListener('click', () => {
    const newlyCorrect = [];
    const wrongGuests = [];
    clubGuests.forEach(guest => {
      if (clubState.assignments[guest.id] === guest.id) newlyCorrect.push(guest.id);
      else wrongGuests.push(guest.id);
    });
    clubState.correct = [...new Set([...clubState.correct, ...newlyCorrect])];
    wrongGuests.forEach(id => delete clubState.assignments[id]);
    saveGame();
    const complete = clubState.correct.length === clubGuests.length;
    renderClubScene(complete ? 'The members of the Tuesday Night Club have been identified.' : 'Some descriptions are still in the wrong place. Look at the guests again.');
    if (!complete) document.querySelector('.matching-board').classList.add('has-errors');
  });

  const takeSeatButton = document.querySelector('#takeSeatButton');
  if (takeSeatButton) takeSeatButton.addEventListener('click', () => {
    clubState.seated = true;
    saveGame();
    completeCurrentScene();
    goToNextScene();
  });
}

function handleDragAutoScroll(event) {
  const edge = Math.min(150, window.innerHeight * 0.2);
  if (event.clientY < edge) dragScrollDirection = -Math.max(7, Math.round((edge - event.clientY) / 5));
  else if (event.clientY > window.innerHeight - edge) dragScrollDirection = Math.max(7, Math.round((event.clientY - (window.innerHeight - edge)) / 5));
  else dragScrollDirection = 0;

  if (dragScrollFrame) return;
  const scroll = () => {
    if (!dragScrollDirection) { dragScrollFrame = null; return; }
    window.scrollBy(0, dragScrollDirection);
    dragScrollFrame = window.requestAnimationFrame(scroll);
  };
  dragScrollFrame = window.requestAnimationFrame(scroll);
}

function stopDragAutoScroll() {
  dragScrollDirection = 0;
  if (dragScrollFrame) window.cancelAnimationFrame(dragScrollFrame);
  dragScrollFrame = null;
}

function renderMinutesList() {
  const recordedEntries = debateEntries.filter(entry => debateProgress.recorded.includes(entry.id));
  return `<aside class="minutes-ledger" aria-label="Recorded club minutes">
    <div class="minutes-ledger-head"><span>CLUB MINUTES</span><small>${recordedEntries.length} / 6 entries</small></div>
    <ol>${recordedEntries.map(entry => `<li><span>${entry.name}</span><strong>${entry.record}</strong></li>`).join('') || '<li class="minutes-empty">No views recorded yet.</li>'}</ol>
    ${debateProgress.part1Complete ? '<div class="debate-stamp">DEBATE<br>RECORDED</div>' : ''}
  </aside>`;
}

function renderMinutesEmblem() {
  return `<span class="minutes-ribbon" aria-hidden="true"></span><div class="minutes-emblem" aria-hidden="true"><img class="emblem-art" src="images/miss-marple-cameo.png" alt=""></div>`;
}

function renderDebatePortrait(entry) {
  const portraits = {
    raymond: { image: 'images/raymond-west-animated.gif', motion: 'hand', note: 'A thoughtful movement of the pen' },
    joyce: { image: 'images/joyce-lempriere-animated.gif', motion: 'tilt', note: 'An artist considering another angle' },
    petherick: { image: 'images/mr-petherick-animated.gif', motion: 'glasses', note: 'A solicitor examining the details' },
    pender: { image: 'images/dr-pender-animated.gif', motion: 'nod', note: 'A quiet, thoughtful objection' },
    marple: { image: 'images/miss-marple-animated.gif', motion: 'knitting', note: 'Knitting, listening and observing' },
    henry: { image: 'images/sir-henry-clithering-animated.gif', motion: 'breathe', note: 'Experience weighs the evidence' }
  };
  const portrait = portraits[entry.id];
  return `<figure class="debate-portrait motion-${portrait.motion}">
    <div class="portrait-frame">
      <img src="${portrait.image}" alt="${entry.name}">
      <span class="portrait-motion-layer" style="--portrait-image:url('${portrait.image}')" aria-hidden="true"></span>
    </div>
    <figcaption><strong>${entry.name}</strong></figcaption>
  </figure>`;
}

function renderDebateScene(message = '') {
  if (debateCompleted) {
    const chosen = detectiveMethods.find(method => method.id === gameState.detectiveApproach);
    gameScreen.innerHTML = sceneShell(scenes[1], `<section class="minutes-sheet debate-finished">${renderMinutesEmblem()}
      <header class="minutes-heading"><span>MINUTES OF THE TUESDAY NIGHT CLUB</span><small>What makes a good detective?</small></header>
      <div class="debate-stamp">METHOD<br>RECORDED</div>
      <p class="part-label">YOUR DETECTIVE METHOD</p>
      <h3>${chosen?.name || ''}</h3>
      <p>${chosen?.description || ''}</p>
      <small>Your choice has been entered into the minutes. Continue to hear the case.</small>
    </section>`);
    return;
  }

  if (debateProgress.part1Complete && debateProgress.part2Started) {
    renderDetectiveMethod(message);
    return;
  }

  if (debateProgress.part1Complete) {
    gameScreen.innerHTML = sceneShell(scenes[1], `<section class="minutes-sheet">${renderMinutesEmblem()}
      <header class="minutes-heading"><span>MINUTES OF THE TUESDAY NIGHT CLUB</span><small>What makes a good detective?</small></header>
      <div class="debate-recorded-view">
        <div class="debate-stamp">DEBATE<br>RECORDED</div>
        <h3>Everyone has made their case.</h3>
        ${renderMinutesList()}
        <button class="minutes-button" id="openMethodButton" type="button">CHOOSE YOUR METHOD →</button>
      </div>
    </section>`);
    document.querySelector('#openMethodButton').addEventListener('click', () => {
      debateProgress.part2Started = true;
      saveGame();
      renderDebateScene();
    });
    return;
  }

  const entry = debateEntries[debateProgress.currentIndex];
  const alreadyRecorded = debateProgress.recorded.includes(entry.id);
  const marks = debateEntries.map((item, index) => `<span class="entry-mark ${debateProgress.recorded.includes(item.id) ? 'recorded' : ''} ${index === debateProgress.currentIndex ? 'current' : ''}" aria-hidden="true"></span>`).join('');

  gameScreen.innerHTML = sceneShell(scenes[1], `<section class="minutes-sheet">${renderMinutesEmblem()}
    <header class="minutes-heading"><span>MINUTES OF THE TUESDAY NIGHT CLUB</span><small>What makes a good detective?</small></header>
    <p class="part-label">PART 1 — RECORD THE DEBATE</p>
    <div class="entry-progress"><span>Entry ${debateProgress.currentIndex + 1} of 6</span><div>${marks}</div></div>
    <div class="debate-layout">
      <article class="debate-entry ${alreadyRecorded ? 'entry-recorded' : ''}">
        <p class="speaker-name">${entry.name}</p>
        <h3>${alreadyRecorded ? entry.record : entry.question}</h3>
        ${alreadyRecorded ? `<div class="recorded-answer"><span>RECORDED</span><p>${entry.name} — ${entry.record}</p></div><button class="minutes-button" id="nextEntryButton" type="button">NEXT ENTRY →</button>` : `<div class="debate-options">${entry.options.map((option, index) => `<button type="button" data-debate-option="${index}"><span>${String.fromCharCode(65 + index)}.</span>${option}</button>`).join('')}</div>`}
        <p class="debate-message" id="debateMessage" aria-live="polite">${message}</p>
      </article>
      <div class="debate-side">${renderDebatePortrait(entry)}</div>
    </div>
  </section>`);

  document.querySelectorAll('[data-debate-option]').forEach(button => button.addEventListener('click', () => {
    const selected = Number(button.dataset.debateOption);
    if (selected !== entry.correct) {
      button.classList.remove('wrong');
      void button.offsetWidth;
      button.classList.add('wrong');
      document.querySelector('#debateMessage').textContent = 'Not quite. Think about the way this person approaches a mystery.';
      return;
    }
    button.classList.add('recorded-choice');
    document.querySelectorAll('[data-debate-option]').forEach(option => { option.disabled = true; });
    if (!debateProgress.recorded.includes(entry.id)) debateProgress.recorded.push(entry.id);
    const isLastEntry = debateProgress.recorded.length === debateEntries.length;
    if (isLastEntry) {
      debateProgress.part1Complete = true;
      debateCompleted = true;
      saveGame();
      completeCurrentScene();
      window.setTimeout(goToNextScene, 520);
      return;
    }
    debateProgress.currentIndex += 1;
    saveGame();
    window.setTimeout(() => renderDebateScene(), 520);
  }));

  document.querySelector('#nextEntryButton')?.addEventListener('click', () => {
    debateProgress.currentIndex = Math.min(debateProgress.currentIndex + 1, debateEntries.length - 1);
    saveGame();
    renderDebateScene();
  });
}

function renderDetectiveMethod(message = '') {
  const selectedMethod = detectiveMethods.find(method => method.id === gameState.detectiveApproach);
  gameScreen.innerHTML = sceneShell(scenes[1], `<section class="minutes-sheet method-sheet">${renderMinutesEmblem()}
    <header class="minutes-heading"><span>MINUTES OF THE TUESDAY NIGHT CLUB</span><small>Part 2 — choose your method</small></header>
    <p class="part-label">PART 2 — CHOOSE YOUR METHOD</p>
    <h3 class="method-title">And what about you?</h3>
    <p class="method-question">What will guide you in this investigation?</p>
    <div class="method-options">${detectiveMethods.map(method => `<button type="button" data-method="${method.id}" class="${gameState.detectiveApproach === method.id ? 'selected' : ''}"><strong>${method.name}</strong><span>${method.description}</span></button>`).join('')}</div>
    <div class="method-summary ${selectedMethod ? 'visible' : ''}">
      <p>YOUR DETECTIVE METHOD</p>
      <h4>${selectedMethod?.name || 'Not selected'}</h4>
      <span>${selectedMethod?.description || 'Choose the principle that will guide your investigation.'}</span>
    </div>
    <button class="minutes-button confirm-method" id="confirmMethodButton" type="button" ${selectedMethod ? '' : 'disabled'}>CONFIRM MY METHOD</button>
    <p class="debate-message" aria-live="polite">${message}</p>
  </section>`);

  document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => {
    gameState.detectiveApproach = button.dataset.method;
    saveGame();
    renderDetectiveMethod();
  }));
  document.querySelector('#confirmMethodButton').addEventListener('click', () => {
    if (!gameState.detectiveApproach) return;
    debateCompleted = true;
    saveGame();
    completeCurrentScene();
    goToNextScene();
  });
}

function getDetectiveHint(context) {
  switch (gameState.detectiveApproach) {
    case 'facts': return context.facts;
    case 'intuition': return context.intuition;
    case 'imagination': return context.imagination;
    case 'human-nature': return context.humanNature;
    default: return '';
  }
}

const dinnerGuests = [
  { id: 'mrJones', name: 'Mr Jones' },
  { id: 'mrsJones', name: 'Mrs Jones' },
  { id: 'missClark', name: 'Miss Clark' },
  { id: 'gladys', name: 'Gladys Linch' }
];
const dinnerDishes = [
  { id: 'lobster', name: 'TINNED LOBSTER AND SALAD', mark: 'I', words: ['TINNED', 'LOBSTER', 'AND', 'SALAD'], acceptedOrders: ['TINNED LOBSTER AND SALAD', 'SALAD AND TINNED LOBSTER'], shuffled: ['SALAD', 'CHEESE', 'TINNED', 'AND', 'LOBSTER'] },
  { id: 'trifle', name: 'TRIFLE', mark: 'II', words: ['TRIFLE'], shuffled: ['PUDDING', 'TRIFLE', 'SALAD'] },
  { id: 'breadCheese', name: 'BREAD AND CHEESE', mark: 'III', words: ['BREAD', 'AND', 'CHEESE'], acceptedOrders: ['BREAD AND CHEESE', 'CHEESE AND BREAD'], shuffled: ['CHEESE', 'SALAD', 'BREAD', 'AND'] }
];
const outcomePeople = [
  { id: 'mrJones', name: 'Mr Jones' }, { id: 'mrsJones', name: 'Mrs Jones' }, { id: 'missClark', name: 'Miss Clark' }
];

function renderCaseNotebook() {
  const allDishes = Object.values(caseDishesExamined).every(Boolean);
  return `<aside class="case-notebook" aria-label="Case notes">
    <p class="case-label">DETECTIVE'S NOTEBOOK</p>
    <h3>What we know</h3>
    <ol>
      ${caseDinnerGuestsComplete ? '<li>Three people sat down to supper.</li>' : '<li class="muted">Who was at the table?</li>'}
      ${allDishes ? '<li>The supper included lobster and salad, trifle, and bread and cheese.</li>' : ''}
      ${caseOutcomesComplete ? '<li>Three became ill. Mr Jones and Miss Clark recovered. Mrs Jones died.</li>' : ''}
      ${medicalReportOpened ? '<li>Initial explanation: <s>ptomaine poisoning</s>.</li>' : ''}
      ${autopsyReportOpened ? '<li>New evidence: arsenic was found.</li>' : ''}
    </ol>
    ${caseConfirmedAsMurder ? '<div class="murder-stamp">STATUS<br><strong>MURDER</strong></div>' : ''}
  </aside>`;
}

function renderCaseScene(message = '') {
  const allDishes = Object.values(caseDishesExamined).every(Boolean);
  const guestOptions = dinnerGuests.map(guest => `<button type="button" data-seat-choice="${guest.id}" ${caseDinnerGuests.includes(guest.id) ? 'disabled' : ''}>${guest.name}</button>`).join('');
  let task = '';

  if (!caseDinnerGuestsComplete) {
    task = `<section class="case-task seating-task">
      <div class="case-part"><span>PART I</span><strong>RECONSTRUCT THE TABLE</strong></div>
      <p>Three people sat down to supper. Select a name for each place.</p>
      <div class="dinner-table" aria-label="Three places at the supper table">
        <span class="table-candle" aria-hidden="true"></span>
        ${caseDinnerGuests.map((guestId, index) => `<div class="dinner-place place-${index + 1}">
          <button class="seat-button ${guestId ? 'occupied' : ''}" type="button" data-seat="${index}" aria-expanded="${openSeatMenu === index}">
            <span class="plate" aria-hidden="true"></span><strong>${guestId ? dinnerGuests.find(g => g.id === guestId).name : 'EMPTY SEAT'}</strong>
          </button>
          ${openSeatMenu === index ? `<div class="seat-menu" aria-label="Choose a guest">${guestOptions}</div>` : ''}
        </div>`).join('')}
      </div>
      <button class="case-action" id="checkDinnerGuests" type="button" ${caseDinnerGuests.every(Boolean) ? '' : 'disabled'}>CHECK THE TABLE</button>
    </section>`;
  } else if (!caseDishesReviewed) {
    const activeDish = dinnerDishes.find(dish => dish.id === activeDishNote);
    task = `<section class="case-task dishes-task">
      <div class="case-part"><span>PART II</span><strong>EXAMINE THE SUPPER</strong></div>
      <p>Lift each cover. Then arrange the words to identify the dish.</p>
      <div class="supper-board">${dinnerDishes.map(dish => `<button type="button" class="serving-dish ${caseDishesExamined[dish.id] ? 'examined' : ''} ${activeDishNote === dish.id ? 'active' : ''}" data-dish="${dish.id}" aria-label="${caseDishesExamined[dish.id] ? dish.name : `Covered serving dish ${dish.mark}. Lift the cover`}"><span class="cloche-mark">${dish.mark}</span>${caseDishesExamined[dish.id] ? `<strong>${dish.name}</strong><small>PART OF THE SUPPER · NOTED</small>` : '<strong class="visually-hidden">Covered dish</strong><small>◆ LIFT THE COVER ◆</small>'}</button>`).join('')}</div>
      ${activeDish && !caseDishesExamined[activeDish.id] ? `<section class="dish-word-puzzle" aria-labelledby="dishPuzzleTitle">
        <p class="case-label">UNDER THE COVER</p><h3 id="dishPuzzleTitle">Compose the name of the dish</h3>
        <div class="dish-answer" aria-live="polite">${caseDishWords[activeDish.id].map((word, index) => `<button type="button" data-remove-word="${index}" title="Remove ${word}">${word}</button>`).join('') || '<span>Select the words in the correct order</span>'}</div>
        <div class="dish-word-bank">${activeDish.shuffled.map((word, index) => `<button type="button" data-dish-word="${word}" data-word-index="${index}" ${caseDishWords[activeDish.id].includes(word) ? 'disabled' : ''}>${word}</button>`).join('')}</div>
        <button class="case-action compact" id="checkDishName" type="button" ${caseDishWords[activeDish.id].length === activeDish.words.length ? '' : 'disabled'}>CHECK THE DISH</button>
      </section>` : ''}
      <button class="case-action" id="recordSupper" type="button" ${allDishes ? '' : 'disabled'}>ENTER SUPPER IN NOTEBOOK →</button>
    </section>`;
  } else if (!caseOutcomesComplete) {
    task = `<section class="case-task outcomes-task">
      <div class="case-part"><span>PART III</span><strong>RECORD WHAT FOLLOWED</strong></div>
      <p>All three became ill. Press each name to change the recorded outcome.</p>
      <div class="outcome-list">${outcomePeople.map(person => `<button type="button" data-outcome="${person.id}" class="outcome-${caseOutcomes[person.id]}"><strong>${person.name}</strong><span>${caseOutcomes[person.id].toUpperCase()}</span></button>`).join('')}</div>
      <button class="case-action" id="checkOutcomes" type="button" ${Object.values(caseOutcomes).every(value => value !== 'unknown') ? '' : 'disabled'}>CHECK SIR HENRY'S ACCOUNT</button>
    </section>`;
  } else {
    medicalReportOpened = true;
    autopsyReportOpened = true;
    task = `<section class="case-task reports-task ${caseConfirmedAsMurder ? 'is-murder' : ''}">
      <div class="case-part"><span>PART IV</span><strong>QUESTION THE CONCLUSION</strong></div>
      <div class="report-desk">
        <article class="medical-file opened rejected">
          <span>MEDICAL CERTIFICATE</span><strong>PTOMAINE POISONING</strong>
          <dl class="report-facts"><div><dt>Mr Jones</dt><dd>Recovered</dd></div><div><dt>Miss Clark</dt><dd>Recovered</dd></div><div><dt>Mrs Jones</dt><dd>Died</dd></div></dl>
          <small>The doctor believed the death was caused by food poisoning.</small><i>CASE CLOSED?</i>
        </article>
        <article class="autopsy-file opened"><span>POST-MORTEM REPORT</span><strong>ARSENIC FOUND</strong><dl class="report-facts"><div><dt>Subject</dt><dd>Mrs Jones</dd></div><div><dt>Finding</dt><dd>Arsenic</dd></div><div><dt>Cause of death</dt><dd>Arsenical poisoning</dd></div></dl><small>The post-mortem examination showed that Mrs Jones had died of arsenical poisoning.</small></article>
      </div>
      ${!caseConfirmedAsMurder ? `<aside class="murder-question"><span>YOUR CONCLUSION</span><h3>Was it a murder?</h3><div><button type="button" data-murder-answer="yes">YES</button><button type="button" data-murder-answer="no">NO</button></div></aside>` : ''}
      ${caseConfirmedAsMurder ? '<div class="case-revelation" aria-live="polite"><span>MURDER CONFIRMED</span><h3>The supper was not an accident.</h3><p>Sir Henry now has a murder to explain.</p></div>' : ''}
    </section>`;
  }

  gameScreen.innerHTML = sceneShell(scenes[2], `<div class="case-reconstruction ${caseOutcomesComplete ? 'after-death' : ''}"><div class="case-workspace">${task}</div><p class="case-message" id="caseMessage" aria-live="polite">${message}</p></div>`);

  document.querySelectorAll('[data-seat]').forEach(button => button.addEventListener('click', () => { openSeatMenu = openSeatMenu === Number(button.dataset.seat) ? null : Number(button.dataset.seat); renderCaseScene(); }));
  document.querySelectorAll('[data-seat-choice]').forEach(button => button.addEventListener('click', () => { caseDinnerGuests[openSeatMenu] = button.dataset.seatChoice; openSeatMenu = null; saveGame(); renderCaseScene(); }));
  document.querySelector('#checkDinnerGuests')?.addEventListener('click', () => {
    const correct = ['mrJones', 'mrsJones', 'missClark'].every(id => caseDinnerGuests.includes(id));
    if (!correct) { caseDinnerGuests = [null, null, null]; saveGame(); renderCaseScene('Someone at this table does not belong here. Remember: three people sat down to supper.'); return; }
    caseDinnerGuestsComplete = true; saveGame(); renderCaseScene('Three people sat down to supper.');
  });
  document.querySelectorAll('[data-dish]').forEach(button => button.addEventListener('click', () => { activeDishNote = button.dataset.dish; saveGame(); renderCaseScene(); }));
  document.querySelectorAll('[data-dish-word]').forEach(button => button.addEventListener('click', () => { caseDishWords[activeDishNote].push(button.dataset.dishWord); saveGame(); renderCaseScene(); }));
  document.querySelectorAll('[data-remove-word]').forEach(button => button.addEventListener('click', () => { caseDishWords[activeDishNote].splice(Number(button.dataset.removeWord), 1); saveGame(); renderCaseScene(); }));
  document.querySelector('#checkDishName')?.addEventListener('click', () => {
    const dish = dinnerDishes.find(item => item.id === activeDishNote);
    const assembledName = caseDishWords[dish.id].join(' ');
    const acceptedOrders = dish.acceptedOrders || [dish.words.join(' ')];
    if (!acceptedOrders.includes(assembledName)) { caseDishWords[dish.id] = []; saveGame(); renderCaseScene('The words are not in the right order. Try the dish again.'); return; }
    caseDishesExamined[dish.id] = true; activeDishNote = null; saveGame(); renderCaseScene(`${dish.name} has been entered in the supper list.`);
  });
  document.querySelector('#recordSupper')?.addEventListener('click', () => { caseDishesReviewed = true; activeDishNote = null; saveGame(); renderCaseScene(); });
  document.querySelectorAll('[data-outcome]').forEach(button => button.addEventListener('click', () => { const values = ['unknown', 'recovered', 'died']; const id = button.dataset.outcome; caseOutcomes[id] = values[(values.indexOf(caseOutcomes[id]) + 1) % values.length]; saveGame(); renderCaseScene(); }));
  document.querySelector('#checkOutcomes')?.addEventListener('click', () => {
    if (caseOutcomes.mrJones !== 'recovered' || caseOutcomes.missClark !== 'recovered' || caseOutcomes.mrsJones !== 'died') { renderCaseScene('The outcome does not match Sir Henry’s account.'); return; }
    caseOutcomesComplete = true; medicalReportOpened = true; autopsyReportOpened = true; saveGame(); renderCaseScene('Three people became ill. Two recovered. One died.');
  });
  document.querySelectorAll('[data-murder-answer]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.murderAnswer === 'no') { renderCaseScene('Arsenic was found after an apparent case of food poisoning. Examine the reports again.'); return; }
    caseConfirmedAsMurder = true; saveGame(); completeCurrentScene(); window.setTimeout(goToNextScene, 650);
  }));
}

const mrJonesEvidence = [
  { id: 'inheritance', title: '£8,000 INHERITANCE', text: 'Mrs Jones left her husband £8,000.', label: 'MOTIVE?' },
  { id: 'poisonAccess', title: 'ACCESS TO POISON', text: 'Mr Jones worked for a firm that manufactured chemicals and had access to arsenic.', label: 'MEANS?' },
  { id: 'otherWoman', title: 'ANOTHER WOMAN', text: 'There were rumours that Mr Jones was interested in the doctor’s daughter.', label: 'MOTIVE?' },
  { id: 'cornflour', title: 'THE CORNFLOUR', text: 'When Mrs Jones felt ill, Mr Jones asked for cornflour and carried it upstairs himself.', label: 'OPPORTUNITY?' },
  { id: 'letter', title: 'THE LETTER', text: 'Suspicious words were discovered on the blotting paper of a letter written by Mr Jones.', label: 'SUSPICIOUS?' }
];
const mrJonesNewEvidence = [
  { type: 'NEW STATEMENT', text: 'Miss Clark, not Mrs Jones, drank the cornflour.', target: 'cornflour', status: 'method-not-proved', statusLabel: 'METHOD NOT PROVED', note: 'Mrs Jones did not drink it.' },
  { type: 'NEW INFORMATION', text: 'The words on the blotting paper referred to Mr Jones’s brother in Australia.', target: 'letter', status: 'explained', statusLabel: 'EXPLAINED', note: 'The message was not about Mrs Jones.' },
  { type: 'NEW TESTIMONY', text: 'Mr Jones had not recently been meeting the doctor’s daughter.', target: 'otherWoman', status: 'not-supported', statusLabel: 'NOT SUPPORTED', note: 'The supposed relationship is not supported by the new evidence.' }
];
const assessmentOptions = [
  { id: 'weak', label: 'WEAK' }, { id: 'possible', label: 'POSSIBLE' }, { id: 'strong', label: 'STRONG' }, { id: 'very-strong', label: 'VERY STRONG' }
];

function mrJonesStatusLabel(id) {
  const status = mrJonesEvidenceStatus[id];
  return status === 'still-relevant' ? 'STILL RELEVANT' : status === 'method-not-proved' ? 'METHOD NOT PROVED' : status === 'not-supported' ? 'NOT SUPPORTED' : status === 'explained' ? 'EXPLAINED' : '';
}

function renderAssessmentScale(draft, mode) {
  return `<div class="investigator-scale" role="group" aria-label="How strong is the case against Mr Jones?">${assessmentOptions.map(option => `<button type="button" data-assessment-mode="${mode}" data-assessment="${option.id}" class="${draft === option.id ? 'selected' : ''}"><span></span><strong>${option.label}</strong></button>`).join('')}</div>`;
}

function renderMrJonesEvidenceScene(message = '') {
  const allOpened = Object.values(mrJonesEvidenceOpened).every(Boolean);
  const newItem = mrJonesFirstAssessment && mrJonesNewEvidenceProgress < 3 ? mrJonesNewEvidence[mrJonesNewEvidenceProgress] : null;
  const statusNotes = {
    cornflour: 'Mrs Jones did not drink it.', letter: 'The message was not about Mrs Jones.', otherWoman: 'The supposed relationship is not supported by the new evidence.'
  };
  const boardCards = mrJonesEvidence.map((evidence, index) => {
    const opened = mrJonesEvidenceOpened[evidence.id];
    const changed = Boolean(mrJonesEvidenceStatus[evidence.id] && !['still-relevant'].includes(mrJonesEvidenceStatus[evidence.id]));
    const clickableForUpdate = newItem && opened;
    return `<button type="button" class="jones-evidence-card evidence-${index + 1} ${opened ? 'opened' : 'sealed'} ${changed ? 'reconsidered' : ''} ${mrJonesEvidenceStatus[evidence.id] === 'still-relevant' && mrJonesNewEvidenceProgress === 3 ? 'still-relevant' : ''}" data-jones-evidence="${evidence.id}" ${opened && !clickableForUpdate ? 'disabled' : ''}>
      <span class="evidence-number">0${index + 1}</span><h3>${evidence.title}</h3>
      ${opened ? `<p>${evidence.text}</p><div class="evidence-tag"><s>${changed ? evidence.label : ''}</s><strong>${changed || mrJonesNewEvidenceProgress === 3 ? mrJonesStatusLabel(evidence.id) : evidence.label}</strong></div>${changed ? `<small>${statusNotes[evidence.id]}</small>` : ''}` : '<span class="evidence-seal">OPEN FILE</span>'}
    </button>`;
  }).join('');

  let actionPanel = '';
  if (!allOpened) {
    actionPanel = `<section class="jones-action-panel"><p class="board-part">PART 1 · EXAMINE THE EVIDENCE</p><h3>Open all five case materials.</h3><button type="button" class="instinct-button" id="jonesInstinct">YOUR INSTINCT</button><p class="instinct-hint" id="instinctHint"></p></section>`;
  } else if (!mrJonesFirstAssessment) {
    actionPanel = `<section class="jones-action-panel assessment-panel"><p class="board-part">YOUR FIRST ASSESSMENT</p><h3>How strong is the case against Mr Jones?</h3>${renderAssessmentScale(mrJonesAssessmentDraft, 'first')}<button class="case-action" id="recordFirstAssessment" type="button" ${mrJonesAssessmentDraft ? '' : 'disabled'}>RECORD MY ASSESSMENT</button></section>`;
  } else if (mrJonesNewEvidenceProgress < 3) {
    actionPanel = `<section class="jones-action-panel new-evidence-panel"><div class="new-evidence-stamp">NEW EVIDENCE RECEIVED</div><article><span>${newItem.type}</span><p>${newItem.text}</p></article><h3>Which part of the case does this change?</h3><p>Choose one of the five evidence cards on the board.</p><button type="button" class="instinct-button" id="jonesInstinct">YOUR INSTINCT</button><p class="instinct-hint" id="instinctHint"></p></section>`;
  } else if (!mrJonesRevisedAssessment) {
    actionPanel = `<section class="jones-action-panel assessment-panel changed-assessment"><div class="new-evidence-stamp">THE CASE HAS CHANGED</div><div class="assessment-ticket"><span>FIRST ASSESSMENT</span><strong>${mrJonesFirstAssessment.replace('-', ' ').toUpperCase()}</strong></div><h3>How strong is the case against Mr Jones now?</h3>${renderAssessmentScale(mrJonesRevisedDraft, 'revised')}<button class="case-action" id="recordRevisedAssessment" type="button" ${mrJonesRevisedDraft ? '' : 'disabled'}>RECORD MY NEW ASSESSMENT</button></section>`;
  } else if (!mrJonesLogicQuestionComplete) {
    actionPanel = `<section class="jones-action-panel logic-panel"><p class="board-part">ONE MORE QUESTION</p><p>Some of the evidence against Mr Jones was misleading.</p><h3>Does that prove that Mr Jones is innocent?</h3><div class="logic-choices"><button type="button" data-logic-answer="yes"><strong>YES</strong><span>The case against him has collapsed, so he must be innocent.</span></button><button type="button" data-logic-answer="no"><strong>NO</strong><span>Weak or misleading evidence does not prove that a suspect is innocent.</span></button></div></section>`;
  } else {
    actionPanel = `<section class="jones-action-panel conclusion-panel"><div class="new-evidence-stamp">THE CASE HAS CHANGED</div><div class="assessment-pair"><div><span>FIRST ASSESSMENT</span><strong>${mrJonesFirstAssessment.replace('-', ' ').toUpperCase()}</strong></div><div><span>REVISED ASSESSMENT</span><strong>${mrJonesRevisedAssessment.replace('-', ' ').toUpperCase()}</strong></div></div><h3>Mr Jones remains a suspect.</h3><p>But the original case against him is no longer enough.</p></section>`;
  }

  gameScreen.innerHTML = sceneShell(scenes[3], `<div class="jones-board-wrap"><section class="jones-board ${mrJonesNewEvidenceProgress ? 'board-changing' : ''}">
    <div class="jones-board-head"><span>INVESTIGATION BOARD · PRIVATE</span>${mrJonesFirstAssessment ? `<div class="assessment-ticket"><span>FIRST ASSESSMENT</span><strong>${mrJonesFirstAssessment.replace('-', ' ').toUpperCase()}</strong></div>` : ''}</div>
    <div class="jones-suspect"><div class="suspect-silhouette"><img src="images/mr-jones.png" alt="Portrait of Mr Jones"></div><h3>MR JONES</h3><p>Husband of the victim</p></div>
    <div class="jones-evidence-grid">${boardCards}</div>${actionPanel}
  </section><p class="jones-message" id="jonesMessage" aria-live="polite">${message}</p></div>`);

  document.querySelectorAll('[data-jones-evidence]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.jonesEvidence;
    if (!mrJonesEvidenceOpened[id]) { mrJonesEvidenceOpened[id] = true; saveGame(); renderMrJonesEvidenceScene(); return; }
    if (!newItem) return;
    if (id !== newItem.target) { renderMrJonesEvidenceScene('That evidence is not affected by this statement. Look again.'); return; }
    mrJonesEvidenceStatus[id] = newItem.status; mrJonesNewEvidenceProgress += 1; saveGame(); renderMrJonesEvidenceScene();
  }));
  document.querySelectorAll('[data-assessment]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.assessmentMode === 'first') mrJonesAssessmentDraft = button.dataset.assessment;
    else mrJonesRevisedDraft = button.dataset.assessment;
    renderMrJonesEvidenceScene();
  }));
  document.querySelector('#recordFirstAssessment')?.addEventListener('click', () => { mrJonesFirstAssessment = mrJonesAssessmentDraft; saveGame(); renderMrJonesEvidenceScene(); });
  document.querySelector('#recordRevisedAssessment')?.addEventListener('click', () => { mrJonesRevisedAssessment = mrJonesRevisedDraft; saveGame(); renderMrJonesEvidenceScene(); });
  document.querySelectorAll('[data-logic-answer]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.logicAnswer === 'yes') { renderMrJonesEvidenceScene('Not quite. Evidence against a suspect can fail without proving the opposite.'); return; }
    mrJonesLogicQuestionComplete = true; mrJonesSceneCompleted = true; saveGame(); completeCurrentScene(); renderMrJonesEvidenceScene('Exactly. Weak evidence is not the same as proof of innocence.');
  }));
  document.querySelector('#jonesInstinct')?.addEventListener('click', () => {
    const context = mrJonesNewEvidenceProgress || mrJonesFirstAssessment ? { facts: 'Compare each new statement with the exact evidence it affects.', intuition: 'Notice which parts of the story no longer feel as convincing as before.', imagination: 'Could a suspicious detail be true but mean something completely different?', humanNature: 'Do not confuse a suspicious person with a proven murderer.' } : { facts: 'Separate confirmed facts from the conclusions built around them.', intuition: 'Which details make Mr Jones look suspicious, even before they are fully explained?', imagination: 'Several pieces seem to point at Mr Jones — but could they have another explanation?', humanNature: 'Ask what Mr Jones might gain from his wife’s death.' };
    document.querySelector('#instinctHint').textContent = getDetectiveHint(context);
  });
}

const theoryCharacters = [
  { id: 'pender', name: 'DR PENDER', image: 'images/dr-pender.png', summary: 'Mr Jones is guilty, although the exact method remains unclear.' },
  { id: 'joyce', name: 'JOYCE LEMPRIÈRE', image: 'images/joyce-lempriere.png', summary: 'Miss Clark may be lying, and the cornflour story may not be what it seems.' },
  { id: 'petherick', name: 'MR PETHERICK', image: 'images/mr-petherick.png', summary: 'Mr Jones may be guilty, with Miss Clark possibly helping to protect him.' },
  { id: 'raymond', name: 'RAYMOND WEST', image: 'images/raymond-west.png', summary: 'The poison may have been introduced through Mrs Jones’s medicine, possibly involving the doctor’s daughter.' }
];
const theoryNotes = [
  { id: 'responsible', text: 'Mr Jones is still responsible.', owner: 'pender' },
  { id: 'methodUnknown', text: 'The exact way the poison reached Mrs Jones is still unexplained.', owner: 'pender' },
  { id: 'clarkLying', text: 'Miss Clark may not be telling the truth.', owner: 'joyce' },
  { id: 'cornflourMisleading', text: 'The story about the cornflour may be misleading.', owner: 'joyce' },
  { id: 'jonesGuilty', text: 'Mr Jones may still be guilty.', owner: 'petherick' },
  { id: 'clarkProtecting', text: 'Miss Clark may be protecting him.', owner: 'petherick' },
  { id: 'daughterInvolved', text: 'The doctor’s daughter may be involved.', owner: 'raymond' },
  { id: 'notSupper', text: 'The poison may not have been in the supper at all.', owner: 'raymond' },
  { id: 'medicineTampered', text: 'Mrs Jones’s medicine may have been tampered with.', owner: 'raymond' }
];
const theoryNoteOrder = ['cornflourMisleading', 'responsible', 'daughterInvolved', 'clarkProtecting', 'methodUnknown', 'medicineTampered', 'clarkLying', 'notSupper', 'jonesGuilty'];
const theoryChallenges = [
  { id: 'pender', question: 'What is still missing from this theory?', options: ['A possible motive.', 'An explanation of how the arsenic reached Mrs Jones.', 'Proof that arsenic was found.'], correct: 1, weak: 'The theory identifies a suspect but does not explain the method.' },
  { id: 'joyce', question: 'What is the biggest problem with this theory?', options: ['There is no convincing evidence that Miss Clark killed Mrs Jones.', 'Miss Clark was not present that evening.', 'Miss Clark inherited £8,000.'], correct: 0, weak: 'Suspicion is not evidence that Miss Clark committed the murder.' },
  { id: 'petherick', question: 'Where does this theory become speculation?', options: ['There is no proof that Miss Clark agreed to protect Mr Jones.', 'Mr Jones had no access to arsenic.', 'Miss Clark never knew Mrs Jones.'], correct: 0, weak: 'The theory depends on a secret agreement that has not been proved.' },
  { id: 'raymond', question: 'What is missing from Raymond’s theory?', options: ['A possible way of administering poison.', 'Evidence connecting the doctor’s daughter with the poisoning.', 'Proof that Mrs Jones died.'], correct: 1, weak: 'The proposed method may be possible, but there is no evidence linking the doctor’s daughter to the crime.' }
];

function renderTheoryDocuments(showSummaries = false) {
  return theoryCharacters.map(character => {
    const assigned = theoryNotes.filter(note => theoryReconstruction[note.id] === character.id);
    const completed = theoryChallengesCompleted[character.id];
    return `<article class="theory-document ${completed ? 'challenged' : ''}" ${showSummaries ? '' : `data-theory-document="${character.id}" tabindex="0" role="button" aria-label="${character.name} theory document"`}>
      <span class="paper-clip" aria-hidden="true"></span><div class="theory-document-heading"><img src="${character.image}" alt="" aria-hidden="true"><h3 class="${character.id === 'joyce' ? 'portrait-only' : ''}">${character.name}</h3></div><p class="theory-notes-label">THEORY NOTES</p>
      ${showSummaries ? `<p class="theory-summary">${character.summary}</p>` : `<div class="assigned-theory-notes">${assigned.map(note => `<button type="button" class="discussion-note assigned ${theoryReconstructionCorrect[note.id] ? 'fixed' : ''} ${selectedTheoryNote === note.id ? 'selected' : ''}" draggable="${!theoryReconstructionCorrect[note.id]}" data-theory-note="${note.id}">${note.text}</button>`).join('') || '<span class="empty-theory-notes">Place discussion notes here</span>'}</div>`}
      ${completed ? '<div class="not-proven-stamp">NOT PROVEN</div>' : ''}
    </article>`;
  }).join('');
}

function renderTheoriesScene(message = '') {
  let content = '';
  if (!theoryReconstructionCompleted) {
    const assignedIds = new Set(Object.keys(theoryReconstruction));
    const freeNotes = theoryNoteOrder.map(id => theoryNotes.find(note => note.id === id)).filter(note => !assignedIds.has(note.id));
    const allAssigned = Object.keys(theoryReconstruction).length === theoryNotes.length;
    content = `<section class="theories-table reconstruct-theories"><header><span>PART 1</span><div><h3>RECONSTRUCT THE THEORIES</h3><p>The discussion became complicated. Use what you remember from the text to reconstruct each member’s theory.</p></div></header><div class="theory-documents">${renderTheoryDocuments(false)}</div><section class="discussion-bank"><div>${freeNotes.map(note => `<button type="button" class="discussion-note ${selectedTheoryNote === note.id ? 'selected' : ''}" draggable="true" data-theory-note="${note.id}">${note.text}</button>`).join('') || '<p>All notes have been placed.</p>'}</div></section><button class="theory-action" id="checkTheories" type="button" ${allAssigned ? '' : 'disabled'}>CHECK THE THEORIES</button></section>`;
  } else {
    content = `<section class="theories-table final-theories"><div class="theory-documents compact">${renderTheoryDocuments(true)}</div><div class="four-theories-stamp">FOUR THEORIES.<br>NO SOLUTION.</div>${theoriesFinalQuestionComplete ? '<div class="theories-ending"><h3>The club has run out of theories.</h3><p>But Miss Marple has noticed something.</p></div>' : `<article class="theories-final-question"><p class="theory-notes-label">FINAL QUESTION</p><h3>What do all four theories have in common?</h3><div class="challenge-options"><button type="button" data-theories-final="a"><span>A.</span>They all identify the same murderer.</button><button type="button" data-theories-final="b"><span>B.</span>They explain some of the facts, but each depends on something that has not been proved.</button><button type="button" data-theories-final="c"><span>C.</span>They prove that Mr Jones is innocent.</button></div></article>`}</section>`;
  }
  gameScreen.innerHTML = sceneShell(scenes[4], `${content}<p class="theories-message" id="theoriesMessage" aria-live="polite">${message}</p>`);
  bindTheoriesInteractions();
}

function bindTheoriesInteractions() {
  const selectNote = id => { if (theoryReconstructionCorrect[id]) return; selectedTheoryNote = selectedTheoryNote === id ? null : id; renderTheoriesScene(selectedTheoryNote ? 'Now choose a theory document.' : ''); };
  const assignNote = (characterId, noteId) => {
    if (!noteId || theoryReconstructionCorrect[noteId]) return;
    theoryReconstruction[noteId] = characterId; selectedTheoryNote = null; saveGame(); renderTheoriesScene();
  };
  document.querySelectorAll('[data-theory-note]').forEach(note => {
    note.addEventListener('click', event => { event.stopPropagation(); selectNote(note.dataset.theoryNote); });
    note.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); selectNote(note.dataset.theoryNote); } });
    note.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', note.dataset.theoryNote); event.dataTransfer.effectAllowed = 'move'; });
  });
  document.querySelectorAll('[data-theory-document]').forEach(doc => {
    const assign = () => assignNote(doc.dataset.theoryDocument, selectedTheoryNote);
    doc.addEventListener('click', assign);
    doc.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target === doc) { event.preventDefault(); assign(); } });
    doc.addEventListener('dragover', event => { event.preventDefault(); doc.classList.add('drag-over'); });
    doc.addEventListener('dragleave', () => doc.classList.remove('drag-over'));
    doc.addEventListener('drop', event => { event.preventDefault(); doc.classList.remove('drag-over'); assignNote(doc.dataset.theoryDocument, event.dataTransfer.getData('text/plain')); });
  });
  document.querySelector('#checkTheories')?.addEventListener('click', () => {
    let errors = 0;
    theoryNotes.forEach(note => { if (theoryReconstruction[note.id] === note.owner) theoryReconstructionCorrect[note.id] = true; else { delete theoryReconstruction[note.id]; errors += 1; } });
    if (!errors) {
      theoryReconstructionCompleted = true;
      theoryChallengeProgress = theoryChallenges.length;
      theoryChallenges.forEach(challenge => { theoryChallengesCompleted[challenge.id] = true; });
      activeTheoryChallenge = false;
    }
    saveGame(); renderTheoriesScene(errors ? 'Some details have ended up in the wrong theory. Think back to what each member actually suggested. Read the discussion again if you need to.' : 'The club’s theories have been reconstructed.');
  });
  document.querySelector('#examineTheory')?.addEventListener('click', () => { activeTheoryChallenge = true; renderTheoriesScene(); });
  document.querySelectorAll('[data-theory-objection]').forEach(button => button.addEventListener('click', () => {
    const challenge = theoryChallenges[theoryChallengeProgress];
    if (Number(button.dataset.theoryObjection) !== challenge.correct) { activeTheoryChallenge = true; renderTheoriesScene('That does not seriously weaken the theory. Look at what has actually been proved.'); return; }
    theoryChallengesCompleted[challenge.id] = true; theoryChallengeProgress += 1; activeTheoryChallenge = false; saveGame(); renderTheoriesScene(`WEAK POINT — ${challenge.weak} NOT PROVEN.`);
  }));
  document.querySelectorAll('[data-theories-final]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.theoriesFinal !== 'b') { renderTheoriesScene('Not quite. A possible explanation is not the same as a proved solution.'); return; }
    theoriesFinalQuestionComplete = true; theoriesCompleted = true; saveGame(); completeCurrentScene(); renderTheoriesScene('Exactly. A possible explanation is not the same as a proved solution.');
  }));
}

const clueHints = ['You might find them in a kitchen.', 'They are usually colourful.', 'They can be used to decorate a dessert.'];
const clueSupperItems = [
  { id: 'lobster', name: 'TINNED LOBSTER AND SALAD', image: 'images/clue-lobster-v2.png' },
  { id: 'trifle', name: 'TRIFLE', image: 'images/clue-trifle-v2.png' },
  { id: 'bread-cheese', name: 'BREAD AND CHEESE', image: 'images/clue-bread-cheese-v2.png' },
  { id: 'cornflour', name: 'CORNFLOUR', image: 'images/clue-cornflour-v2.png' }
];

function renderClueScene(message = '') {
  const letterExplained = mrJonesEvidenceStatus.letter === 'explained' || mrJonesNewEvidenceProgress >= 3;
  let task = `<section class="clue-letter-stage"><article class="clue-letter"><span class="clue-letter-label">THE LETTER</span>${letterExplained ? '<strong class="clue-explained-stamp">EXPLAINED</strong>' : ''}<p class="clue-letter-copy">“… <mark>hundreds and thousands</mark> …”</p><div class="clue-magnifier" aria-hidden="true"></div></article><div class="clue-reminder"><p>These words appeared earlier in Mr Jones’s letter.</p><p>The letter itself had an innocent explanation.</p><strong>Then Miss Marple asks a different question.</strong></div></section>`;
  if (!clueMeaningSolved) {
    task += `<section class="clue-question-card"><p class="clue-section-label">MISS MARPLE’S QUESTION</p><h3>You have seen these words before.</h3><p>But could “hundreds and thousands” mean something else?</p><h4>What else can “hundreds and thousands” mean in British English?</h4><div class="clue-options"><button type="button" data-clue-meaning="a"><span>A.</span>A very large amount of money</button><button type="button" data-clue-meaning="b"><span>B.</span>A group of important people</button><button type="button" data-clue-meaning="c"><span>C.</span>Small coloured sugar decorations used on cakes and desserts</button><button type="button" data-clue-meaning="d"><span>D.</span>Several separate pieces of evidence</button></div><button class="clue-hint-button" id="clueHintButton" type="button" ${clueHintsOpened >= 3 ? 'disabled' : ''}>NEED A HINT?</button>${clueHintsOpened ? `<p class="clue-hint"><span>HINT ${clueHintsOpened}</span>${clueHints[clueHintsOpened - 1]}</p>` : ''}</section>`;
  } else if (!clueSupperConnectionSolved) {
    task += `<article class="clue-definition"><span>HUNDREDS AND THOUSANDS</span><strong>small coloured sugar decorations</strong><p>Miss Marple’s question has changed the meaning of an old clue.</p></article><section class="clue-look-back"><p class="clue-section-label">LOOK BACK</p><h3>You saw the supper earlier in the investigation.</h3><p>Which detail becomes important now?</p><div class="clue-supper-grid">${clueSupperItems.map(item => `<button type="button" class="clue-supper-card ${clueSupperConnection === item.id ? 'selected' : ''} ${item.id === 'cornflour' ? 'cornflour' : ''}" data-clue-supper="${item.id}" aria-label="${item.name}">${item.image ? `<img src="${item.image}" alt="${item.name}">` : '<span class="cornflour-packet" aria-hidden="true">CORN<br>FLOUR</span>'}</button>`).join('')}</div></section>`;
  } else if (!clueInferenceSolved) {
    task += `<section class="clue-connection"><article class="clue-definition compact"><span>HUNDREDS AND THOUSANDS</span><strong>small coloured sugar decorations</strong></article><div class="clue-link-line"><span>noticed on</span></div><article class="clue-trifle-card"><img src="images/clue-trifle-v2.png" alt="Trifle"><strong>TRIFLE</strong></article></section><section class="clue-question-card inference"><p class="clue-section-label">MAKE THE CONNECTION</p><h3>If “hundreds and thousands” were used on the trifle, what new possibility should be considered?</h3><div class="clue-options"><button type="button" data-clue-inference="a"><span>A.</span>The arsenic may have been added to something on the dessert rather than to the whole supper.</button><button type="button" data-clue-inference="b"><span>B.</span>The lobster must have contained the arsenic.</button><button type="button" data-clue-inference="c"><span>C.</span>The cornflour must have poisoned everyone at the table.</button><button type="button" data-clue-inference="d"><span>D.</span>The letter itself was poisoned.</button></div></section>`;
  } else {
    task += `<section class="clue-finale"><p class="clue-section-label">THE OVERLOOKED CLUE</p><div class="clue-final-pair"><article><span>HUNDREDS AND THOUSANDS</span><small>small coloured sugar decorations</small></article><b aria-hidden="true">+</b><article><img src="images/clue-trifle-v2.png" alt=""><span>TRIFLE</span></article></div><div class="clue-possibility-stamp">A NEW METHOD IS POSSIBLE.</div><p>The poison did not necessarily have to be in the whole meal.</p><blockquote>A harmless phrase from a letter and an ordinary dessert now point to the same possibility.</blockquote><h3>Miss Marple has found the detail everyone else overlooked.</h3></section>`;
  }
  gameScreen.innerHTML = sceneShell(scenes[5], `<div class="clue-desk">${task}<p class="clue-message" id="clueMessage" aria-live="polite">${message}</p></div>`);
  bindClueInteractions();
}

function bindClueInteractions() {
  document.querySelector('#clueHintButton')?.addEventListener('click', () => { clueHintsOpened = Math.min(3, clueHintsOpened + 1); saveGame(); renderClueScene(); });
  document.querySelectorAll('[data-clue-meaning]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.clueMeaning !== 'c') { renderClueScene('That meaning does not fit Miss Marple’s idea. Try thinking of another use of the expression.'); return; }
    clueMeaningSolved = true; saveGame(); renderClueScene('Miss Marple’s question has changed the meaning of an old clue.');
  }));
  document.querySelectorAll('[data-clue-supper]').forEach(button => button.addEventListener('click', () => {
    clueSupperConnection = button.dataset.clueSupper;
    if (clueSupperConnection !== 'trifle') { saveGame(); renderClueScene('That detail does not naturally connect with the new meaning of “hundreds and thousands”. Look again.'); return; }
    clueSupperConnectionSolved = true; saveGame(); renderClueScene('The words and the dessert now point towards the same detail.');
  }));
  document.querySelectorAll('[data-clue-inference]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.clueInference !== 'a') { renderClueScene('That does not follow from the two clues you have connected. Look at the dessert again.'); return; }
    clueInferenceSolved = true;
    clueCompleted = true;
    saveGame();
    completeCurrentScene();
    renderClueScene('A new method is possible.');
    window.setTimeout(goToNextScene, 650);
  }));
}

const crimeEvents = [
  { id: 'poison', text: 'Mr Jones poisoned the hundreds and thousands.' },
  { id: 'gladys', text: 'Gladys put the poisoned decorations on the trifle.' },
  { id: 'remove', text: 'Mr Jones removed the decorations from his own portion.' },
  { id: 'banting', text: 'Miss Clark did not eat the trifle because she was banting.' },
  { id: 'eats', text: 'Mrs Jones ate the poisoned trifle.' }
];
const shuffledCrimeEventIds = ['remove', 'eats', 'poison', 'banting', 'gladys'];
const selectiveStatements = [
  { id: 'mrsJones', text: 'Ate the trifle with the poisoned decorations.' },
  { id: 'mrJones', text: 'Removed the decorations from his own portion.' },
  { id: 'missClark', text: 'Did not eat the trifle because she was banting.' }
];
const finalSolutionOptions = {
  murderer: ['Mr Jones', 'Miss Clark', 'Gladys Linch', 'the doctor’s daughter'],
  accomplice: ['No one', 'Miss Clark', 'Gladys Linch', 'the doctor’s daughter'],
  method: ['poisoned cornflour', 'poisoned medicine', 'poisoned hundreds and thousands on the trifle', 'poisoned tinned lobster'],
  motive: ['inheritance', 'revenge', 'jealousy', 'accidental poisoning']
};

function renderVerdictScene(message = '') {
  let content = '';
  if (!crimeSequenceSolved) {
    const remaining = shuffledCrimeEventIds.filter(id => !crimeSequence.includes(id)).map(id => crimeEvents.find(event => event.id === id));
    content = `<section class="crime-part sequence-part"><header><span>PART 1</span><div><h3>HOW WAS IT DONE?</h3><p>Select the events in the order in which the murder plan worked.</p></div></header><div class="crime-event-bank">${remaining.map(event => `<button type="button" data-crime-event="${event.id}">${event.text}</button>`).join('') || '<p>All events have been placed.</p>'}</div><ol class="crime-sequence">${[0,1,2,3,4].map(index => `<li>${crimeSequence[index] ? `<button type="button" data-sequence-index="${index}">${crimeEvents.find(event => event.id === crimeSequence[index]).text}</button>` : '<span>Choose the next event</span>'}</li>`).join('')}</ol><button class="crime-action" id="checkCrimeSequence" type="button" ${crimeSequence.length === 5 ? '' : 'disabled'}>CHECK THE SEQUENCE</button></section>`;
  } else if (selectiveStatementIndex < selectiveStatements.length) {
    const statement = selectiveStatements[selectiveStatementIndex];
    content = `<section class="crime-part selective-part"><header><span>PART 2</span><div><h3>WHY ONLY MRS JONES?</h3><p>The poison was connected with the trifle. But three people had been at supper. Why was Mrs Jones the only one to receive the fatal dose?</p></div></header><div class="selective-place-cards">${[['mrsJones','MRS JONES'],['mrJones','MR JONES'],['missClark','MISS CLARK']].map(([id,name]) => `<button type="button" data-selective-person="${id}"><span>${name}</span>${selectivePoisoningSolved[id] ? `<small>${selectiveStatements.find(item => item.id === id).text}</small>` : '<small>Place card</small>'}</button>`).join('')}</div><article class="selective-statement"><span>STATEMENT ${selectiveStatementIndex + 1} OF 3</span><p>${statement.text}</p>${statement.id === 'missClark' ? '<button class="banting-note-button" id="bantingNoteButton" type="button">BANTING?</button>' : ''}${bantingNoteOpen ? '<aside class="banting-note"><strong>BANTING</strong><p>an old-fashioned word for dieting / trying to lose weight</p></aside>' : ''}</article></section>`;
  } else if (!gladysMotiveSolved) {
    content = `<section class="crime-part gladys-part"><header><span>PART 3</span><div><h3>ONE PERSON IS STILL MISSING FROM THE PLAN</h3></div></header><article class="gladys-file"><img src="images/gladys-linch.png" alt="Gladys Linch"><div><p class="crime-label">GLADYS LINCH</p><h3>Why did Gladys help Mr Jones?</h3><div class="crime-options"><button type="button" data-gladys-motive="a"><span>A.</span>He promised to pay her a large amount of money.</button><button type="button" data-gladys-motive="b"><span>B.</span>She believed he would marry her after Mrs Jones’s death.</button><button type="button" data-gladys-motive="c"><span>C.</span>She wanted revenge on Miss Clark.</button><button type="button" data-gladys-motive="d"><span>D.</span>She did not know that the decorations were poisoned.</button></div></div></article></section>`;
  } else if (!finalCaseSolved) {
    const complete = Object.values(finalCaseSolution).every(Boolean);
    content = `<section class="crime-part solution-part"><header><span>PART 4</span><div><h3>SOLVE THE CASE</h3><p>Complete the official solution.</p></div></header><article class="official-solution"><div class="solution-file-head"><span>ST. MARY MEAD · OFFICIAL CASE REPORT</span><b>01 / 1932</b></div>${Object.entries(finalSolutionOptions).map(([field,options]) => `<section class="solution-row"><strong>${field.toUpperCase()}:</strong><div class="paper-choice-list">${options.map(option => `<button type="button" class="${finalCaseSolution[field] === option ? 'selected' : ''}" data-solution-field="${field}" data-solution-value="${option}">${option}</button>`).join('')}</div></section>`).join('')}<button class="crime-action" id="checkFinalSolution" type="button" ${complete ? '' : 'disabled'}>CHECK THE SOLUTION</button></article></section>`;
  } else {
    content = `<section class="case-solved-finale">
      <div class="solved-file-heading"><span>CASE FILE № 01</span><div class="case-solved-stamp">CASE<br>SOLVED</div><span>ST. MARY MEAD · 1932</span></div>
      <p class="solved-eyebrow">THE TUESDAY NIGHT CLUB · FINAL REPORT</p>
      <h3>Mr Jones murdered his wife.</h3>
      <div class="solved-ornament" aria-hidden="true"><span></span><b>◆</b><span></span></div>
      <p class="solved-summary">He poisoned the hundreds and thousands used on the trifle. Gladys helped him because she believed he would marry her after Mrs Jones’s death. Mr Jones removed the poisoned decorations from his own portion, while Miss Clark did not eat the trifle because she was banting. Mrs Jones ate the poisoned portion and died.</p>
      <div class="method-confirmed"><article><small>THE POISON</small><span>HUNDREDS AND THOUSANDS</span></article><b>+</b><article><small>THE DISH</small><span>TRIFLE</span></article><strong>METHOD CONFIRMED</strong></div>
      <blockquote>“Miss Marple had noticed the detail everyone else overlooked.”</blockquote>
      <aside class="final-achievement" aria-label="Achievement unlocked: A Seat at the Table"><img src="../../assets/achievements/tuesday-night-club.png" alt="A Seat at the Table achievement"><div><span>ACHIEVEMENT UNLOCKED</span><strong>A Seat at the Table</strong><p>Case No. 01 complete</p></div></aside>
      <a class="return-to-archive" href="../../index.html#games">RETURN TO THE ARCHIVE →</a>
    </section>`;
  }
  gameScreen.innerHTML = sceneShell(scenes[6], `<div class="crime-desk">${content}<p class="crime-message" id="crimeMessage" aria-live="polite">${message}</p></div>`);
  bindVerdictInteractions();
}

function bindVerdictInteractions() {
  document.querySelectorAll('[data-crime-event]').forEach(button => button.addEventListener('click', () => { crimeSequence.push(button.dataset.crimeEvent); saveGame(); renderVerdictScene(); }));
  document.querySelectorAll('[data-sequence-index]').forEach(button => button.addEventListener('click', () => { crimeSequence.splice(Number(button.dataset.sequenceIndex), 1); saveGame(); renderVerdictScene(); }));
  document.querySelector('#checkCrimeSequence')?.addEventListener('click', () => {
    if (crimeSequence.join('|') !== crimeEvents.map(event => event.id).join('|')) { renderVerdictScene('Something in the sequence does not fit. Think about how the poison could reach Mrs Jones without killing everyone else.'); return; }
    crimeSequenceSolved = true; saveGame(); renderVerdictScene('METHOD RECONSTRUCTED');
  });
  document.querySelectorAll('[data-selective-person]').forEach(button => button.addEventListener('click', () => {
    const statement = selectiveStatements[selectiveStatementIndex];
    if (button.dataset.selectivePerson !== statement.id) { renderVerdictScene('That does not explain what happened to this person.'); return; }
    selectivePoisoningSolved[statement.id] = true; selectiveStatementIndex += 1; saveGame(); renderVerdictScene(selectiveStatementIndex === 3 ? 'THE SELECTIVE POISONING NOW MAKES SENSE.' : 'Correct. Now place the next statement.');
  }));
  document.querySelector('#bantingNoteButton')?.addEventListener('click', () => { bantingNoteOpen = !bantingNoteOpen; saveGame(); renderVerdictScene(); });
  document.querySelectorAll('[data-gladys-motive]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.gladysMotive !== 'b') { renderVerdictScene('That does not match Gladys’s reason for helping Mr Jones.'); return; }
    gladysMotiveSolved = true; saveGame(); renderVerdictScene('GLADYS LINCH — ACCOMPLICE. Gladys helped Mr Jones because she believed he would marry her after his wife’s death.');
  }));
  document.querySelectorAll('[data-solution-field]').forEach(button => button.addEventListener('click', () => { finalCaseSolution[button.dataset.solutionField] = button.dataset.solutionValue; saveGame(); renderVerdictScene(); }));
  document.querySelector('#checkFinalSolution')?.addEventListener('click', () => {
    const correct = finalCaseSolution.murderer === 'Mr Jones' && finalCaseSolution.accomplice === 'Gladys Linch' && finalCaseSolution.method === 'poisoned hundreds and thousands on the trifle' && finalCaseSolution.motive === 'inheritance';
    if (!correct) { renderVerdictScene('The case is not complete yet. Some parts of the solution do not match the evidence.'); return; }
    finalCaseSolved = true;
    saveGame();
    completeCurrentScene();
    renderVerdictScene();
    window.setTimeout(unlockSolvedCaseAchievement, 700);
  });
}

const allScenes = [
  {
    id: 'club', name: 'THE CLUB', title: 'Meet the Tuesday Night Club',
    description: 'Match each description with the correct guest.',
    render() {
      renderClubScene();
    }
  },
  {
    id: 'debate', name: 'THE DEBATE', title: 'What Makes a Good Detective?',
    description: 'The members of the club disagree about what matters most in an investigation. Record each person’s view.',
    render() {
      renderDebateScene();
    }
  },
  {
    id: 'case', name: 'THE CASE', title: 'The Case of Mrs Jones',
    description: 'Sir Henry has opened the first case of the Tuesday Night Club. Reconstruct what happened that evening.',
    render() { renderCaseScene(); }
  },
  {
    id: 'evidence', name: 'THE EVIDENCE', title: 'Улики на столе',
    description: 'Следствие собрало четыре предмета. Осмотрите каждый — важная деталь может казаться совершенно будничной.',
    render() {
      const items = [
        ['⚕', 'Порошок', 'Обычное средство от несварения в бумажном пакете.'],
        ['✉', 'Письмо', 'Муж собирался получить наследство после смерти супруги.'],
        ['♨', 'Ужин', 'Все блюда подавались из общих тарелок.'],
        ['⌁', 'Мышьяк', 'Яд можно было получить, вымачивая бумагу от мух.']
      ];
      gameScreen.innerHTML = sceneShell(this, `<div class="evidence-grid">${items.map((item, index) => `<button class="evidence-card" data-evidence="${index}"><span class="icon">${item[0]}</span><strong>${item[1]}</strong><p>${item[2]}</p></button>`).join('')}</div><p class="feedback" id="evidenceFeedback">Изучено: 0 из 4</p>`);
      const inspected = new Set();
      document.querySelectorAll('[data-evidence]').forEach(button => button.addEventListener('click', () => {
        inspected.add(button.dataset.evidence); button.classList.add('inspected'); button.disabled = true;
        document.querySelector('#evidenceFeedback').textContent = `Изучено: ${inspected.size} из 4`;
        if (inspected.size === 4) completeCurrentScene();
      }));
    }
  },
  {
    id: 'theories', name: 'THE THEORIES', title: 'Три версии',
    description: 'Клуб выдвигает версии. Какая из них объясняет, почему от общей еды смертельно пострадала только миссис Джонс?',
    render() {
      gameScreen.innerHTML = sceneShell(this, `<div class="choice-grid">
        <button class="choice-card" data-theory="food"><strong>Испорченный ужин</strong>Яд случайно оказался в общем блюде.</button>
        <button class="choice-card" data-theory="medicine"><strong>Подмена лекарства</strong>Яд был в личном порошке миссис Джонс.</button>
        <button class="choice-card" data-theory="doctor"><strong>Ошибка доктора</strong>Причина смерти определена неверно.</button>
      </div><p class="feedback" id="theoryFeedback">Выберите наиболее полную версию.</p>`);
      document.querySelectorAll('[data-theory]').forEach(button => button.addEventListener('click', () => {
        document.querySelectorAll('[data-theory]').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
        if (button.dataset.theory === 'medicine') {
          document.querySelector('#theoryFeedback').textContent = 'Версия объясняет избирательность отравления. Но кто подменил порошок?';
          completeCurrentScene();
        } else {
          document.querySelector('#theoryFeedback').textContent = 'Эта версия противоречит хотя бы одной из известных улик.';
        }
      }));
    }
  },
  {
    id: 'clue', name: 'THE CLUE', title: 'Незаметное противоречие',
    description: 'Сравните запись врача и хозяйственную книгу. Нажмите на фрагмент, который связывает дом с источником мышьяка.',
    render() {
      gameScreen.innerHTML = sceneShell(this, `<div class="comparison">
        <article class="document"><p class="scene-kicker">Запись врача</p><h3>Назначение</h3><p>Белый порошок принимать после еды. Хранить сухим. Оригинальная упаковка не найдена.</p></article>
        <article class="document"><p class="scene-kicker">Счёт по хозяйству</p><h3>Покупки</h3><p>Чай, свечи, крахмал, <mark id="decisiveClue" tabindex="0">две упаковки липкой бумаги от мух</mark>, соль.</p></article>
      </div><p class="feedback" id="clueFeedback">Найдите решающую строку.</p>`);
      const reveal = () => {
        const clue = document.querySelector('#decisiveClue'); clue.classList.add('found');
        document.querySelector('#clueFeedback').textContent = 'Бумагу от мух вымачивали, чтобы получить мышьяк, а затем подменили личный порошок.';
        completeCurrentScene();
      };
      document.querySelector('#decisiveClue').addEventListener('click', reveal);
      document.querySelector('#decisiveClue').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') reveal(); });
    }
  },
  {
    id: 'verdict', name: 'THE VERDICT', title: 'Ваш вердикт',
    description: 'Назовите виновника, способ и мотив. Все три части должны образовать одну непротиворечивую версию.',
    render() {
      gameScreen.innerHTML = sceneShell(this, `<div class="paper-panel"><div class="verdict-form">
        <label>Кто?<select id="culprit"><option value="">Выберите</option><option value="husband">Мистер Джонс</option><option value="maid">Горничная</option><option value="doctor">Доктор</option></select></label>
        <label>Как?<select id="method"><option value="">Выберите</option><option value="food">Общее блюдо</option><option value="powder">Подменённый порошок</option><option value="medicine">Инъекция</option></select></label>
        <label>Зачем?<select id="motive"><option value="">Выберите</option><option value="revenge">Месть</option><option value="inheritance">Наследство</option><option value="mistake">Случайность</option></select></label>
      </div><div class="verdict-actions"><button class="action-button" id="submitVerdict">Огласить вердикт</button><p class="feedback" id="verdictFeedback"></p></div></div>`);
      document.querySelector('#submitVerdict').addEventListener('click', () => {
        const correct = document.querySelector('#culprit').value === 'husband' && document.querySelector('#method').value === 'powder' && document.querySelector('#motive').value === 'inheritance';
        if (!correct) {
          document.querySelector('#verdictFeedback').textContent = 'Версия не объясняет все улики. Вернитесь к способу и мотиву.';
          return;
        }
        gameScreen.querySelector('.paper-panel').innerHTML = `<div class="success"><div class="seal">CASE<br>CLOSED</div><h3>Дело раскрыто</h3><p>Мистер Джонс организовал подмену личного порошка жены мышьяком, добытым из бумаги от мух. Его целью было наследство.</p><a class="action-button" href="../../index.html#games">Вернуться в архив</a></div>`;
        completeCurrentScene();
      });
    }
  }
];

const scenes = allScenes;
const mrJonesEvidenceScene = scenes.find(scene => scene.id === 'evidence');
mrJonesEvidenceScene.title = 'The Case Against Mr Jones';
mrJonesEvidenceScene.description = 'The evidence seems to point in one direction. Examine the case before you decide how convincing it really is.';
mrJonesEvidenceScene.render = function renderEvidence() { renderMrJonesEvidenceScene(); };
const reconstructedTheoriesScene = scenes.find(scene => scene.id === 'theories');
reconstructedTheoriesScene.title = 'The Club’s Theories';
reconstructedTheoriesScene.description = 'Everyone at the table has an explanation. Can you reconstruct their theories from what you have read?';
reconstructedTheoriesScene.render = function renderTheories() { renderTheoriesScene(); };
const overlookedClueScene = scenes.find(scene => scene.id === 'clue');
overlookedClueScene.title = 'The Overlooked Words';
overlookedClueScene.description = 'The others have examined motives, suspects and methods. Miss Marple is interested in something much smaller.';
overlookedClueScene.render = function renderClue() { renderClueScene(); };
const reconstructedCrimeScene = scenes.find(scene => scene.id === 'verdict');
reconstructedCrimeScene.title = 'Reconstruct the Crime';
reconstructedCrimeScene.description = 'The final pieces are in place. Reconstruct exactly how Mrs Jones was murdered.';
reconstructedCrimeScene.render = function renderVerdict() { renderVerdictScene(); };

function renderCurrentScene() {
  sceneComplete = completedScenes.has(currentScene);
  scenes[currentScene].render();
  updateProgress();
  gameScreen.focus({ preventScroll: true });
}

function completeCurrentScene() {
  if (sceneComplete) return;
  sceneComplete = true;
  completedScenes.add(currentScene);
  if (replayingScene === currentScene) replayingScene = null;
  maxUnlockedScene = Math.max(maxUnlockedScene, Math.min(currentScene + 1, scenes.length - 1));
  saveGame();
  updateProgress();
  showToast(currentScene === scenes.length - 1 ? 'Расследование завершено' : 'Этап пройден — можно продолжить');
}

function goToNextScene() {
  if (!sceneComplete || currentScene >= scenes.length - 1) return;
  currentScene += 1;
  saveGame(); renderCurrentScene(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToPreviousScene() {
  if (currentScene === 0) return;
  currentScene -= 1;
  saveGame(); renderCurrentScene(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetCurrentScene() {
  completedScenes.delete(currentScene);
  sceneComplete = false;
  replayingScene = currentScene;

  if (currentScene === 0) {
    clubState = { assignments: {}, correct: [], seated: false };
    selectedDescription = null;
  } else if (currentScene === 1) {
    debateProgress = { currentIndex: 0, recorded: [], part1Complete: false, part2Started: false };
    gameState.detectiveApproach = null;
    debateCompleted = false;
  } else if (currentScene === 2) {
    caseDinnerGuests = [null, null, null];
    caseDinnerGuestsComplete = false;
    caseDishesExamined = { lobster: false, trifle: false, breadCheese: false };
    caseDishesReviewed = false;
    caseOutcomes = { mrJones: 'unknown', mrsJones: 'unknown', missClark: 'unknown' };
    caseOutcomesComplete = false;
    medicalReportOpened = false;
    autopsyReportOpened = false;
    caseConfirmedAsMurder = false;
    openSeatMenu = null;
    activeDishNote = null;
    caseDishWords = { lobster: [], trifle: [], breadCheese: [] };
  } else if (currentScene === 3) {
    mrJonesEvidenceOpened = { inheritance: false, poisonAccess: false, otherWoman: false, cornflour: false, letter: false };
    mrJonesFirstAssessment = null; mrJonesAssessmentDraft = null; mrJonesNewEvidenceProgress = 0;
    mrJonesEvidenceStatus = { inheritance: 'still-relevant', poisonAccess: 'still-relevant', otherWoman: null, cornflour: null, letter: null };
    mrJonesRevisedAssessment = null; mrJonesRevisedDraft = null; mrJonesLogicQuestionComplete = false; mrJonesSceneCompleted = false;
  } else if (currentScene === 4) {
    theoryReconstruction = {}; theoryReconstructionCorrect = {}; theoryReconstructionCompleted = false; theoryChallengeProgress = 0;
    theoryChallengesCompleted = { pender: false, joyce: false, petherick: false, raymond: false };
    theoriesFinalQuestionComplete = false; theoriesCompleted = false; selectedTheoryNote = null; activeTheoryChallenge = false;
  } else if (currentScene === 5) {
    clueMeaningSolved = false; clueHintsOpened = 0; clueSupperConnection = null;
    clueSupperConnectionSolved = false; clueInferenceSolved = false; clueCompleted = false;
  } else if (currentScene === 6) {
    crimeSequence = []; crimeSequenceSolved = false;
    selectivePoisoningSolved = { mrsJones: false, mrJones: false, missClark: false }; selectiveStatementIndex = 0; bantingNoteOpen = false;
    gladysMotiveSolved = false; finalCaseSolution = { murderer: null, accomplice: null, method: null, motive: null }; finalCaseSolved = false;
  }

  saveGame();
  renderCurrentScene();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Этап ${currentScene + 1} начат заново`);
}

function updateProgress() {
  stageNav.innerHTML = scenes.map((scene, index) => {
    const classes = ['stage-step'];
    if (index <= maxUnlockedScene) classes.push('unlocked');
    if (completedScenes.has(index)) classes.push('completed');
    if (index === currentScene) classes.push('current');
    return `<button class="${classes.join(' ')}" data-scene-index="${index}" data-number="0${index + 1}" ${index > maxUnlockedScene ? 'disabled' : ''}>${scene.name}</button>`;
  }).join('');
  stageNav.querySelectorAll('.unlocked').forEach(button => button.addEventListener('click', () => {
    currentScene = Number(button.dataset.sceneIndex); saveGame(); renderCurrentScene();
  }));
  previousButton.disabled = currentScene === 0;
  continueButton.disabled = !sceneComplete || currentScene === scenes.length - 1;
  continueButton.textContent = currentScene === scenes.length - 1 ? 'Дело завершено ✓' : 'Продолжить →';
  progressText.textContent = `Этап ${currentScene + 1} из ${scenes.length}`;
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentScene, maxUnlockedScene, completedScenes: [...completedScenes], clubState, debateProgress, detectiveApproach: gameState.detectiveApproach, debateCompleted,
    caseDinnerGuests, caseDinnerGuestsComplete, caseDishesExamined, caseDishesReviewed, caseOutcomes, caseOutcomesComplete,
    medicalReportOpened, autopsyReportOpened, caseConfirmedAsMurder, activeDishNote, caseDishWords, replayingScene,
    mrJonesEvidenceOpened, mrJonesFirstAssessment, mrJonesNewEvidenceProgress, mrJonesEvidenceStatus,
    mrJonesRevisedAssessment, mrJonesLogicQuestionComplete, mrJonesSceneCompleted,
    theoryReconstruction, theoryReconstructionCorrect, theoryReconstructionCompleted, theoryChallengeProgress,
    theoryChallengesCompleted, theoriesFinalQuestionComplete, theoriesCompleted,
    clueMeaningSolved, clueHintsOpened, clueSupperConnection, clueSupperConnectionSolved, clueInferenceSolved, clueCompleted,
    crimeSequence, crimeSequenceSolved, selectivePoisoningSolved, selectiveStatementIndex, bantingNoteOpen,
    gladysMotiveSolved, finalCaseSolution, finalCaseSolved
  }));
}

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    currentScene = Math.min(Math.max(Number(saved.currentScene) || 0, 0), scenes.length - 1);
    maxUnlockedScene = Math.min(Math.max(Number(saved.maxUnlockedScene) || 0, 0), scenes.length - 1);
    completedScenes = new Set((saved.completedScenes || []).filter(index => Number.isInteger(index) && index >= 0 && index < scenes.length));
    replayingScene = Number.isInteger(saved.replayingScene) && saved.replayingScene >= 0 && saved.replayingScene < scenes.length ? saved.replayingScene : null;
    if (saved.clubState) {
      clubState = {
        assignments: saved.clubState.assignments || {},
        correct: Array.isArray(saved.clubState.correct) ? saved.clubState.correct : [],
        seated: saved.clubState.seated === true
      };
    } else {
      completedScenes.delete(0);
      currentScene = 0;
      maxUnlockedScene = 0;
    }
    if (!clubState.seated && replayingScene !== 0) {
      completedScenes.delete(0);
      currentScene = 0;
      maxUnlockedScene = 0;
    }
    if (saved.debateProgress) {
      debateProgress = {
        currentIndex: Math.min(Math.max(Number(saved.debateProgress.currentIndex) || 0, 0), debateEntries.length - 1),
        recorded: Array.isArray(saved.debateProgress.recorded) ? saved.debateProgress.recorded.filter(id => debateEntries.some(entry => entry.id === id)) : [],
        part1Complete: saved.debateProgress.part1Complete === true,
        part2Started: saved.debateProgress.part2Started === true
      };
    }
    gameState.detectiveApproach = detectiveMethods.some(method => method.id === saved.detectiveApproach) ? saved.detectiveApproach : null;
    debateCompleted = saved.debateCompleted === true;
    caseDinnerGuests = Array.isArray(saved.caseDinnerGuests) && saved.caseDinnerGuests.length === 3 ? saved.caseDinnerGuests : [null, null, null];
    caseDinnerGuestsComplete = saved.caseDinnerGuestsComplete === true;
    caseDishesExamined = { lobster: false, trifle: false, breadCheese: false, ...(saved.caseDishesExamined || {}) };
    caseDishesReviewed = saved.caseDishesReviewed === true;
    caseOutcomes = { mrJones: 'unknown', mrsJones: 'unknown', missClark: 'unknown', ...(saved.caseOutcomes || {}) };
    caseOutcomesComplete = saved.caseOutcomesComplete === true;
    medicalReportOpened = saved.medicalReportOpened === true;
    autopsyReportOpened = saved.autopsyReportOpened === true;
    caseConfirmedAsMurder = saved.caseConfirmedAsMurder === true;
    activeDishNote = dinnerDishes.some(dish => dish.id === saved.activeDishNote) ? saved.activeDishNote : null;
    caseDishWords = { lobster: [], trifle: [], breadCheese: [], ...(saved.caseDishWords || {}) };
    const assessmentIds = assessmentOptions.map(option => option.id);
    if (saved.mrJonesEvidenceOpened) {
      mrJonesEvidenceOpened = { inheritance: false, poisonAccess: false, otherWoman: false, cornflour: false, letter: false, ...saved.mrJonesEvidenceOpened };
      mrJonesFirstAssessment = assessmentIds.includes(saved.mrJonesFirstAssessment) ? saved.mrJonesFirstAssessment : null;
      mrJonesNewEvidenceProgress = Math.min(Math.max(Number(saved.mrJonesNewEvidenceProgress) || 0, 0), 3);
      mrJonesEvidenceStatus = { inheritance: 'still-relevant', poisonAccess: 'still-relevant', otherWoman: null, cornflour: null, letter: null, ...(saved.mrJonesEvidenceStatus || {}) };
      mrJonesRevisedAssessment = assessmentIds.includes(saved.mrJonesRevisedAssessment) ? saved.mrJonesRevisedAssessment : null;
      mrJonesLogicQuestionComplete = saved.mrJonesLogicQuestionComplete === true;
      mrJonesSceneCompleted = saved.mrJonesSceneCompleted === true;
    } else {
      completedScenes.forEach(index => { if (index >= 3) completedScenes.delete(index); });
      currentScene = Math.min(currentScene, 3); maxUnlockedScene = Math.min(maxUnlockedScene, 3);
    }
    if (saved.theoryReconstruction) {
      theoryReconstruction = Object.fromEntries(Object.entries(saved.theoryReconstruction).filter(([noteId, characterId]) => theoryNotes.some(note => note.id === noteId) && theoryCharacters.some(character => character.id === characterId)));
      theoryReconstructionCorrect = Object.fromEntries(Object.entries(saved.theoryReconstructionCorrect || {}).filter(([noteId, correct]) => theoryNotes.some(note => note.id === noteId) && correct === true));
      theoryReconstructionCompleted = saved.theoryReconstructionCompleted === true;
      theoryChallengeProgress = Math.min(Math.max(Number(saved.theoryChallengeProgress) || 0, 0), 4);
      theoryChallengesCompleted = { pender: false, joyce: false, petherick: false, raymond: false, ...(saved.theoryChallengesCompleted || {}) };
      theoriesFinalQuestionComplete = saved.theoriesFinalQuestionComplete === true;
      theoriesCompleted = saved.theoriesCompleted === true;
    } else {
      completedScenes.forEach(index => { if (index >= 4) completedScenes.delete(index); });
      currentScene = Math.min(currentScene, 4); maxUnlockedScene = Math.min(maxUnlockedScene, 4);
    }
    if (Object.prototype.hasOwnProperty.call(saved, 'clueMeaningSolved')) {
      clueMeaningSolved = saved.clueMeaningSolved === true;
      clueHintsOpened = Math.min(Math.max(Number(saved.clueHintsOpened) || 0, 0), 3);
      clueSupperConnection = clueSupperItems.some(item => item.id === saved.clueSupperConnection) ? saved.clueSupperConnection : null;
      clueSupperConnectionSolved = saved.clueSupperConnectionSolved === true;
      clueInferenceSolved = saved.clueInferenceSolved === true;
      clueCompleted = saved.clueCompleted === true;
    } else {
      completedScenes.delete(5); currentScene = Math.min(currentScene, 5); maxUnlockedScene = Math.min(maxUnlockedScene, 5);
    }
    if (Array.isArray(saved.crimeSequence)) {
      crimeSequence = saved.crimeSequence.filter((id, index, list) => crimeEvents.some(event => event.id === id) && list.indexOf(id) === index).slice(0, 5);
      crimeSequenceSolved = saved.crimeSequenceSolved === true;
      selectivePoisoningSolved = { mrsJones: false, mrJones: false, missClark: false, ...(saved.selectivePoisoningSolved || {}) };
      selectiveStatementIndex = Math.min(Math.max(Number(saved.selectiveStatementIndex) || 0, 0), 3);
      bantingNoteOpen = saved.bantingNoteOpen === true;
      gladysMotiveSolved = saved.gladysMotiveSolved === true;
      finalCaseSolution = { murderer: null, accomplice: null, method: null, motive: null, ...(saved.finalCaseSolution || {}) };
      finalCaseSolved = saved.finalCaseSolved === true;
    } else {
      completedScenes.delete(6);
    }
    if (debateProgress.recorded.length === debateEntries.length) debateProgress.part1Complete = true;
    if (debateCompleted) {
      completedScenes.add(1);
      maxUnlockedScene = Math.max(maxUnlockedScene, 2);
    } else if (clubState.seated && replayingScene !== 1) {
      completedScenes.delete(1);
      currentScene = Math.min(currentScene, 1);
      maxUnlockedScene = Math.min(maxUnlockedScene, 1);
    }
    if (caseConfirmedAsMurder) {
      completedScenes.add(2);
      maxUnlockedScene = Math.max(maxUnlockedScene, 3);
    } else if (debateCompleted && replayingScene !== 2) {
      completedScenes.delete(2);
      currentScene = Math.min(currentScene, 2);
      maxUnlockedScene = Math.min(maxUnlockedScene, 2);
    }
    if (mrJonesSceneCompleted) {
      completedScenes.add(3); maxUnlockedScene = Math.max(maxUnlockedScene, 4);
    } else if (caseConfirmedAsMurder && replayingScene !== 3) {
      completedScenes.delete(3); currentScene = Math.min(currentScene, 3); maxUnlockedScene = Math.min(maxUnlockedScene, 3);
    }
    if (theoriesCompleted) {
      completedScenes.add(4); maxUnlockedScene = Math.max(maxUnlockedScene, 5);
    } else if (mrJonesSceneCompleted && replayingScene !== 4) {
      completedScenes.delete(4); currentScene = Math.min(currentScene, 4); maxUnlockedScene = Math.min(maxUnlockedScene, 4);
    }
    if (clueCompleted) {
      completedScenes.add(5); maxUnlockedScene = Math.max(maxUnlockedScene, 6);
    } else if (theoriesCompleted && replayingScene !== 5) {
      completedScenes.delete(5); currentScene = Math.min(currentScene, 5); maxUnlockedScene = Math.min(maxUnlockedScene, 5);
    }
    if (finalCaseSolved) completedScenes.add(6); else completedScenes.delete(6);
    currentScene = Math.min(currentScene, maxUnlockedScene);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

previousButton.addEventListener('click', goToPreviousScene);
continueButton.addEventListener('click', goToNextScene);
replaySceneButton.addEventListener('click', () => {
  if (!window.confirm(`Переиграть этап «${scenes[currentScene].name}»? Прогресс только этого этапа будет сброшен.`)) return;
  resetCurrentScene();
});
document.addEventListener('dragover', handleDragAutoScroll);
document.addEventListener('drop', stopDragAutoScroll);
document.addEventListener('dragend', stopDragAutoScroll);
restartButton.addEventListener('click', () => {
  if (!window.confirm('Начать расследование заново? Весь сохранённый прогресс будет удалён.')) return;
  localStorage.removeItem(STORAGE_KEY); currentScene = 0; maxUnlockedScene = 0; completedScenes = new Set(); clubState = { assignments: {}, correct: [], seated: false }; debateProgress = { currentIndex: 0, recorded: [], part1Complete: false, part2Started: false }; gameState = { detectiveApproach: null }; debateCompleted = false; selectedDescription = null;
  caseDinnerGuests = [null, null, null]; caseDinnerGuestsComplete = false; caseDishesExamined = { lobster: false, trifle: false, breadCheese: false }; caseDishesReviewed = false; caseOutcomes = { mrJones: 'unknown', mrsJones: 'unknown', missClark: 'unknown' }; caseOutcomesComplete = false; medicalReportOpened = false; autopsyReportOpened = false; caseConfirmedAsMurder = false; openSeatMenu = null; activeDishNote = null; caseDishWords = { lobster: [], trifle: [], breadCheese: [] }; replayingScene = null;
  mrJonesEvidenceOpened = { inheritance: false, poisonAccess: false, otherWoman: false, cornflour: false, letter: false }; mrJonesFirstAssessment = null; mrJonesAssessmentDraft = null; mrJonesNewEvidenceProgress = 0; mrJonesEvidenceStatus = { inheritance: 'still-relevant', poisonAccess: 'still-relevant', otherWoman: null, cornflour: null, letter: null }; mrJonesRevisedAssessment = null; mrJonesRevisedDraft = null; mrJonesLogicQuestionComplete = false; mrJonesSceneCompleted = false;
  theoryReconstruction = {}; theoryReconstructionCorrect = {}; theoryReconstructionCompleted = false; theoryChallengeProgress = 0; theoryChallengesCompleted = { pender: false, joyce: false, petherick: false, raymond: false }; theoriesFinalQuestionComplete = false; theoriesCompleted = false; selectedTheoryNote = null; activeTheoryChallenge = false;
  clueMeaningSolved = false; clueHintsOpened = 0; clueSupperConnection = null; clueSupperConnectionSolved = false; clueInferenceSolved = false; clueCompleted = false;
  crimeSequence = []; crimeSequenceSolved = false; selectivePoisoningSolved = { mrsJones: false, mrJones: false, missClark: false }; selectiveStatementIndex = 0; bantingNoteOpen = false; gladysMotiveSolved = false; finalCaseSolution = { murderer: null, accomplice: null, method: null, motive: null }; finalCaseSolved = false; renderCurrentScene();
});

const soundToggle = document.querySelector('#soundToggle');
let audioContext, oscillator, gainNode;
soundToggle.addEventListener('click', () => {
  soundToggle.classList.toggle('active');
  if (soundToggle.classList.contains('active')) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioContext.createOscillator(); gainNode = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 174; gainNode.gain.value = 0.018;
    oscillator.connect(gainNode).connect(audioContext.destination); oscillator.start();
    soundToggle.setAttribute('aria-label', 'Выключить атмосферный звук');
  } else {
    if (oscillator) oscillator.stop(); if (audioContext) audioContext.close();
    soundToggle.setAttribute('aria-label', 'Включить атмосферный звук');
  }
});

loadGame();
renderCurrentScene();
if (finalCaseSolved) window.setTimeout(unlockSolvedCaseAchievement, 700);
