const STORAGE_KEY = 'exam-paper-generator:draft:v7';
const DEFAULT_BLANK_LENGTH = 9;
const LISTENING_GROUP_PATTERN = /Questions?\s+\d+\s*(?:through|to|-|–|—)\s*\d+\s+are\s+based\s+on\s+the\s+following\s+(?:longer\s+)?(?:passage|conversation)\.?/i;

/** 各部分固定 Directions（仅正文斜体，不加粗） */
const SECTION_DIRECTIONS = {
  listeningA: 'Directions: In Section A, you will hear ten short conversations between two speakers. At the end of each conversation, a question will be asked about what was said. The conversations and the questions will be spoken only once. After you hear a conversation and the question about it, read the four possible answers on your paper and decide which one is the best answer to the question you have heard.',
  listeningB: 'Directions: In Section B, you will hear two short passages and one longer conversation, and you will be asked several questions on each of the passages and the conversation. The passages and the conversation will be read twice, but the questions will be spoken only once. When you hear a question, read the four possible answers on your paper and decide which one would be the best answer to the question you have heard.',
  grammar: 'Directions: After reading the passage below, fill in the blanks to make the passage coherent and grammatically correct. For the blanks with a given word, fill in each blank with the proper form of the given word; for the other blanks, use one word that best fits each blank.',
  vocabulary: 'Directions: Fill in each blank with a proper word chosen from the box. Each word can only be used once. Note that there is one word more than you need.',
  cloze: 'Directions: For each blank in the following passage there are four words or phrases marked A, B, C and D. Fill in each blank with the word or phrase that best fits the context.',
  reading: 'Directions: Read the following three passages. Each passage is followed by several questions or unfinished statements. For each of them there are four choices marked A, B, C and D. Choose the one that fits best according to the information given in the passage you have just read.',
  sectionC: 'Directions: Read the following passage. Fill in each blank with a proper sentence given in the box. Each sentence can be used only once. Note that there are two more sentences than you need.',
  summary: 'Directions: Read the following passage. Summarize the main idea and the main point(s) of the passage in no more than 60 words. Use your own words as far as possible.',
  translation: 'Directions: Translate the following sentences into English, using the words given in the brackets.',
  writing: 'Directions: Write an English composition in 120-150 words according to the instructions given below in Chinese.',
  custom: 'Directions: Complete the following questions.',
};

/** 内置题型（不含自定义；自定义用「＋」按需添加） */
const TYPE_LIBRARY = [
  {
    type: 'listening',
    title: 'Listening Comprehension',
    subtitle: '听力理解',
    count: 20,
    defaultScore: 25,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.listeningA,
  },
  {
    type: 'grammar',
    title: 'Grammar',
    subtitle: '语法填空',
    count: 10,
    defaultScore: 10,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.grammar,
  },
  {
    type: 'vocabulary',
    title: 'Vocabulary',
    subtitle: '十一选十',
    count: 10,
    defaultScore: 10,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.vocabulary,
  },
  {
    type: 'cloze',
    title: 'Cloze',
    subtitle: '完形填空',
    count: 15,
    defaultScore: 15,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.cloze,
  },
  {
    type: 'readingA',
    title: 'Reading A',
    subtitle: '阅读理解 A',
    count: 4,
    defaultScore: 8,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.reading,
  },
  {
    type: 'readingB',
    title: 'Reading B',
    subtitle: '阅读理解 B',
    count: 3,
    defaultScore: 6,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.reading,
  },
  {
    type: 'readingC',
    title: 'Reading C',
    subtitle: '阅读理解 C',
    count: 4,
    defaultScore: 8,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.reading,
  },
  {
    type: 'sectionC',
    title: 'Section C',
    subtitle: '六选四',
    count: 4,
    defaultScore: 8,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.sectionC,
  },
  {
    type: 'summary',
    title: 'Summary Writing',
    subtitle: '语篇概要',
    count: 1,
    defaultScore: 10,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.summary,
  },
  {
    type: 'translation',
    title: 'Translation',
    subtitle: '翻译',
    count: 4,
    defaultScore: 15,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.translation,
  },
  {
    type: 'writing',
    title: 'Guided Writing',
    subtitle: '大作文',
    count: 1,
    defaultScore: 25,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.writing,
  },
  {
    type: 'custom',
    title: '自定义题目',
    subtitle: '自定义',
    count: 1,
    defaultScore: 5,
    defaultRepeat: 1,
    instruction: SECTION_DIRECTIONS.custom,
  },
];

const BUILTIN_TYPE_ORDER = TYPE_LIBRARY.filter((item) => item.type !== 'custom').map((item) => item.type);

/** 试卷大题结构：罗马数字大题 + Section 子标题；未选题型自动跳过，大题号顺延 */
const EXAM_MAJOR_GROUPS = [
  {
    key: 'listening',
    title: 'Listening Comprehension',
    parts: [
      { type: 'listening', sectionLabel: 'Section A', listeningPart: 'A', instruction: SECTION_DIRECTIONS.listeningA },
      { type: 'listening', sectionLabel: 'Section B', listeningPart: 'B', instruction: SECTION_DIRECTIONS.listeningB },
    ],
  },
  {
    key: 'grammar-vocabulary',
    title: 'Grammar and Vocabulary',
    parts: [
      { type: 'grammar', sectionLabel: 'Section A', sectionTitle: 'Grammar', instruction: SECTION_DIRECTIONS.grammar },
      { type: 'vocabulary', sectionLabel: 'Section B', sectionTitle: 'Vocabulary', instruction: SECTION_DIRECTIONS.vocabulary },
    ],
  },
  {
    key: 'reading',
    title: 'Reading Comprehension',
    parts: [
      { type: 'cloze', sectionLabel: 'Section A', sectionTitle: 'Cloze', instruction: SECTION_DIRECTIONS.cloze },
      { type: 'readingA', sectionLabel: 'Section B', sectionTitle: 'Reading A', instruction: SECTION_DIRECTIONS.reading, readingPartLabel: '(A)' },
      { type: 'readingB', sectionLabel: 'Section B', sectionTitle: 'Reading B', instruction: null, readingPartLabel: '(B)' },
      { type: 'readingC', sectionLabel: 'Section B', sectionTitle: 'Reading C', instruction: null, readingPartLabel: '(C)' },
      { type: 'sectionC', sectionLabel: 'Section C', sectionTitle: '', instruction: SECTION_DIRECTIONS.sectionC },
    ],
  },
  {
    key: 'summary',
    title: 'Summary Writing',
    parts: [{ type: 'summary', instruction: SECTION_DIRECTIONS.summary }],
  },
  {
    key: 'translation',
    title: 'Translation',
    parts: [{ type: 'translation', instruction: SECTION_DIRECTIONS.translation }],
  },
  {
    key: 'writing',
    title: 'Guided Writing',
    parts: [{ type: 'writing', instruction: SECTION_DIRECTIONS.writing }],
  },
];

const ANSWER_GROUP_TITLES = {
  listening: 'Listening Comprehension',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  cloze: 'Cloze',
  readingA: 'Reading A',
  readingB: 'Reading B',
  readingC: 'Reading C',
  sectionC: 'Section C',
  summary: 'Summary Writing',
  translation: 'Translation',
  writing: 'Guided Writing',
  custom: 'Custom',
};

const PART_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function rangeCount(range) {
  const start = Math.max(1, Number(range?.start) || 1);
  const end = Math.max(start, Number(range?.end) || start);
  return end - start + 1;
}

function formatRangeLabel(range) {
  const start = Math.max(1, Number(range?.start) || 1);
  const end = Math.max(start, Number(range?.end) || start);
  return start === end ? `${start}` : `${start}–${end}`;
}

function formatRangesSummary(selection) {
  ensureRanges(selection);
  return selection.ranges.map((range, index) => {
    const label = selection.ranges.length > 1 ? `(${PART_LETTERS[index]}) ` : '';
    return `${label}${formatRangeLabel(range)}`;
  }).join(' · ');
}

/** 保证 ranges 长度与份数一致；改份数时自动续写题号行 */
function ensureRanges(selection, options = {}) {
  const item = libraryItem(selection.type) || libraryItem('custom');
  const repeat = Math.max(1, Math.min(10, Number(selection.repeat) || 1));
  selection.repeat = repeat;
  if (!Array.isArray(selection.ranges)) selection.ranges = [];

  if (!selection.ranges.length) {
    const start = Math.max(1, Number(selection.start) || 1);
    const end = Math.max(start, Number(selection.end) || start + (item.count || 1) - 1);
    selection.ranges.push({ start, end });
  }

  const defaultCount = rangeCount(selection.ranges[0]) || item.count || 1;
  while (selection.ranges.length < repeat) {
    const last = selection.ranges[selection.ranges.length - 1];
    const nextStart = (Number(last.end) || 1) + 1;
    selection.ranges.push({ start: nextStart, end: nextStart + defaultCount - 1 });
  }
  while (selection.ranges.length > repeat) selection.ranges.pop();

  selection.ranges = selection.ranges.map((range) => {
    const start = Math.max(1, Number(range.start) || 1);
    const end = Math.max(start, Number(range.end) || start);
    return { start, end };
  });

  selection.start = selection.ranges[0].start;
  selection.end = selection.ranges[0].end;
  return selection;
}

function questionCountOf(selection) {
  ensureRanges(selection);
  return rangeCount(selection.ranges[0]);
}

function totalQuestionSpan(selection) {
  ensureRanges(selection);
  return selection.ranges.reduce((sum, range) => sum + rangeCount(range), 0);
}

function createTypeSelection(type, overrides = {}) {
  const item = libraryItem(type) || libraryItem('custom');
  const count = Number(overrides.count) || item.count;
  const start = Number(overrides.start) || 1;
  const end = Number(overrides.end) || start + count - 1;
  const repeat = Math.max(1, Number(overrides.repeat) || item.defaultRepeat || 1);
  const selection = {
    id: overrides.id || uid(type),
    type,
    enabled: overrides.enabled !== false,
    repeat,
    start,
    end,
    ranges: Array.isArray(overrides.ranges) && overrides.ranges.length
      ? overrides.ranges.map((range) => ({
        start: Math.max(1, Number(range.start) || 1),
        end: Math.max(1, Number(range.end) || 1),
      }))
      : [{ start, end }],
    score: overrides.score != null ? Number(overrides.score) : Number(item.defaultScore) || 0,
    scores: [],
    customTitle: overrides.customTitle || '',
    // 自定义题：挂到已有大题下成为 Section；空则独立成大题
    attachMajorKey: overrides.attachMajorKey || '',
    sectionLabel: overrides.sectionLabel || '',
  };
  ensureRanges(selection);
  return selection;
}

function defaultTypeSelections() {
  let next = 1;
  return BUILTIN_TYPE_ORDER.map((type) => {
    const item = libraryItem(type);
    const start = next;
    const end = next + item.count - 1;
    next = end + 1;
    return createTypeSelection(type, {
      start,
      end,
      enabled: true,
      score: item.defaultScore,
    });
  });
}

function migrateTypeSelections(list) {
  if (!Array.isArray(list) || !list.length) return defaultTypeSelections();
  return list.map((raw) => {
    const type = raw.type || 'custom';
    const item = libraryItem(type) || libraryItem('custom');
    let start = Number(raw.start);
    let end = Number(raw.end);
    if (!Number.isFinite(start) || start < 1) {
      start = 1;
      if (Number(raw.questionCount) > 0) end = start + Number(raw.questionCount) - 1;
      else end = start + (item.count || 1) - 1;
    }
    if (!Number.isFinite(end) || end < start) {
      const count = Number(raw.questionCount) || item.count || 1;
      end = start + count - 1;
    }
    return createTypeSelection(type, {
      id: raw.id,
      enabled: raw.enabled !== false,
      repeat: raw.repeat,
      start,
      end,
      ranges: raw.ranges,
      score: raw.score != null ? raw.score : item.defaultScore,
      customTitle: raw.customTitle || '',
      attachMajorKey: raw.attachMajorKey || '',
      sectionLabel: raw.sectionLabel || '',
    });
  });
}

function defaultStyle() {
  return {
    fontFamily: 'Times New Roman',
    cjkFontFamily: '宋体',
    fontSize: 10.5,
    lineSpacing: '1.2',
    fixedLineHeight: 12.6,
    paragraphAfter: 0,
    firstLineIndent: 2,
    blankLength: DEFAULT_BLANK_LENGTH,
  };
}

function defaultExam() {
  return {
    title: '高二英语期末考试试卷',
    grade: '',
    yearMonth: '',
    duration: '120 分钟',
    totalScore: 0,
    paperSize: 'A4',
  };
}

function defaultState() {
  return {
    step: 'select',
    previewMode: 'paper',
    exam: defaultExam(),
    style: defaultStyle(),
    typeSelections: defaultTypeSelections(),
    sections: [],
    activeId: null,
    savedAt: null,
  };
}

let state = loadState();
if (state.step === 'edit' && state.typeSelections?.length) {
  state.sections = buildSectionsFromSelections();
  if (!state.sections.some((section) => section.id === state.activeId)) {
    state.activeId = state.sections[0]?.id || null;
  }
}
const FEEDBACK_PHOTO_MAX = 4;
const FEEDBACK_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const FEEDBACK_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
let feedbackPhotoFiles = [];
let toastTimer;

const $ = (id) => document.getElementById(id);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('exam-paper-generator:draft:v5');
    const saved = JSON.parse(raw);
    if (saved?.typeSelections && Array.isArray(saved.typeSelections)) {
      return {
        ...defaultState(),
        ...saved,
        style: { ...defaultStyle(), ...saved.style, cjkFontFamily: saved.style?.cjkFontFamily || '宋体' },
        exam: { ...defaultExam(), ...saved.exam },
        previewMode: saved.previewMode === 'answer' ? 'answer' : 'paper',
        typeSelections: migrateTypeSelections(saved.typeSelections),
        sections: (saved.sections || []).map((section) => ({
          enabled: true,
          answer: '',
          vocabOptions: '',
          sentenceOptions: '',
          listeningScript: '',
          scores: [],
          sectionScore: 0,
          ...section,
          answer: section.answer || '',
          vocabOptions: section.vocabOptions || '',
          sentenceOptions: section.sentenceOptions || '',
          listeningScript: section.listeningScript || '',
          scores: Array.isArray(section.scores) ? section.scores : [],
          sectionScore: Number(section.sectionScore) || 0,
        })),
      };
    }
  } catch (error) {
    console.warn('Unable to restore draft', error);
  }
  return defaultState();
}

function saveState(show = true) {
  state.savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if ($('saveStatus')) {
    $('saveStatus').textContent = show ? '已保存' : '已自动保存';
    $('saveStatus').classList.add('saved');
  }
  if (show) showToast('草稿已保存到本机');
}

let autosaveTimer = null;
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      saveState(false);
    } catch (error) {
      console.warn('Autosave failed', error);
      if ($('saveStatus')) {
        $('saveStatus').textContent = '自动保存失败';
        $('saveStatus').classList.remove('saved');
      }
    }
  }, 800);
}

function markDirty() {
  if ($('saveStatus')) {
    $('saveStatus').textContent = '有未保存修改';
    $('saveStatus').classList.remove('saved');
  }
  scheduleAutosave();
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

async function submitFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('feedbackSubmit');
  const hint = $('feedbackHint');
  const name = String($('feedbackName')?.value || '').trim();
  const message = String($('feedbackMessage')?.value || '').trim();
  if (!message) {
    if (hint) hint.textContent = '先写两句问题描述呗～';
    return;
  }
  if (button) button.disabled = true;
  if (hint) hint.textContent = '提交中…';
  try {
    const photos = await Promise.all(feedbackPhotoFiles.map(fileToFeedbackPhoto));
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message, photos }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '提交失败');
    form.reset();
    clearFeedbackPhotos();
    if (hint) hint.textContent = '收到啦！后台小姐姐会尽快看看～';
    showToast('问题已提交');
  } catch (error) {
    if (hint) hint.textContent = error.message || '提交失败，稍后再试';
    showToast(error.message || '提交失败');
  } finally {
    if (button) button.disabled = false;
  }
}

function fileToFeedbackPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      type: file.type,
      data: String(reader.result || ''),
    });
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

function clearFeedbackPhotos() {
  feedbackPhotoFiles = [];
  const input = $('feedbackPhotos');
  if (input) input.value = '';
  renderFeedbackPhotoPreview();
}

function addFeedbackPhotos(fileList) {
  const hint = $('feedbackHint');
  const incoming = [...fileList];
  for (const file of incoming) {
    if (!FEEDBACK_PHOTO_TYPES.includes(file.type)) {
      if (hint) hint.textContent = '只支持 jpg / png / webp / gif';
      continue;
    }
    if (file.size > FEEDBACK_PHOTO_MAX_BYTES) {
      if (hint) hint.textContent = '单张图片请控制在 2MB 以内';
      continue;
    }
    if (feedbackPhotoFiles.length >= FEEDBACK_PHOTO_MAX) {
      if (hint) hint.textContent = `最多上传 ${FEEDBACK_PHOTO_MAX} 张`;
      break;
    }
    feedbackPhotoFiles.push(file);
  }
  renderFeedbackPhotoPreview();
}

function renderFeedbackPhotoPreview() {
  const host = $('feedbackPhotoPreview');
  if (!host) return;
  host.innerHTML = '';
  feedbackPhotoFiles.forEach((file, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'feedback-photo-thumb';
    const img = document.createElement('img');
    img.alt = file.name;
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'feedback-photo-remove';
    remove.setAttribute('aria-label', '移除照片');
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      feedbackPhotoFiles.splice(index, 1);
      renderFeedbackPhotoPreview();
    });
    thumb.append(img, remove);
    host.appendChild(thumb);
  });
}

function activeSection() {
  return state.sections.find((section) => section.id === state.activeId);
}

function roman(number) {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][number - 1] || String(number);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value || '');
}

function libraryItem(type) {
  return TYPE_LIBRARY.find((item) => item.type === type);
}

function partLabel(index, total) {
  if (total <= 1) return '';
  return `(${PART_LETTERS[index] || index + 1})`;
}

function findEnabledSelection(type) {
  return state.typeSelections.find((selection) => selection.enabled && selection.type === type);
}

function majorGroupTemplateForType(type) {
  if (!type || type === 'custom') return null;
  return EXAM_MAJOR_GROUPS.find((group) => group.parts.some((part) => part.type === type)) || null;
}

function defaultMajorKeyForType(type) {
  return majorGroupTemplateForType(type)?.key || '';
}

function majorTemplateByKey(key) {
  return EXAM_MAJOR_GROUPS.find((group) => group.key === key) || null;
}

/** 选题页实际所属大题：优先 attachMajorKey，否则回默认大题 / 独立自定义 */
function groupKeyOfSelection(selection) {
  if (!selection) return '';
  if (selection.attachMajorKey) return selection.attachMajorKey;
  if (selection.type === 'custom') return `custom-${selection.id}`;
  return defaultMajorKeyForType(selection.type);
}

function majorKeyOfSelection(selection) {
  const key = groupKeyOfSelection(selection);
  if (String(key).startsWith('custom-')) return '';
  return key;
}

function belongsToMajorKey(selection, majorKey) {
  return Boolean(majorKey) && groupKeyOfSelection(selection) === majorKey;
}

/** 为大题推荐下一个未占用的 Section 字母 */
function suggestNextSectionLabel(majorKey, excludeId = '') {
  const used = new Set();
  state.typeSelections.forEach((selection) => {
    if (selection.id === excludeId) return;
    if (groupKeyOfSelection(selection) !== majorKey) return;
    if (selection.sectionLabel) {
      used.add(selection.sectionLabel);
      return;
    }
    const homeDefs = majorGroupTemplateForType(selection.type)?.parts.filter((part) => part.type === selection.type) || [];
    homeDefs.forEach((part) => {
      if (part.sectionLabel) used.add(part.sectionLabel);
    });
  });
  for (const letter of PART_LETTERS) {
    const label = `Section ${letter}`;
    if (!used.has(label)) return label;
  }
  return 'Section';
}

function customSectionDefs(selection) {
  return [{
    sectionLabel: selection.sectionLabel || '',
    sectionTitle: selection.customTitle || '',
    instruction: SECTION_DIRECTIONS.custom,
  }];
}

function sectionDefsForSelection(selection) {
  if (selection.type === 'custom') return customSectionDefs(selection);

  const home = majorGroupTemplateForType(selection.type);
  const homeKey = home?.key || '';
  const atHome = !selection.attachMajorKey || selection.attachMajorKey === homeKey;
  if (atHome && home) {
    return home.parts.filter((part) => part.type === selection.type);
  }

  const item = libraryItem(selection.type);
  return [{
    sectionLabel: selection.sectionLabel || '',
    sectionTitle: item?.title || '',
    instruction: item?.instruction || SECTION_DIRECTIONS.custom,
  }];
}

/** 把任意题型挂到目标大题（空字符串表示恢复默认 / 自定义独立） */
function attachSelectionToMajor(selection, targetMajorKey) {
  if (!selection) return;
  const template = majorTemplateByKey(targetMajorKey);
  const home = majorGroupTemplateForType(selection.type);
  if (!template) {
    if (selection.type === 'custom') selection.attachMajorKey = '';
    return;
  }

  const homeKey = home?.key || '';
  const alreadyThere = selection.attachMajorKey === targetMajorKey
    || (!selection.attachMajorKey && selection.type !== 'custom' && targetMajorKey === homeKey);
  const leavingHome = selection.type !== 'custom' && targetMajorKey !== homeKey;

  if (selection.type !== 'custom' && targetMajorKey === homeKey) {
    selection.attachMajorKey = '';
  } else {
    selection.attachMajorKey = targetMajorKey;
  }

  if (!alreadyThere && leavingHome) {
    selection.sectionLabel = suggestNextSectionLabel(targetMajorKey, selection.id);
  } else if (!selection.sectionLabel) {
    if (selection.type === 'custom' || leavingHome) {
      selection.sectionLabel = suggestNextSectionLabel(targetMajorKey, selection.id);
    } else {
      const homeDef = home?.parts?.find((part) => part.type === selection.type);
      selection.sectionLabel = homeDef?.sectionLabel || '';
    }
  }
}

function sectionHeadingText(section) {
  // 卷面：只显示 Section A/B/C，不跟 Grammar / Reading A 等后缀
  if (section.sectionLabel) return section.sectionLabel;
  return section.sectionTitle || '';
}

function sectionDisplayHeading(section) {
  const major = `${section.major}. ${section.majorTitle}`;
  // 侧栏仍带题型名，便于区分多份
  const detail = [section.sectionLabel, section.sectionTitle].filter(Boolean).join(' ')
    || section.title
    || '';
  const copy = section.partLabel ? ` ${section.partLabel}` : '';
  if (detail) return `${major} · ${detail}${copy}`;
  return `${major}${copy}`;
}

function sectionContentKey(type, rangeIndex, sectionLabelOrTitle = '') {
  return `${type}|${rangeIndex}|${sectionLabelOrTitle}`;
}

function inferSectionRangeIndex(section) {
  if (section?.listeningPart === 'A') return 0;
  if (section?.listeningPart === 'B') return 1;
  const match = String(section?.partLabel || '').match(/^\(([A-Z])\)$/i);
  if (match) return match[1].toUpperCase().charCodeAt(0) - 65;
  return 0;
}

function previousSectionLookupKeys(section) {
  const rangeIndex = inferSectionRangeIndex(section);
  const title = section.sectionTitle || '';
  const label = section.sectionLabel || '';
  return [
    section.contentKey,
    sectionContentKey(section.type, rangeIndex, title || label),
    sectionContentKey(section.type, rangeIndex, label || title),
  ].filter(Boolean);
}

function getListeningSplitRange(selection, part) {
  ensureRanges(selection);
  const range = selection.ranges[0];
  const start = Math.max(1, Number(range.start) || 1);
  const end = Math.max(start, Number(range.end) || start + 19);
  if (part === 'A') {
    const partEnd = Math.min(start + 9, end);
    return { start, end: partEnd, count: partEnd - start + 1 };
  }
  const partStart = start + 10;
  if (partStart > end) return { start: partStart, end: partStart, count: 0 };
  return { start: partStart, end, count: end - partStart + 1 };
}

function buildSectionsFromSelections() {
  const previous = new Map();
  (state.sections || []).forEach((section) => {
    previousSectionLookupKeys(section).forEach((key) => {
      if (!previous.has(key)) previous.set(key, section);
    });
  });

  const sections = [];
  let majorIndex = 0;
  const usedPrevious = new WeakSet();
  const usedIds = new Set();

  const findExisting = (contentKey) => {
    const existing = previous.get(contentKey);
    if (!existing || usedPrevious.has(existing)) return null;
    usedPrevious.add(existing);
    return existing;
  };

  const nextSectionId = (existing, type) => {
    let id = existing?.id || uid(type);
    if (usedIds.has(id)) id = uid(type);
    usedIds.add(id);
    return id;
  };

  const pushSelectionSections = (selection, partDef, groupTitle, major) => {
    const item = libraryItem(selection.type);
    if (!item) return;
    ensureRanges(selection, { normalizeTranslation: true });
    const sectionScore = Number(selection.score) || 0;
    const sectionTitle = partDef?.sectionTitle || '';
    const sectionLabel = partDef?.sectionLabel || '';

    if (partDef?.listeningPart) {
      const split = getListeningSplitRange(selection, partDef.listeningPart);
      const contentKey = sectionContentKey(selection.type, partDef.listeningPart === 'A' ? 0 : 1, sectionLabel);
      const existing = findExisting(contentKey);
      sections.push({
        id: nextSectionId(existing, selection.type),
        contentKey,
        type: selection.type,
        major,
        majorTitle: groupTitle,
        sectionLabel,
        sectionTitle,
        listeningPart: partDef.listeningPart,
        title: sectionHeadingText({ sectionLabel, sectionTitle }),
        partLabel: '',
        subtitle: `${item.subtitle} · 10 题`,
        start: split.start,
        end: split.end,
        count: split.count,
        instruction: partDef.instruction || item.instruction,
        readingPartLabel: partDef.readingPartLabel || null,
        scores: existing?.scores || [],
        sectionScore,
        custom: false,
        enabled: true,
        content: existing?.content || '',
        answer: existing?.answer || '',
        vocabOptions: existing?.vocabOptions || '',
        sentenceOptions: existing?.sentenceOptions || '',
        listeningScript: existing?.listeningScript || '',
        numberingMode: 'fixed',
      });
      return;
    }

    const totalParts = selection.ranges.length;
    selection.ranges.forEach((range, rangeIndex) => {
      const count = rangeCount(range);
      const copyLabel = partLabel(rangeIndex, totalParts);
      const contentKey = sectionContentKey(selection.type, rangeIndex, sectionTitle || sectionLabel);
      const existing = findExisting(contentKey);
      let content = existing?.content || '';
      let vocabOptions = existing?.vocabOptions || '';
      let sentenceOptions = existing?.sentenceOptions || '';
      const listeningScript = existing?.listeningScript || '';
      if (selection.type === 'vocabulary' && !String(vocabOptions).trim() && content) {
        const migrated = extractVocabularyOptions(content);
        if (migrated) {
          vocabOptions = migrated.options.map((option) => `${option.label}. ${option.word}`).join(' ');
          content = migrated.remainder;
        }
      }
      if (selection.type === 'sectionC' && !String(sentenceOptions).trim() && content) {
        const migrated = extractSentenceOptions(content);
        if (migrated) {
          sentenceOptions = migrated.options.map((option) => `${option.label}. ${option.text}`).join('\n');
          content = migrated.remainder;
        }
      }
      sections.push({
        id: nextSectionId(existing, selection.type),
        contentKey,
        type: selection.type,
        major,
        majorTitle: groupTitle,
        sectionLabel,
        sectionTitle,
        title: sectionHeadingText({ sectionLabel, sectionTitle }),
        partLabel: copyLabel,
        subtitle: item.subtitle,
        start: range.start,
        end: range.end,
        count,
        instruction: partDef?.instruction !== undefined ? partDef.instruction : item.instruction,
        readingPartLabel: partDef?.readingPartLabel || null,
        scores: existing?.scores || [],
        sectionScore,
        custom: selection.type === 'custom',
        enabled: true,
        content,
        answer: existing?.answer || '',
        vocabOptions,
        sentenceOptions,
        listeningScript,
        numberingMode: 'fixed',
      });
    });
  };

  getSelectStepMajorGroups().forEach((group) => {
    const enabledParts = [];
    group.parts.forEach((part) => {
      if (!part.selection.enabled) return;
      const defs = part.sectionDefs?.length
        ? part.sectionDefs
        : [{ sectionLabel: '', sectionTitle: part.selection.customTitle || libraryItem(part.type)?.title || '' }];
      defs.forEach((partDef) => {
        enabledParts.push({ partDef, selection: part.selection });
      });
    });
    if (!enabledParts.length) return;

    majorIndex += 1;
    const major = roman(majorIndex);
    enabledParts.forEach(({ partDef, selection }) => {
      pushSelectionSections(selection, partDef, group.title, major);
    });
  });

  return sections;
}

function parseOptionalNumber(value) {
  const text = String(value ?? '').trim();
  if (text === '' || text === '-' || text === '.') return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sectionScoreText(section) {
  const score = Number(section.sectionScore);
  return Number.isFinite(score) && score > 0 ? String(score) : '';
}

function computeTotalScoreFromSelections() {
  return state.typeSelections
    .filter((selection) => selection.enabled)
    .reduce((sum, selection) => sum + (Number(selection.score) || 0), 0);
}

function computeTotalScoreFromSections() {
  const seen = new Set();
  let sum = 0;
  state.sections.forEach((section) => {
    if (section.enabled === false) return;
    const key = section.type === 'listening'
      ? `${section.type}`
      : `${section.type}|${section.sectionTitle || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    sum += Number(section.sectionScore) || 0;
  });
  return sum;
}

function syncExamTotalScore() {
  const total = state.step === 'edit'
    ? computeTotalScoreFromSections()
    : computeTotalScoreFromSelections();
  state.exam.totalScore = total;
  const selectTotal = $('selectExamTotalScore');
  const editTotal = $('examTotalScore');
  if (selectTotal) selectTotal.value = total;
  if (editTotal) editTotal.value = total;
  return total;
}

function autoChainQuestionNumbers(options = {}) {
  let next = 1;
  state.typeSelections.forEach((selection) => {
    if (!selection.enabled) return;
    ensureRanges(selection);
    selection.ranges.forEach((range) => {
      const count = rangeCount(range);
      range.start = next;
      range.end = next + count - 1;
      next = range.end + 1;
    });
    selection.start = selection.ranges[0].start;
    selection.end = selection.ranges[0].end;
  });
  renderTypeGrid();
  syncExamTotalScore();
  if (options.silent !== true) showToast('已按当前顺序自动衔接题号');
}

/** 从某大题某一行题号起，后面全部按题数顺序衔接 */
function chainQuestionNumbersAfter(selectionId, rangeIndex = 0) {
  const selIndex = state.typeSelections.findIndex((item) => item.id === selectionId);
  if (selIndex < 0) return;
  const selection = state.typeSelections[selIndex];
  ensureRanges(selection);
  const anchor = selection.ranges[Math.max(0, rangeIndex)];
  if (!anchor) return;
  let next = Math.max(1, Number(anchor.end) || 1) + 1;

  for (let i = rangeIndex + 1; i < selection.ranges.length; i += 1) {
    const count = Math.max(1, rangeCount(selection.ranges[i]));
    selection.ranges[i].start = next;
    selection.ranges[i].end = next + count - 1;
    next = selection.ranges[i].end + 1;
  }
  selection.start = selection.ranges[0].start;
  selection.end = selection.ranges[selection.ranges.length - 1].end;

  for (let s = selIndex + 1; s < state.typeSelections.length; s += 1) {
    const item = state.typeSelections[s];
    if (!item.enabled) continue;
    ensureRanges(item);
    item.ranges.forEach((range) => {
      const count = Math.max(1, rangeCount(range));
      range.start = next;
      range.end = next + count - 1;
      next = range.end + 1;
    });
    item.start = item.ranges[0].start;
    item.end = item.ranges[item.ranges.length - 1].end;
  }
}

function addCustomTypeSelection() {
  const customs = state.typeSelections.filter((item) => item.type === 'custom').length;
  let nextStart = 1;
  state.typeSelections.forEach((selection) => {
    if (!selection.enabled) return;
    ensureRanges(selection);
    selection.ranges.forEach((range) => {
      nextStart = Math.max(nextStart, Number(range.end) + 1);
    });
  });
  state.typeSelections.push(createTypeSelection('custom', {
    enabled: true,
    start: nextStart,
    end: nextStart,
    customTitle: `自定义题目 ${customs + 1}`,
    score: 5,
    attachMajorKey: '',
    sectionLabel: '',
  }));
  autoChainQuestionNumbers({ silent: true });
  showToast('已添加自定义：可在卡片里选择归属大题，或拖到目标大题的 Section 之间');
}

function addBuiltinTypeSelection(type) {
  const item = libraryItem(type);
  if (!item || type === 'custom') return;
  let nextStart = 1;
  state.typeSelections.forEach((selection) => {
    if (!selection.enabled) return;
    ensureRanges(selection);
    selection.ranges.forEach((range) => {
      nextStart = Math.max(nextStart, Number(range.end) + 1);
    });
  });
  state.typeSelections.push(createTypeSelection(type, {
    enabled: true,
    start: nextStart,
    end: nextStart + item.count - 1,
    score: item.defaultScore,
  }));
  autoChainQuestionNumbers({ silent: true });
  showToast(`已添加 ${item.title}`);
}

function removeTypeSelection(id) {
  const target = state.typeSelections.find((item) => item.id === id);
  if (!target) return;
  if (state.typeSelections.length <= 1) {
    showToast('至少保留一种题型');
    return;
  }
  state.typeSelections = state.typeSelections.filter((item) => item.id !== id);
  autoChainQuestionNumbers({ silent: true });
  showToast('已删除该题型，题号已重新衔接');
}

/** 把一组题型整体插到 beforeId 之前（beforeId 为空则放到末尾） */
function moveSelectionBlock(blockIds, beforeId) {
  const idSet = new Set(blockIds);
  const block = [];
  const rest = [];
  state.typeSelections.forEach((selection) => {
    if (idSet.has(selection.id)) block.push(selection);
    else rest.push(selection);
  });
  block.sort((a, b) => blockIds.indexOf(a.id) - blockIds.indexOf(b.id));
  if (!beforeId) {
    state.typeSelections = [...rest, ...block];
    return;
  }
  const insertAt = rest.findIndex((selection) => selection.id === beforeId);
  if (insertAt < 0) state.typeSelections = [...rest, ...block];
  else state.typeSelections = [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
}

function firstSelectionIdOfGroup(groupKey) {
  const found = state.typeSelections.find((selection) => groupKeyOfSelection(selection) === groupKey);
  return found?.id || null;
}

function belongsToMajorKey(selection, majorKey) {
  if (!selection || !majorKey) return false;
  if (selection.type === 'custom') return selection.attachMajorKey === majorKey;
  return majorGroupTemplateForType(selection.type)?.key === majorKey;
}

/** 插到某大题所有 section 之后（返回应 before 的 id；null 表示落到总末尾） */
function insertBeforeIdAfterMajor(majorKey, excludeId = '') {
  let lastIndex = -1;
  state.typeSelections.forEach((selection, index) => {
    if (selection.id === excludeId) return;
    if (belongsToMajorKey(selection, majorKey)) lastIndex = index;
  });
  if (lastIndex < 0) return null;
  const after = state.typeSelections.slice(lastIndex + 1).find((selection) => selection.id !== excludeId);
  return after?.id || null;
}

function moveSingleSelection(sourceId, beforeId) {
  const sourceIndex = state.typeSelections.findIndex((item) => item.id === sourceId);
  if (sourceIndex < 0) return;
  const [item] = state.typeSelections.splice(sourceIndex, 1);
  if (!beforeId) {
    state.typeSelections.push(item);
    return;
  }
  const targetIndex = state.typeSelections.findIndex((entry) => entry.id === beforeId);
  if (targetIndex < 0) state.typeSelections.push(item);
  else state.typeSelections.splice(targetIndex, 0, item);
}

function reorderTypeSelections(sourceId, beforeId, targetMajorKey = '', options = {}) {
  if (!sourceId) return;
  const moved = state.typeSelections.find((item) => item.id === sourceId);
  if (!moved) return;

  const appendToMajor = Boolean(options.appendToMajor);
  const sourceKey = groupKeyOfSelection(moved);
  const beforeSelection = beforeId
    ? state.typeSelections.find((item) => item.id === beforeId)
    : null;
  let resolvedTargetKey = targetMajorKey
    || (beforeSelection ? groupKeyOfSelection(beforeSelection) : '')
    || sourceKey;

  // 独立自定义大题：只调整顺序，不当作挂靠目标
  if (String(resolvedTargetKey).startsWith('custom-')) {
    if (moved.type === 'custom' && resolvedTargetKey !== `custom-${moved.id}`) {
      moved.attachMajorKey = '';
    }
    const insertBefore = appendToMajor ? null : beforeId;
    moveSingleSelection(sourceId, insertBefore);
    autoChainQuestionNumbers({ silent: true });
    return;
  }

  const targetTemplate = majorTemplateByKey(resolvedTargetKey);
  if (targetTemplate) {
    attachSelectionToMajor(moved, resolvedTargetKey);
    const insertBefore = appendToMajor
      ? insertBeforeIdAfterMajor(resolvedTargetKey, sourceId)
      : beforeId;
    moveSingleSelection(sourceId, insertBefore);
  } else {
    const insertBefore = appendToMajor
      ? insertBeforeIdAfterMajor(sourceKey, sourceId)
      : beforeId;
    moveSingleSelection(sourceId, insertBefore);
  }

  autoChainQuestionNumbers({ silent: true });
}

function clearTypeDropPreview() {
  const grid = $('typeGrid');
  if (!grid) return;
  grid.querySelectorAll('.type-drop-placeholder').forEach((el) => el.remove());
  grid.querySelectorAll('.type-card.drop-target, .type-card.drag-over, .major-block.drop-target').forEach((el) => {
    el.classList.remove('drop-target', 'drag-over');
  });
}

function allTypeCards() {
  const grid = $('typeGrid');
  return grid ? [...grid.querySelectorAll('.type-card:not(.dragging)')] : [];
}

function nextTypeCard(el) {
  const cards = allTypeCards();
  const index = cards.indexOf(el);
  return index >= 0 ? cards[index + 1] || null : null;
}

function firstCardOfNextMajor(block) {
  let node = block?.nextElementSibling;
  while (node) {
    if (node.classList.contains('major-block')) {
      return node.querySelector('.type-card:not(.dragging)');
    }
    node = node.nextElementSibling;
  }
  return null;
}

function previousMajorBlock(block) {
  let node = block?.previousElementSibling;
  while (node) {
    if (node.classList.contains('major-block')) return node;
    node = node.previousElementSibling;
  }
  return null;
}

function setTypeDropState({ beforeId = null, majorKey = '', placeAfter = false, appendToMajor = false } = {}) {
  typeDropBeforeId = beforeId;
  typeDropMajorKey = majorKey;
  typeDropPlaceAfter = placeAfter;
  typeDropAppendToMajor = appendToMajor;
}

/** 预览：放到某大题最后一个 section */
function showAppendToMajorPreview(block) {
  const grid = $('typeGrid');
  const list = block?.querySelector('.major-part-list');
  if (!grid || !block || !list) return;

  const targetMajorKey = block.dataset.majorKey || '';
  const nextCard = firstCardOfNextMajor(block);
  const beforeId = nextCard?.dataset.id || null;

  const existing = grid.querySelector('.type-drop-placeholder');
  if (
    existing
    && existing.dataset.append === '1'
    && existing.dataset.majorKey === String(targetMajorKey || '')
    && existing.parentElement === list
  ) {
    block.classList.add('drop-target');
    setTypeDropState({
      beforeId,
      majorKey: targetMajorKey,
      placeAfter: true,
      appendToMajor: true,
    });
    return;
  }

  clearTypeDropPreview();
  block.classList.add('drop-target');
  const placeholder = document.createElement('div');
  placeholder.className = 'type-drop-placeholder is-append';
  placeholder.dataset.beforeId = beforeId || '';
  placeholder.dataset.majorKey = targetMajorKey || '';
  placeholder.dataset.append = '1';
  placeholder.dataset.placeAfter = '1';
  placeholder.innerHTML = '<div class="type-drop-placeholder-inner"><strong>放到该大题末尾</strong></div>';
  list.appendChild(placeholder);
  setTypeDropState({
    beforeId,
    majorKey: targetMajorKey,
    placeAfter: true,
    appendToMajor: true,
  });
}

/** 根据指针位置，在目标卡片前/后插入跨大题拖放预览 */
function showTypeDropPreview(targetCard, clientX, clientY) {
  const grid = $('typeGrid');
  if (!grid || !targetCard || targetCard.classList.contains('dragging')) return;

  const block = targetCard.closest('.major-block');
  const list = block?.querySelector('.major-part-list') || targetCard.parentElement;
  const rect = targetCard.getBoundingClientRect();
  const placeBefore = clientY < rect.top + rect.height / 2;
  const nextCard = nextTypeCard(targetCard);
  const nextInSameMajor = Boolean(nextCard && nextCard.closest('.major-block') === block);
  const appendToMajor = !placeBefore && !nextInSameMajor;
  const beforeId = placeBefore
    ? targetCard.dataset.id
    : (nextInSameMajor ? nextCard.dataset.id : (firstCardOfNextMajor(block)?.dataset.id || null));
  const targetMajorKey = block?.dataset.majorKey || '';

  if (appendToMajor) {
    showAppendToMajorPreview(block);
    return;
  }

  const existing = grid.querySelector('.type-drop-placeholder');
  if (
    existing
    && existing.dataset.beforeId === String(beforeId || '')
    && existing.dataset.majorKey === String(targetMajorKey || '')
    && existing.dataset.placeAfter === String(placeBefore ? '0' : '1')
    && existing.dataset.append !== '1'
    && existing.parentElement === list
  ) {
    targetCard.classList.add('drop-target');
    block?.classList.add('drop-target');
    setTypeDropState({
      beforeId,
      majorKey: targetMajorKey,
      placeAfter: !placeBefore,
      appendToMajor: false,
    });
    return;
  }

  clearTypeDropPreview();
  targetCard.classList.add('drop-target');
  block?.classList.add('drop-target');

  const placeholder = document.createElement('div');
  placeholder.className = 'type-drop-placeholder';
  placeholder.dataset.beforeId = beforeId || '';
  placeholder.dataset.majorKey = targetMajorKey || '';
  placeholder.dataset.placeAfter = placeBefore ? '0' : '1';
  placeholder.dataset.append = '0';
  placeholder.innerHTML = '<div class="type-drop-placeholder-inner"><strong>放在这里</strong></div>';

  if (placeBefore) {
    list.insertBefore(placeholder, targetCard);
  } else if (nextCard && nextCard.parentElement === list) {
    list.insertBefore(placeholder, nextCard);
  } else {
    list.appendChild(placeholder);
  }

  setTypeDropState({
    beforeId,
    majorKey: targetMajorKey,
    placeAfter: !placeBefore,
    appendToMajor: false,
  });
}

/** 拖到大题空白处 / 标题上 */
function showTypeDropPreviewOnMajor(block, clientY) {
  const grid = $('typeGrid');
  const list = block?.querySelector('.major-part-list');
  if (!grid || !block || !list) return;

  const blockRect = block.getBoundingClientRect();
  // 贴着下一个大题顶边时，优先落到上一个大题末尾，避免抢落点
  if (clientY < blockRect.top + 16) {
    const prev = previousMajorBlock(block);
    if (prev) {
      showAppendToMajorPreview(prev);
      return;
    }
  }

  const cards = [...list.querySelectorAll('.type-card:not(.dragging)')];
  if (!cards.length) {
    showAppendToMajorPreview(block);
    return;
  }

  const maxBottom = Math.max(...cards.map((card) => card.getBoundingClientRect().bottom));
  if (clientY >= maxBottom - 10 || clientY >= blockRect.bottom - 18) {
    showAppendToMajorPreview(block);
    return;
  }

  let nearest = cards[0];
  let best = Infinity;
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const dist = Math.abs(clientY - mid);
    if (dist < best) {
      best = dist;
      nearest = card;
    }
  });
  showTypeDropPreview(nearest, 0, clientY);
}

function commitTypeDrop(sourceId, beforeId, targetMajorKey) {
  if (!sourceId) return;
  const appendToMajor = typeDropAppendToMajor;
  const placeAfter = typeDropPlaceAfter;
  clearTypeDropPreview();
  reorderTypeSelections(sourceId, beforeId, targetMajorKey || '', {
    appendToMajor,
    placeAfter,
  });
  typeDropAppendToMajor = false;
  typeDropPlaceAfter = false;
}

function goToStep(step) {
  state.step = step === 'edit' ? 'edit' : 'select';
  document.body.classList.toggle('page-select', state.step === 'select');
  document.body.classList.toggle('page-edit', state.step === 'edit');
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  renderAll();
}

function confirmTypeSelection() {
  const enabled = state.typeSelections.filter((item) => item.enabled);
  if (!enabled.length) {
    showToast('请至少选择一种题型');
    return;
  }
  syncExamTotalScore();
  state.sections = buildSectionsFromSelections();
  state.activeId = state.sections[0]?.id || null;
  goToStep('edit');
  saveState(false);
  showToast(`已组成 ${state.sections.length} 个大题，开始录入`);
}

function backToSelect() {
  if (!confirm('返回后可修改题型；再次确认进入组卷时会按新选择重建结构，当前录入内容将丢失。是否继续？')) return;
  goToStep('select');
}

/* ========== 选题型界面 ========== */

let typeDragId = null;
let typeDropBeforeId = null;
let typeDropMajorKey = null;
let typeDropPlaceAfter = false;
let typeDropAppendToMajor = false;
let typeExpandedId = null;

function listeningPartRangeLabel(selection, listeningPart) {
  const split = getListeningSplitRange(selection, listeningPart);
  if (!split.count) return '';
  return formatRangeLabel(split);
}

function getSelectStepMajorGroups() {
  const groups = [];
  const groupMap = new Map();

  const ensureGroup = (key, title) => {
    let group = groupMap.get(key);
    if (!group) {
      group = { key, title, parts: [] };
      groupMap.set(key, group);
      groups.push(group);
    }
    return group;
  };

  state.typeSelections.forEach((selection) => {
    const key = groupKeyOfSelection(selection);
    const title = String(key).startsWith('custom-')
      ? (selection.customTitle || 'Custom')
      : (majorTemplateByKey(key)?.title || key);
    const group = ensureGroup(key, title);
    if (group.parts.some((part) => part.selection.id === selection.id)) return;
    group.parts.push({
      type: selection.type,
      selection,
      sectionDefs: sectionDefsForSelection(selection),
    });
  });

  return groups;
}

function majorGroupReferenceMeta(group) {
  const enabledParts = group.parts.filter((part) => part.selection.enabled);
  if (!enabledParts.length) return '未启用';
  const score = enabledParts.reduce((sum, part) => sum + (Number(part.selection.score) || 0), 0);
  const starts = [];
  const ends = [];
  enabledParts.forEach((part) => {
    ensureRanges(part.selection);
    part.selection.ranges.forEach((range) => {
      starts.push(Number(range.start) || 1);
      ends.push(Number(range.end) || 1);
    });
  });
  const start = Math.min(...starts);
  const end = Math.max(...ends);
  const range = start === end ? `${start}` : `${start}–${end}`;
  return `${range} · ${score} 分`;
}

function buildTypeCardElement(selection, sectionDefs = []) {
  const item = libraryItem(selection.type);
  if (!item) return null;
  ensureRanges(selection, { normalizeTranslation: true });
  const card = document.createElement('article');
  card.className = `type-card ${selection.enabled ? 'enabled' : ''}`;
  card.draggable = true;
  card.dataset.id = selection.id;
  const isCustom = selection.type === 'custom';
  const rangeSummary = formatRangesSummary(selection);

  const multiSection = sectionDefs.length > 1;
  const sectionLines = multiSection
    ? `<div class="type-section-lines">${sectionDefs.map((partDef) => {
      const label = partDef.sectionLabel || partDef.sectionTitle;
      if (!label) return '';
      let note = '';
      if (selection.type === 'listening' && partDef.listeningPart) {
        const partRange = listeningPartRangeLabel(selection, partDef.listeningPart);
        if (partRange) note = ` ${partRange}`;
      }
      return `<span class="type-section-chip">${escapeHtml(label)}<em>${escapeHtml(note)}</em></span>`;
    }).filter(Boolean).join('')}</div>`
    : '';

  // 大题标题已在外层；卡片优先显示 Section A/B/C（阅读加 (A)/(B)/(C)）
  const homeMajorKey = defaultMajorKeyForType(selection.type);
  const attachedAway = Boolean(selection.attachMajorKey)
    && (selection.type === 'custom' || selection.attachMajorKey !== homeMajorKey);
  let displayTitle = '';
  if (isCustom) {
    displayTitle = selection.sectionLabel || selection.customTitle || '自定义';
  } else if (attachedAway && selection.sectionLabel) {
    displayTitle = selection.sectionLabel;
  } else if (!multiSection && sectionDefs[0]?.sectionLabel) {
    const partMark = sectionDefs[0].readingPartLabel ? ` ${sectionDefs[0].readingPartLabel}` : '';
    displayTitle = `${sectionDefs[0].sectionLabel}${partMark}`;
  } else if (!multiSection) {
    displayTitle = item.title;
  }

  const rangeRows = selection.ranges.map((range, index) => {
    const part = selection.ranges.length > 1 ? `(${PART_LETTERS[index]})` : '';
    return `
      <label class="type-range-field">
        题号${part ? ` ${part}` : ''}
        <span class="type-range-inputs">
          <input type="number" min="0" max="200" inputmode="numeric" data-range-index="${index}" data-range-field="start" value="${range.start}" />
          <span class="type-range-sep">–</span>
          <input type="number" min="0" max="200" inputmode="numeric" data-range-index="${index}" data-range-field="end" value="${range.end}" />
        </span>
      </label>
    `;
  }).join('');

  const majorAttachOptions = [
    `<option value="" ${!selection.attachMajorKey ? 'selected' : ''}>${
      isCustom
        ? '独立成大题'
        : `${escapeHtml(majorTemplateByKey(homeMajorKey)?.title || '默认大题')}（默认）`
    }</option>`,
    ...EXAM_MAJOR_GROUPS
      .filter((group) => isCustom || group.key !== homeMajorKey)
      .map((group) => (
        `<option value="${escapeAttr(group.key)}" ${selection.attachMajorKey === group.key ? 'selected' : ''}>${escapeHtml(group.title)}</option>`
      )),
  ].join('');

  const isExpanded = typeExpandedId === selection.id;
  let detailHtml = '';
  if (selection.enabled) {
    detailHtml = `
      <div class="type-card-controls ${isExpanded ? 'is-open' : ''}">
        <label>份数
          <input type="number" min="0" max="10" inputmode="numeric" data-field="repeat" value="${selection.repeat}" />
        </label>
        <label>分值
          <input type="number" min="0" max="300" step="0.5" inputmode="decimal" data-field="score" value="${selection.score}" />
        </label>
        <label class="type-custom-attach">归属大题
          <select data-field="attachMajorKey">${majorAttachOptions}</select>
        </label>
        <label class="type-custom-section">Section
          <input data-field="sectionLabel" value="${escapeAttr(selection.sectionLabel)}" placeholder="Section C" />
        </label>
        ${isCustom ? `
          <label class="type-custom-title">备注
            <input data-field="customTitle" value="${escapeAttr(selection.customTitle)}" placeholder="听写 / 扩展阅读" />
          </label>
        ` : ''}
        <div class="type-range-list">${rangeRows}</div>
        ${isCustom ? `<button type="button" class="type-remove-button" data-action="remove">删除</button>` : ''}
      </div>
    `;
  }

  const metaSubtitle = isCustom
    ? (selection.customTitle || '自定义')
    : (attachedAway ? `${item.subtitle}（${item.title}）` : item.subtitle);
  const metaBits = [metaSubtitle];
  if (selection.enabled) {
    metaBits.push(rangeSummary);
    metaBits.push(`${selection.score} 分`);
  }

  card.className = `type-card ${selection.enabled ? 'enabled' : ''} ${isExpanded ? 'is-expanded' : ''}`;
  card.innerHTML = `
    <div class="type-card-top">
      <span class="type-drag-handle" title="拖拽排序" draggable="false">⋮⋮</span>
      <label class="type-card-check">
        <input type="checkbox" data-field="enabled" ${selection.enabled ? 'checked' : ''} />
        <span class="type-card-titles">
          <span class="type-card-title-row">
            ${displayTitle ? `<strong>${escapeHtml(displayTitle)}</strong>` : ''}
            ${sectionLines || ''}
          </span>
          <span class="type-card-meta">${escapeHtml(metaBits.join(' · '))}</span>
        </span>
      </label>
      ${selection.enabled ? `<button type="button" class="type-expand-button" data-action="expand" title="调整题号与分值">${isExpanded ? '收起' : '调整'}</button>` : ''}
    </div>
    ${detailHtml}
  `;

  let dragFromHandle = false;
  const dragHandle = card.querySelector('.type-drag-handle');
  dragHandle?.addEventListener('mousedown', () => {
    dragFromHandle = true;
    const onUp = () => {
      window.removeEventListener('mouseup', onUp);
      setTimeout(() => {
        if (!card.classList.contains('dragging')) dragFromHandle = false;
      }, 0);
    };
    window.addEventListener('mouseup', onUp);
  });
  card.addEventListener('dragstart', (event) => {
    if (!dragFromHandle) {
      event.preventDefault();
      return;
    }
    typeDragId = selection.id;
    typeDropBeforeId = null;
    typeDropMajorKey = null;
    typeDropPlaceAfter = false;
    typeDropAppendToMajor = false;
    card.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    try { event.dataTransfer.setData('text/plain', selection.id); } catch (error) { /* ignore */ }
    requestAnimationFrame(() => card.classList.add('dragging-active'));
  });
  card.addEventListener('dragend', () => {
    dragFromHandle = false;
    typeDragId = null;
    typeDropBeforeId = null;
    typeDropMajorKey = null;
    typeDropPlaceAfter = false;
    typeDropAppendToMajor = false;
    card.classList.remove('dragging', 'dragging-active');
    clearTypeDropPreview();
  });
  card.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (!typeDragId || typeDragId === selection.id) return;
    showTypeDropPreview(card, event.clientX, event.clientY);
  });
  card.addEventListener('dragleave', (event) => {
    if (card.contains(event.relatedTarget)) return;
    card.classList.remove('drop-target');
  });
  card.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = typeDragId || event.dataTransfer.getData('text/plain');
    const beforeId = typeDropBeforeId;
    const majorKey = typeDropMajorKey;
    const appendToMajor = typeDropAppendToMajor;
    const placeAfter = typeDropPlaceAfter;
    clearTypeDropPreview();
    if (!sourceId) return;
    reorderTypeSelections(sourceId, beforeId, majorKey || '', { appendToMajor, placeAfter });
    typeDragId = null;
    typeDropBeforeId = null;
    typeDropMajorKey = null;
    typeDropPlaceAfter = false;
    typeDropAppendToMajor = false;
  });

  card.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
    removeTypeSelection(selection.id);
  });

  card.querySelector('[data-action="expand"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    typeExpandedId = typeExpandedId === selection.id ? null : selection.id;
    renderTypeGrid();
  });

  card.querySelector('[data-field="enabled"]')?.addEventListener('change', (event) => {
    selection.enabled = event.target.checked;
    autoChainQuestionNumbers({ silent: true });
    syncExamTotalScore();
  });

  card.querySelectorAll('[data-field]').forEach((input) => {
    if (input.dataset.field === 'enabled') return;
    const commitField = (rawValue, finalize) => {
      const field = input.dataset.field;
      if (field === 'repeat') {
        if (!finalize) return;
        const parsed = parseOptionalNumber(rawValue);
        const oldRepeat = Math.max(1, Number(selection.repeat) || 1);
        const newRepeat = clampNumber(parsed == null ? 1 : Math.floor(parsed), 1, 10, 1);
        const unitScore = (Number(selection.score) || 0) / oldRepeat;
        selection.repeat = newRepeat;
        selection.score = Math.round(unitScore * newRepeat * 2) / 2;
        input.value = String(selection.repeat);
        const scoreInput = card.querySelector('[data-field="score"]');
        if (scoreInput) scoreInput.value = String(selection.score);
        ensureRanges(selection);
        autoChainQuestionNumbers({ silent: true });
        syncExamTotalScore();
        return;
      }
      if (field === 'score') {
        const parsed = parseOptionalNumber(rawValue);
        if (parsed == null) {
          if (!finalize) return;
          selection.score = 0;
          input.value = '0';
        } else {
          selection.score = clampNumber(parsed, 0, 300, 0);
          if (finalize) input.value = String(selection.score);
        }
        syncExamTotalScore();
        const meta = card.querySelector('.type-card-meta');
        if (meta) meta.textContent = `${metaSubtitle} · ${formatRangesSummary(selection)} · ${selection.score} 分`;
        return;
      }
      if (field === 'attachMajorKey') {
        if (!rawValue) {
          selection.attachMajorKey = '';
          if (selection.type !== 'custom') {
            const homeDef = majorGroupTemplateForType(selection.type)?.parts.find((part) => part.type === selection.type);
            selection.sectionLabel = homeDef?.sectionLabel || selection.sectionLabel || '';
          }
        } else {
          attachSelectionToMajor(selection, rawValue);
        }
        autoChainQuestionNumbers({ silent: true });
        return;
      }
      if (field === 'sectionLabel') {
        selection.sectionLabel = rawValue.trim();
        const titleEl = card.querySelector('.type-card-titles strong');
        if (titleEl && (selection.attachMajorKey || selection.sectionLabel)) {
          titleEl.textContent = selection.sectionLabel || selection.customTitle || '自定义';
        }
        if (finalize) autoChainQuestionNumbers({ silent: true });
        return;
      }
      if (field === 'customTitle') {
        selection.customTitle = rawValue;
        const titleEl = card.querySelector('.type-card-titles strong');
        if (titleEl && !selection.attachMajorKey && !selection.sectionLabel) {
          titleEl.textContent = selection.customTitle || item.title;
        }
        const meta = card.querySelector('.type-card-meta');
        if (meta && selection.enabled) {
          meta.textContent = `${selection.customTitle || '自定义'} · ${formatRangesSummary(selection)} · ${selection.score} 分`;
        }
        if (finalize && selection.attachMajorKey) autoChainQuestionNumbers({ silent: true });
      }
    };
    input.addEventListener('input', (event) => {
      if (event.target.dataset.field === 'repeat') return;
      if (event.target.dataset.field === 'attachMajorKey') return;
      commitField(event.target.value, false);
    });
    input.addEventListener('change', (event) => commitField(event.target.value, true));
    input.addEventListener('blur', (event) => {
      if (event.target.dataset.field === 'attachMajorKey') return;
      commitField(event.target.value, true);
    });
  });

  card.querySelectorAll('[data-range-index]').forEach((input) => {
    const commitRange = (rawValue, finalize) => {
      const index = Number(input.dataset.rangeIndex);
      const field = input.dataset.rangeField;
      const range = selection.ranges[index];
      if (!range) return;
      const parsed = parseOptionalNumber(rawValue);
      const previousCount = Math.max(1, rangeCount(range));

      if (parsed == null) {
        if (!finalize) return;
        if (field === 'start') {
          range.start = 1;
          range.end = range.start + previousCount - 1;
        } else {
          range.end = Math.max(range.start, Number(range.start) || 1);
        }
        input.value = String(range[field]);
      } else {
        const value = clampNumber(Math.floor(parsed), 1, 200, 1);
        if (field === 'start') {
          range.start = value;
          range.end = value + previousCount - 1;
        } else {
          range.end = Math.max(value, Number(range.start) || 1);
        }
        if (finalize) input.value = String(range[field]);
      }

      selection.start = selection.ranges[0].start;
      selection.end = selection.ranges[0].end;

      if (!finalize) {
        const hint = card.querySelector('.type-range-hint');
        const meta = card.querySelector('.type-card-titles > span:last-child');
        const summary = formatRangesSummary(selection);
        if (hint) hint.textContent = `共 ${totalQuestionSpan(selection)} 题 · ${summary}`;
        if (meta) meta.textContent = `${item.subtitle} · ${summary} · ${selection.score} 分`;
        return;
      }

      chainQuestionNumbersAfter(selection.id, index);
      renderTypeGrid();
    };
    input.addEventListener('input', (event) => commitRange(event.target.value, false));
    input.addEventListener('change', (event) => commitRange(event.target.value, true));
    input.addEventListener('blur', (event) => commitRange(event.target.value, true));
  });

  return card;
}

function renderTypeGrid() {
  const grid = $('typeGrid');
  if (!grid) return;
  grid.innerHTML = '';
  grid.className = 'major-list';

  const groups = getSelectStepMajorGroups();
  let majorIndex = 0;
  groups.forEach((group) => {
    const hasEnabled = group.parts.some((part) => part.selection.enabled);
    if (hasEnabled) majorIndex += 1;
    const romanLabel = hasEnabled ? `${roman(majorIndex)}. ` : '';

    const block = document.createElement('section');
    block.className = `major-block ${hasEnabled ? 'enabled' : ''}`;
    block.dataset.majorKey = group.key;
    block.innerHTML = `
      <div class="major-block-header">
        <div class="major-block-title">${escapeHtml(romanLabel + group.title)}</div>
        <div class="major-block-meta">${escapeHtml(majorGroupReferenceMeta(group))}</div>
      </div>
      <div class="major-part-list"></div>
    `;
    const partList = block.querySelector('.major-part-list');
    group.parts.forEach((part) => {
      const already = [...partList.querySelectorAll('.type-card')].some((card) => card.dataset.id === part.selection.id);
      if (already) return;
      const card = buildTypeCardElement(part.selection, part.sectionDefs);
      if (card) partList.appendChild(card);
    });
    grid.appendChild(block);
  });

  renderAddBuiltinSelect();
  syncExamTotalScore();

  if (!grid.dataset.dropBound) {
    grid.dataset.dropBound = '1';
    grid.addEventListener('dragover', (event) => {
      if (!typeDragId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const card = event.target.closest('.type-card');
      const block = event.target.closest('.major-block');
      if (card && !card.classList.contains('dragging')) {
        showTypeDropPreview(card, event.clientX, event.clientY);
      } else if (block) {
        showTypeDropPreviewOnMajor(block, event.clientY);
      }
    });
    grid.addEventListener('drop', (event) => {
      event.preventDefault();
      const sourceId = typeDragId || event.dataTransfer.getData('text/plain');
      const beforeId = typeDropBeforeId;
      const majorKey = typeDropMajorKey;
      const appendToMajor = typeDropAppendToMajor;
      const placeAfter = typeDropPlaceAfter;
      clearTypeDropPreview();
      if (!sourceId) return;
      reorderTypeSelections(sourceId, beforeId, majorKey || '', { appendToMajor, placeAfter });
      typeDragId = null;
      typeDropBeforeId = null;
      typeDropMajorKey = null;
      typeDropPlaceAfter = false;
      typeDropAppendToMajor = false;
    });
  }
}

function renderAddBuiltinSelect() {
  const select = $('addBuiltinTypeSelect');
  if (!select) return;
  const present = new Set(state.typeSelections.map((item) => item.type));
  const missing = BUILTIN_TYPE_ORDER.filter((type) => !present.has(type));
  select.innerHTML = missing.length
    ? `<option value="">＋ 添加已删题型…</option>${missing.map((type) => {
      const item = libraryItem(type);
      return `<option value="${type}">${escapeHtml(item.title)}</option>`;
    }).join('')}`
    : '<option value="">题型已齐全</option>';
  select.disabled = missing.length === 0;
}

function renderSelectMeta() {
  syncExamTotalScore();
  if ($('selectExamTitle')) $('selectExamTitle').value = state.exam.title;
  if ($('selectExamYearMonth')) $('selectExamYearMonth').value = state.exam.yearMonth || '';
  if ($('selectExamDuration')) $('selectExamDuration').value = state.exam.duration;
  if ($('selectExamTotalScore')) $('selectExamTotalScore').value = state.exam.totalScore;
}

function selectCommonTypes() {
  const existing = new Map(state.typeSelections.filter((item) => item.type !== 'custom').map((item) => [item.type, item]));
  const customs = state.typeSelections.filter((item) => item.type === 'custom');
  const nextList = [];
  BUILTIN_TYPE_ORDER.forEach((type) => {
    if (existing.has(type)) {
      const item = existing.get(type);
      item.enabled = true;
      nextList.push(item);
    } else {
      nextList.push(createTypeSelection(type, { enabled: true }));
    }
  });
  state.typeSelections = [...nextList, ...customs];
  autoChainQuestionNumbers({ silent: true });
  showToast('已恢复常用题型');
}

function clearAllTypes() {
  state.typeSelections.forEach((item) => {
    item.enabled = false;
  });
  renderTypeGrid();
}

/* ========== 组卷编辑 ========== */

function renderSectionList() {
  const list = $('sectionList');
  if (!list) return;
  list.innerHTML = '';

  state.sections.forEach((section) => {
    const card = document.createElement('div');
    card.className = `section-card ${section.id === state.activeId ? 'active' : ''}`;
    card.dataset.id = section.id;
    const range = section.start === section.end || !section.end
      ? `${section.start || ''}`
      : `${section.start}–${section.end}`;
    const score = sectionScoreText(section);
    const metaParts = [
      section.subtitle || '',
      range ? `题号 ${range}` : '',
      score ? `${score} 分` : '',
    ].filter(Boolean);
    card.innerHTML = `<div class="section-card-title">${escapeHtml(sectionDisplayHeading(section))}</div><div class="section-card-meta">${escapeHtml(metaParts.join(' · '))}</div>`;

    card.addEventListener('click', () => {
      state.activeId = section.id;
      renderAll();
    });
    list.appendChild(card);
  });
}

function renderMeta() {
  if (!$('examTitle')) return;
  syncExamTotalScore();
  $('examTitle').value = state.exam.title;
  if ($('examYearMonth')) $('examYearMonth').value = state.exam.yearMonth || '';
  $('examDuration').value = state.exam.duration;
  $('examTotalScore').value = state.exam.totalScore;
  $('paperSize').value = state.exam.paperSize;
}

function renderStyles() {
  if (!$('fontFamily')) return;
  $('fontFamily').value = state.style.fontFamily;
  $('cjkFontFamily').value = state.style.cjkFontFamily;
  $('fontSize').value = state.style.fontSize;
  $('lineSpacing').value = state.style.lineSpacing;
  $('fixedLineHeight').value = state.style.fixedLineHeight;
  $('paragraphAfter').value = state.style.paragraphAfter;
  $('firstLineIndent').value = state.style.firstLineIndent;
  $('blankLength').value = state.style.blankLength;
  $('fixedLineHeightLabel').classList.toggle('hidden', state.style.lineSpacing !== 'fixed');
}

function renderEditor() {
  const section = activeSection();
  const heading = $('activeSectionHeading');
  const host = $('activeSectionEditor');
  if (!section) {
    heading.textContent = '请选择一个大题';
    host.className = 'active-editor-empty';
    host.textContent = '从左侧选择一个大题开始录入内容。';
    return;
  }

  heading.textContent = sectionDisplayHeading(section);
  host.className = 'active-editor';

  const vocabOptionsBlock = section.type === 'vocabulary'
    ? `<label class="vocab-options-field">选项词库（A–K）
        <textarea class="editor-textarea vocab-options-textarea" data-field="vocabOptions" placeholder="在此输入选词填空的 11 个选项，例如：&#10;A. ripe B. lengthy C. hit D. mark E. making F. engineer&#10;G. character H. exploding I. regardless J. desirous K. inspiration">${escapeHtml(section.vocabOptions || '')}</textarea>
        <span class="field-hint">预览/导出会自动排成上 6 下 5 的带框表格。</span>
      </label>`
    : '';

  const sentenceOptionsBlock = section.type === 'sectionC'
    ? `<label class="vocab-options-field">选项句库（A–F）
        <textarea class="editor-textarea vocab-options-textarea sentence-options-textarea" data-field="sentenceOptions" placeholder="在此输入六选四的 6 个句子，每行一句，例如：&#10;A. Young himself maintains 35 feeders...&#10;B. Attracting birds starts with the right setup.&#10;C. ...&#10;D. ...&#10;E. ...&#10;F. ...">${escapeHtml(section.sentenceOptions || '')}</textarea>
        <span class="field-hint">预览/导出会排成带外框的 A–F 选项框（每行一句）。</span>
      </label>`
    : '';

  const contentPlaceholder = section.type === 'vocabulary'
    ? '粘贴 Vocabulary 正文（不含上方 A–K 选项）。'
    : section.type === 'sectionC'
      ? '粘贴六选四正文（不含上方 A–F 选项句）。'
      : '粘贴这一部分的题目内容。';

  host.innerHTML = `
    ${vocabOptionsBlock}
    ${sentenceOptionsBlock}
    <label>题目内容<textarea class="editor-textarea" data-field="content" placeholder="${contentPlaceholder}">${escapeHtml(section.content || '')}</textarea></label>
    <label>参考答案<textarea class="editor-textarea answer-textarea" data-field="answer" placeholder="${escapeAttr(answerPlaceholderFor(section))}">${escapeHtml(section.answer || '')}</textarea></label>
    ${section.type === 'listening' ? `<label class="listening-script-field">听力原文<textarea class="editor-textarea listening-script-textarea" data-field="listeningScript" placeholder="粘贴 ${escapeAttr(section.sectionLabel || '本部分')} 听力原文，将出现在答案纸末尾。">${escapeHtml(section.listeningScript || '')}</textarea></label>` : ''}
    <div class="answer-hint">答案归入「${escapeHtml(answerGroupTitle(section))}」；右侧可切换「试卷纸 / 答案纸」预览。${section.type === 'listening' ? '听力原文汇总在答案纸最后（先 Section A，后 Section B）。' : ''}</div>
  `;

  host.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', (event) => updateSectionField(section, event.target.dataset.field, event.target.value));
  });
}

function updateSectionField(section, field, value) {
  section[field] = value;
  markDirty();
  if (field === 'content' || field === 'answer' || field === 'vocabOptions' || field === 'sentenceOptions' || field === 'listeningScript') renderPreview();
}

function answerGroupKey(section) {
  return ANSWER_GROUP_TITLES[section.type] ? section.type : 'custom';
}

function answerGroupTitle(section) {
  if (ANSWER_GROUP_TITLES[section.type]) return ANSWER_GROUP_TITLES[section.type];
  return section.majorTitle || section.title || 'Custom';
}

function answerPlaceholderFor(section) {
  if (section?.type === 'summary' || section?.type === 'writing') return '粘贴参考答案或范文。';
  if (section?.type === 'translation') return '粘贴各题参考译文，题号会自动重排。';
  if (section?.type === 'grammar') return '粘贴各题答案，题号会自动重排。';
  if (isLetterAnswerSection(section)) return '粘贴选项字母即可，题号会自动重排。';
  return '粘贴这一部分的答案。';
}

function answerSectionLabel(section) {
  if (section.type === 'listening' && section.sectionLabel) {
    return section.sectionLabel;
  }
  if (section.partLabel) return section.partLabel.replace(/[()]/g, '');
  if (section.type === 'summary') {
    const start = Number(section.start) || '';
    return start ? `${start}. Summary Writing` : 'Summary Writing';
  }
  if (section.type === 'writing') {
    const start = Number(section.start) || '';
    return start ? `${start}. Guided Writing` : 'Guided Writing';
  }
  if (section.type === 'translation') {
    const score = sectionScoreText(section);
    return score ? `Translation（${score}分）` : 'Translation';
  }
  return section.partLabel || '';
}

function shouldShowSectionHeading(section) {
  return section.type !== 'readingB' && section.type !== 'readingC';
}

function paperSectionGroupKey(section) {
  if (section?.sectionLabel) return `${section.major || ''}|${section.sectionLabel}`;
  return `${section.major || ''}|__id_${section.id || ''}`;
}

/** 同一 Section 只出一次标题/Directions；多套题才显示 (A)(B) */
function resolvePaperSectionChrome(sections) {
  const list = sections || [];
  const groups = new Map();
  list.forEach((section, index) => {
    const key = paperSectionGroupKey(section);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });
  return list.map((section, index) => {
    const members = groups.get(paperSectionGroupKey(section)) || [index];
    const isFirst = members[0] === index;
    const multi = members.length > 1;
    const instructionSource = members.map((i) => list[i]).find((item) => item?.instruction);
    const heading = sectionHeadingText(section);
    return {
      showSectionHeading: isFirst && Boolean(heading),
      sectionHeading: heading,
      showInstruction: isFirst && Boolean(instructionSource?.instruction),
      instruction: instructionSource?.instruction || '',
      showPartLabel: Boolean(section.partLabel) && multi,
      showReadingPartLabel: Boolean(section.readingPartLabel),
    };
  });
}

function formatInstructionMarkup(text) {
  return `<em class="direction-text">${formatRichTextMarkup(text || '')}</em>`;
}

/* ========== 内容规范化 ========== */

function blankUnderline() {
  return '_'.repeat(Number(state.style.blankLength) || DEFAULT_BLANK_LENGTH);
}

/** 六选四空后加英文句号；其他题型不加 */
function formatBlankSlot(number, section) {
  const core = `(${number}) ${blankUnderline()}`;
  return section?.type === 'sectionC' ? `${core}.` : core;
}

function sectionNumberRange(section) {
  const start = Math.max(1, Number(section?.start) || 1);
  const end = Math.max(start, Number(section?.end) || start + Math.max(0, (Number(section?.count) || 1) - 1));
  return { start, end };
}

function isInSectionRange(number, section) {
  const { start, end } = sectionNumberRange(section);
  return Number.isFinite(number) && number >= start && number <= end;
}

/** 空位下划线：ASCII _、全角 ＿，以及 Word 里常见的横线符 */
const BLANK_LINE_CHARS = '_\uFF3F\u2013\u2014\u2500';

/** 完形：选项行开始处切开，避免把 21. A. 里的题号当成文中空 */
function splitPassageAndChoiceLines(text) {
  const lines = String(text || '').split('\n');
  const choiceStart = lines.findIndex((line) => /^\d+\s*[.．、)）]\s*[A-D]\s*[.．、)）]/i.test(String(line || '').trim()));
  if (choiceStart < 0) return { passage: String(text || ''), choices: '' };
  return {
    passage: lines.slice(0, choiceStart).join('\n'),
    choices: lines.slice(choiceStart).join('\n'),
  };
}

/**
 * 把文中的「空位题号」改成与大题题号一致，统一输出 (N) __________：
 * - 识别输入 ____41____ / ____41 ____ / ___ 41 ___（下划线包住序号）
 * - 识别 (41)___ / (41)
 * - 完形正文粘贴丢线后的裸序号：honey 41 .
 * - 按出现顺序重排为 start…end；四位数字当年份保留
 */
function normalizePassageBlanks(text, section) {
  const { start, end } = sectionNumberRange(section);
  let next = start;
  const tokens = [];
  const protect = (replacement) => {
    const token = `\uE000${tokens.length}\uE001`;
    tokens.push(replacement);
    return token;
  };
  const takeNext = () => {
    if (next > end) return null;
    return formatBlankSlot(next++, section);
  };
  const isYearLike = (num) => String(num).length >= 4;
  const blankClass = `[${BLANK_LINE_CHARS}]`;

  const replaceMarkedBlanks = (chunk) => {
    let value = String(chunk || '');
    // 1) ____41____ / ____ 41 ____ / ____41 ____
    // 2) ___(41)___ / ___(41)
    // 3) (41)___ / (41)
    const markedPattern = new RegExp(
      [
        `${blankClass}{2,}\\s*(\\d{1,3})\\s*${blankClass}{2,}`,
        `${blankClass}+\\s*[（(]\\s*(\\d{1,3})\\s*[）)]\\s*${blankClass}*`,
        `[（(]\\s*(\\d{1,3})\\s*[）)](?:\\s*${blankClass}+)?`,
      ].join('|'),
      'g',
    );
    value = value.replace(markedPattern, (match, a, b, c) => {
      const num = Number(a || b || c);
      if (!Number.isFinite(num) || isYearLike(num)) return protect(match);
      const replacement = takeNext();
      return protect(replacement || match);
    });
    return value;
  };

  const replaceBareClozeNumbers = (chunk) => String(chunk || '').replace(
    /(^|[^A-Za-z0-9\uE000-\uE001.])(\d{1,3})(?=\s*[.．,，;；!！?？)）]|\s+[A-Za-z(“"‘'])/g,
    (match, lead, digits) => {
      const num = Number(digits);
      if (!Number.isFinite(num) || isYearLike(num)) return match;
      const replacement = takeNext();
      if (!replacement) return match;
      return `${lead}${protect(replacement)}`;
    },
  );

  const replaceBareUnderlines = (chunk) => {
    const bareBlankPattern = new RegExp(`${blankClass}{3,}`, 'g');
    return String(chunk || '').replace(bareBlankPattern, (match) => {
      const replacement = takeNext();
      return replacement ? protect(replacement) : match;
    });
  };

  const restore = (chunk) => String(chunk || '').replace(/\uE000(\d+)\uE001/g, (_, index) => tokens[Number(index)]);

  const isClozeLike = section?.type === 'cloze' || section?.type === 'vocabulary';
  if (isClozeLike) {
    const { passage, choices } = splitPassageAndChoiceLines(text);
    let body = replaceMarkedBlanks(passage);
    if (section?.type === 'cloze') body = replaceBareClozeNumbers(body);
    body = replaceBareUnderlines(body);
    return choices ? `${restore(body)}\n${choices}` : restore(body);
  }

  return restore(replaceMarkedBlanks(text));
}

function isReadingSection(section) {
  return ['readingA', 'readingB', 'readingC'].includes(section?.type);
}

function normalizeContent(text, section, assignMissing = true) {
  if (section?.type === 'cloze' || section?.type === 'vocabulary') {
    return normalizePassageBlanks(text, section);
  }

  // Reading 题干里的横线（如 about _________）保持原样，不加 (题号)
  if (isReadingSection(section)) {
    return String(text || '');
  }

  const { start, end } = sectionNumberRange(section);
  let nextBlank = start;
  const lines = String(text || '').split('\n');
  const output = lines.map((line) => {
    let current = line;
    const protectedBlanks = [];
    const protectBlank = (value) => {
      const token = `\uE000${protectedBlanks.length}\uE001`;
      protectedBlanks.push(value);
      return token;
    };
    const takeBlank = () => {
      if (nextBlank > end) return null;
      return formatBlankSlot(nextBlank++, section);
    };

    current = current.replace(/_+\s*(\d+)\s*_+\.?/g, (match, number) => {
      if (String(number).length >= 4) return match;
      const replacement = takeBlank();
      return replacement ? protectBlank(replacement) : match;
    });
    current = current.replace(/_+\s*[（(]\s*(\d+)\s*[）)]\s*_+\.?/g, (match, number) => {
      if (String(number).length >= 4) return match;
      const replacement = takeBlank();
      return replacement ? protectBlank(replacement) : match;
    });
    current = current.replace(/[（(]\s*(\d+)\s*[）)]\s*_{3,}\.?/g, (match, number) => {
      if (String(number).length >= 4) return match;
      const replacement = takeBlank();
      return replacement ? protectBlank(replacement) : match;
    });
    if (assignMissing && (section?.type === 'grammar' || section?.type === 'sectionC')) {
      current = current.replace(/_+\s*(\d{1,3})\s*_+/g, (match, number) => {
        if (String(number).length >= 4) return match;
        const replacement = takeBlank();
        return replacement ? protectBlank(replacement) : match;
      });
      current = current.replace(/_{3,}\.?/g, (match) => {
        const replacement = takeBlank();
        return replacement ? protectBlank(replacement) : match;
      });
    }
    current = current.replace(/\uE000(\d+)\uE001/g, (_, index) => protectedBlanks[Number(index)]);
    return current;
  });
  return output.join('\n');
}

function isWritingPromptSection(section) {
  return section?.type === 'writing' || section?.type === 'summary';
}

function isQuestionStartLine(line) {
  return /^\s*\d+\s*[.．、)）]/.test(String(line || '').trim());
}

function isOptionContinuationLine(line) {
  const trimmed = String(line || '').trim();
  return /^[A-D]\s*[.．、)）]/i.test(trimmed) && !isQuestionStartLine(trimmed);
}

function parseChoicesFromText(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  // 允许 A.word / A. word 两种写法
  const markerPattern = /(^|\s)([A-D])\s*[.．、)）]\s*/gi;
  const markers = [...value.matchAll(markerPattern)];
  if (markers.length < 2) return null;
  const options = markers.map((marker, index) => {
    const textStart = marker.index + marker[0].length;
    const textEnd = index + 1 < markers.length ? markers[index + 1].index : value.length;
    return { label: marker[2].toUpperCase(), text: value.slice(textStart, textEnd).trim() };
  });
  const labels = options.map((option) => option.label);
  if (options.length === 4 && labels.join('') !== 'ABCD') return null;
  const stem = value.slice(0, markers[0].index).replace(/^\d+\s*[.．、)）]\s*/, '').trim();
  return { stem, options };
}

function shouldForceRow4(section, options) {
  // 完形为省空间：四个选项固定一行
  return section?.type === 'cloze' && options?.length === 4;
}

function choiceLayoutTier(options) {
  const list = (options || []).filter(Boolean);
  if (list.length <= 1) return 'stack4';
  const longest = Math.max(...list.map((option) => String(option.text || '').length));
  const total = list.reduce((sum, option) => sum + String(option.text || '').length, 0);
  if (list.length === 4) {
    // 短选项：ABCD 一行；中等：AB / CD；长句：各占一行
    if (longest <= 18 && total <= 60) return 'row4';
    if (longest <= 42 && total <= 150) return 'grid2x2';
    return 'stack4';
  }
  if (list.length === 3 && longest <= 22 && total <= 60) return 'row4';
  if (list.length === 2 && longest <= 36 && total <= 70) return 'grid2x2';
  return 'stack4';
}

function prepareContentBlocks(text, section) {
  const lines = String(text || '').split('\n');
  const rawBlocks = [];
  let current = [];

  const flushText = () => {
    if (!current.length) return;
    rawBlocks.push({ kind: 'text', lines: [...current] });
    current = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushText();
      rawBlocks.push({ kind: 'blank' });
      return;
    }
    if (isListeningGroupHeading(trimmed, section)) {
      flushText();
      rawBlocks.push({ kind: 'heading', text: trimmed });
      return;
    }
    // 大作文/概要里的 1. 2. 3. 是写作要求序号，不当作试卷题号
    if (isQuestionStartLine(trimmed) && !isWritingPromptSection(section)) {
      flushText();
      current = [trimmed];
      return;
    }
    if (isOptionContinuationLine(trimmed) && current.length) {
      current.push(trimmed);
      return;
    }
    flushText();
    rawBlocks.push({ kind: 'text', lines: [trimmed] });
  });
  flushText();

  let questionNumber = Math.max(1, Number(section.start) || 1);
  const blocks = [];
  let firstContent = true;

  rawBlocks.forEach((raw) => {
    if (raw.kind === 'blank') {
      blocks.push({ type: 'blank' });
      return;
    }
    if (raw.kind === 'heading') {
      blocks.push({ type: 'listening-heading', text: raw.text });
      firstContent = false;
      return;
    }

    const merged = raw.lines.join(' ').replace(/\s+/g, ' ').trim();
    const parsed = !isWritingPromptSection(section) ? parseChoicesFromText(merged) : null;
    if (parsed && parsed.options.length >= 2) {
      blocks.push({
        type: 'question-choices',
        number: questionNumber,
        stem: parsed.stem,
        options: parsed.options,
        layout: shouldForceRow4(section, parsed.options) ? 'row4' : choiceLayoutTier(parsed.options),
      });
      questionNumber += 1;
      firstContent = false;
      return;
    }

    if (isQuestionStartLine(merged) && !isWritingPromptSection(section)) {
      blocks.push({
        type: 'question-stem',
        number: questionNumber,
        text: merged.replace(/^\d+\s*[.．、)）]\s*/, ''),
      });
      questionNumber += 1;
      firstContent = false;
      return;
    }

    const bulletText = parseBulletLine(merged);
    if (bulletText) {
      blocks.push({ type: 'bullet', text: bulletText });
      firstContent = false;
      return;
    }

    if (firstContent && isLikelyContentTitle(merged)) {
      blocks.push({ type: 'content-title', text: merged });
      firstContent = false;
      return;
    }

    firstContent = false;
    blocks.push({ type: 'paragraph', text: merged });
  });

  return blocks;
}

function blocksToPlainText(blocks) {
  const indent = '   ';
  return blocks.map((block) => {
    switch (block.type) {
      case 'blank':
        return '';
      case 'listening-heading':
      case 'content-title':
      case 'paragraph':
        return block.text;
      case 'bullet':
        return `• ${block.text}`;
      case 'question-stem':
        return `${block.number}. ${block.text}`;
      case 'question-choices': {
        const fmt = (option) => `${option?.label || '?'}. ${option?.text || ''}`;
        const options = (block.options || []).filter(Boolean);
        if (!options.length) return `${block.number}.`;
        if (block.layout === 'row4' && options.length >= 3) {
          return `${block.number}. ${options.map(fmt).join(' ')}`;
        }
        if (block.layout === 'grid2x2' && options.length >= 2) {
          const rows = [];
          for (let i = 0; i < options.length; i += 2) {
            const left = fmt(options[i]);
            const right = options[i + 1] ? ` ${fmt(options[i + 1])}` : '';
            rows.push(i === 0 ? `${block.number}. ${left}${right}` : `${indent}${left}${right}`);
          }
          return rows.join('\n');
        }
        return [
          `${block.number}. ${fmt(options[0])}`,
          ...options.slice(1).map((option) => `${indent}${fmt(option)}`),
        ].join('\n');
      }
      default:
        return '';
    }
  }).join('\n');
}

function isListeningGroupHeading(line, section) {
  return section?.type === 'listening' && LISTENING_GROUP_PATTERN.test(String(line || ''));
}

function splitListeningGroupSegments(line) {
  const pattern = /Questions?\s+\d+\s*(?:through|to|-|–|—)\s*\d+\s+are\s+based\s+on\s+the\s+following\s+(?:longer\s+)?(?:passage|conversation)\.?/gi;
  const segments = [];
  let cursor = 0;
  let match;
  while ((match = pattern.exec(line))) {
    if (match.index > cursor) segments.push(line.slice(cursor, match.index).trim());
    segments.push(match[0].trim());
    cursor = match.index + match[0].length;
  }
  if (!segments.length) return [line];
  if (cursor < line.length && line.slice(cursor).trim()) segments.push(line.slice(cursor).trim());
  return segments;
}

function prepareSectionContent(text, section) {
  const value = String(text || '');
  if (section?.type !== 'listening') return value;
  return value.split('\n').flatMap((line) => splitListeningGroupSegments(line)).join('\n');
}

function renumberSectionQuestions(text, section, start) {
  const value = String(text || '');
  const { end } = sectionNumberRange({ ...section, start });
  const mainQuestionPattern = /^(\s*)(\d+)\s*[.．、)）]\s*/;
  const lines = value.split('\n');
  const hasQuestionLines = lines.some((line) => mainQuestionPattern.test(line));

  if (!hasQuestionLines) {
    let nextBlank = start;
    const blankClass = `[${BLANK_LINE_CHARS}]`;
    // 此处仍要求至少一条下划线；vocabulary/cloze 的裸 (N) 已在 normalizePassageBlanks 处理
    const blankPattern = new RegExp(`[（(]\\s*(\\d+)\\s*[）)]\\s*${blankClass}+\\.?`, 'g');
    return value.replace(blankPattern, (match, number) => {
      if (String(number).length >= 4) return match;
      if (nextBlank > end) return match;
      return formatBlankSlot(nextBlank++, section);
    });
  }

  let next = start;
  return lines.map((line) => {
    const match = line.match(mainQuestionPattern);
    if (!match) return line;
    const original = Number(match[2]);
    const looksLikeMcq = /(?:^|\s)[A-D]\s*[.．、)）]/i.test(line.slice(match[0].length));
    // 四位年份行、非选择题且明显不像本题题号：保留
    if (String(original).length >= 4) return line;
    if (!looksLikeMcq && !isInSectionRange(original, { start, end }) && original > end + 20) return line;
    if (next > end) return line;
    const assigned = next++;
    return line.replace(mainQuestionPattern, `$1${assigned}. `);
  }).join('\n');
}

function normalizeInlineNumericBlanks(text, section) {
  // 不再把正文里「数字 + 英文词」误当成空；空位只走 normalizePassageBlanks
  return String(text || '');
}

function getPreparedSections() {
  return state.sections.filter((section) => section.enabled !== false).map((section) => {
    const start = Math.max(1, Number(section.start) || 1);
    const end = Math.max(start, Number(section.end) || start + Math.max(0, (Number(section.count) || 1) - 1));
    const count = end - start + 1;
    const numberedSection = { ...section, start, end, count };
    const normalized = normalizeContent(section.content || '', numberedSection, true);
    const withInlineBlanks = normalizeInlineNumericBlanks(normalized, numberedSection);
    const numbered = isWritingPromptSection(numberedSection)
      ? withInlineBlanks
      : renumberSectionQuestions(withInlineBlanks, numberedSection, start);
    let preparedText = prepareSectionContent(numbered, numberedSection);
    let sentenceOptions = section.sentenceOptions || '';
    if (section.type === 'sectionC') {
      const bank = resolveSentenceBank(section, preparedText);
      if (bank) {
        preparedText = bank.remainder;
        if (!String(sentenceOptions).trim()) {
          sentenceOptions = bank.options.map((option) => `${option.label}. ${option.text}`).join('\n');
        }
      }
    }
    const contentBlocks = prepareContentBlocks(preparedText, numberedSection);
    const content = blocksToPlainText(contentBlocks);
    return {
      section: { ...section, start, end, count, sentenceOptions },
      start,
      content,
      contentBlocks,
    };
  });
}


function parseBulletLine(line) {
  const value = String(line || '').trim();
  if (!value) return null;
  let match = value.match(/^[•●▪◦·‧∙・〇○◆◇►▶❑☐]\s*(.+)$/u);
  if (match) return match[1].trim() || null;
  match = value.match(/^[-–—*＊]\s+(.+)$/u);
  if (match) return match[1].trim() || null;
  return null;
}

function isLikelyContentTitle(line) {
  const value = String(line || '').trim();
  if (!value || value.length > 120) return false;
  if (parseBulletLine(value)) return false;
  if (/^(?:Questions?|Directions:|Words?:)\b/i.test(value)) return false;
  if (/^\d+\s*[.．、)）]/.test(value) || /^[A-D]\s*[.．、)）]\s+/i.test(value)) return false;
  if (/[.!]$/.test(value)) return false;
  return true;
}

function extractVocabularyOptions(text) {
  const source = String(text || '').trim();
  if (!source) return null;
  const markerPattern = /(^|[^A-Za-z])([A-K])\s*[.．、)）]\s*/gi;
  const markers = [...source.matchAll(markerPattern)];
  if (!markers.length) return null;
  const options = [];
  markers.forEach((marker, index) => {
    const label = marker[2].toUpperCase();
    const textStart = marker.index + marker[0].length;
    const rawEnd = index + 1 < markers.length ? markers[index + 1].index : source.length;
    const word = source.slice(textStart, rawEnd).trim().replace(/[，,；;]+$/u, '').trim();
    if (!options.some((option) => option.label === label)) {
      options.push({ label, word });
    }
  });
  const byLabel = Object.fromEntries(options.map((option) => [option.label, option]));
  if ([...'ABCDEFGHIJK'].some((label) => !byLabel[label])) return null;

  const first = markers[0];
  const last = markers[markers.length - 1];
  const lastOption = byLabel[last[2].toUpperCase()];
  const lastWordStart = last.index + last[0].length;
  const lastWordPos = source.indexOf(lastOption.word, lastWordStart);
  const bankEnd = lastWordPos >= 0 ? lastWordPos + lastOption.word.length : lastWordStart;
  const before = source.slice(0, first.index).trim();
  const after = source.slice(bankEnd).trim();
  return {
    options: [...'ABCDEFGHIJK'].map((label) => byLabel[label]),
    remainder: [before, after].filter(Boolean).join('\n'),
  };
}

function resolveVocabularyBank(section, contentText) {
  const fromField = extractVocabularyOptions(section?.vocabOptions || '');
  if (fromField) return { options: fromField.options, remainder: String(contentText || '') };
  const fromContent = extractVocabularyOptions(contentText || '');
  if (fromContent) return fromContent;
  return null;
}

function vocabularyOptionText(option) {
  if (!option?.word) return '';
  return `${option.label}. ${option.word}`;
}

/** 按上下两行同列的最长词分配列宽，短词列收窄，保证两行内尽量不换行 */
function vocabularyColumnPercents(options) {
  const cells = [...(options || []), { label: '', word: '' }];
  while (cells.length < 12) cells.push({ label: '', word: '' });
  const weights = [];
  for (let col = 0; col < 6; col += 1) {
    const top = vocabularyOptionText(cells[col]).length;
    const bottom = vocabularyOptionText(cells[col + 6]).length;
    weights.push(Math.max(top, bottom, 3));
  }
  const minShare = 0.55; // 相对最短列的下限，避免过窄
  const minWeight = Math.min(...weights);
  const boosted = weights.map((w) => Math.max(w, minWeight * minShare + w * (1 - minShare)));
  const sum = boosted.reduce((total, w) => total + w, 0) || 1;
  const raw = boosted.map((w) => (w / sum) * 100);
  // 归一到 100，保留一位小数
  const rounded = raw.map((p) => Math.round(p * 10) / 10);
  const drift = 100 - rounded.reduce((total, p) => total + p, 0);
  rounded[rounded.length - 1] = Math.round((rounded[rounded.length - 1] + drift) * 10) / 10;
  return rounded;
}

function formatVocabularyTableMarkup(options) {
  const list = [...(options || [])];
  while (list.length < 11) list.push({ label: '', word: '' });
  const cells = [...list.slice(0, 11), { label: '', word: '' }];
  const widths = vocabularyColumnPercents(cells);
  const cellHtml = cells.map((option, index) => {
    const width = widths[index % 6];
    if (!option?.word) {
      return `<td class="vocabulary-option-cell vocabulary-option-cell-empty" style="width:${width}%"></td>`;
    }
    return `<td class="vocabulary-option-cell" style="width:${width}%">${formatInlineText(vocabularyOptionText(option))}</td>`;
  });
  const colgroup = `<colgroup>${widths.map((width) => `<col style="width:${width}%" />`).join('')}</colgroup>`;
  return `<table class="vocabulary-option-table">${colgroup}<tbody><tr>${cellHtml.slice(0, 6).join('')}</tr><tr>${cellHtml.slice(6, 12).join('')}</tr></tbody></table>`;
}

function formatVocabularyContent(text, section) {
  const parsed = resolveVocabularyBank(section, text);
  if (!parsed) return formatPreviewContent(text, section);
  return `${formatVocabularyTableMarkup(parsed.options)}${formatPreviewContent(parsed.remainder, section)}`;
}

function extractSentenceOptions(text) {
  const source = String(text || '').trim();
  if (!source) return null;

  const lines = source.split(/\n/);
  const byLabel = {};
  const bankIndexes = [];
  lines.forEach((line, index) => {
    const match = String(line || '').trim().match(/^([A-F])\s*[.．、)）]\s*(.+)$/i);
    if (!match) return;
    const label = match[1].toUpperCase();
    if (byLabel[label]) return;
    byLabel[label] = { label, text: match[2].trim() };
    bankIndexes.push(index);
  });

  if ([...'ABCDEF'].every((label) => byLabel[label])) {
    const min = Math.min(...bankIndexes);
    const max = Math.max(...bankIndexes);
    const remainder = [...lines.slice(0, min), ...lines.slice(max + 1)].join('\n').trim();
    return {
      options: [...'ABCDEF'].map((label) => byLabel[label]),
      remainder,
    };
  }

  const markerPattern = /(^|[^A-Za-z])([A-F])\s*[.．、)）]\s*/gi;
  const markers = [...source.matchAll(markerPattern)];
  if (!markers.length) return null;
  const options = [];
  markers.forEach((marker, index) => {
    const label = marker[2].toUpperCase();
    const textStart = marker.index + marker[0].length;
    const rawEnd = index + 1 < markers.length ? markers[index + 1].index : source.length;
    const sentence = source.slice(textStart, rawEnd).trim().replace(/[；;]+$/u, '').trim();
    if (!options.some((option) => option.label === label)) {
      options.push({ label, text: sentence });
    }
  });
  const byMarker = Object.fromEntries(options.map((option) => [option.label, option]));
  if ([...'ABCDEF'].some((label) => !byMarker[label])) return null;

  const first = markers[0];
  const last = markers[markers.length - 1];
  const lastOption = byMarker[last[2].toUpperCase()];
  const lastTextStart = last.index + last[0].length;
  const lastTextPos = source.indexOf(lastOption.text, lastTextStart);
  const bankEnd = lastTextPos >= 0 ? lastTextPos + lastOption.text.length : lastTextStart;
  const before = source.slice(0, first.index).trim();
  const after = source.slice(bankEnd).trim();
  return {
    options: [...'ABCDEF'].map((label) => byMarker[label]),
    remainder: [before, after].filter(Boolean).join('\n'),
  };
}

function resolveSentenceBank(section, contentText) {
  const fromField = extractSentenceOptions(section?.sentenceOptions || '');
  if (fromField) return { options: fromField.options, remainder: String(contentText || '') };
  const fromContent = extractSentenceOptions(contentText || '');
  if (fromContent) return fromContent;
  return null;
}

function formatSentenceBankMarkup(options) {
  const rows = (options || []).map((option) => (
    `<tr><td class="sentence-option-cell">${formatInlineText(`${option.label}. ${option.text || ''}`)}</td></tr>`
  )).join('');
  return `<table class="sentence-option-table"><tbody>${rows}</tbody></table>`;
}

function formatSectionCContent(contentBlocks, section, content) {
  const bank = resolveSentenceBank(section, content || '');
  const table = bank ? formatSentenceBankMarkup(bank.options) : '';
  return `${table}${formatPreviewBlocks(contentBlocks || [], section)}`;
}

/* ========== 预览 ========== */

const PREVIEW_PAGE_FOOTER_RESERVE_PX = 26;

function applyPreviewTypography(target) {
  if (!target) return;
  const line = state.style.lineSpacing === 'fixed' ? `${state.style.fixedLineHeight}px` : state.style.lineSpacing;
  target.style.setProperty('--preview-size', `${state.style.fontSize}pt`);
  target.style.setProperty('--preview-line', line);
  target.style.setProperty('--preview-after', `${state.style.paragraphAfter}pt`);
  target.style.setProperty('--preview-indent', `${Number(state.style.firstLineIndent) || 0}em`);
  target.style.fontFamily = `"${state.style.fontFamily}", "${state.style.cjkFontFamily}", "Songti SC", serif`;
}

function getPreviewMeasureElement() {
  let measure = document.getElementById('previewMeasure');
  if (!measure) {
    measure = document.createElement('div');
    measure.id = 'previewMeasure';
    measure.className = 'preview-measure preview-pages';
    document.body.appendChild(measure);
  }
  return measure;
}

function getPreviewPageBodyHeightPx() {
  const probe = document.createElement('div');
  probe.className = 'preview-page';
  probe.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;';
  const body = document.createElement('div');
  body.className = 'preview-page-body';
  const footer = document.createElement('div');
  footer.className = 'preview-page-footer';
  footer.textContent = '第 1 页 / 共 1 页';
  probe.appendChild(body);
  probe.appendChild(footer);
  document.body.appendChild(probe);
  const height = Math.max(120, body.clientHeight - PREVIEW_PAGE_FOOTER_RESERVE_PX);
  document.body.removeChild(probe);
  return height;
}

function extractPreviewUnits(measureRoot) {
  const units = [];
  [...measureRoot.children].forEach((child) => {
    if (child.classList.contains('preview-section')) {
      [...child.children].forEach((sectionChild) => {
        if (sectionChild.classList.contains('preview-content')) {
          const contentChildren = [...sectionChild.children];
          if (!contentChildren.length) {
            units.push({ node: sectionChild, kind: 'block' });
            return;
          }
          contentChildren.forEach((contentChild) => {
            units.push({ node: contentChild, kind: 'content' });
          });
        } else {
          units.push({ node: sectionChild, kind: 'block' });
        }
      });
      return;
    }
    if (child.classList.contains('preview-answer-block')) {
      [...child.children].forEach((answerChild) => {
        units.push({ node: answerChild, kind: 'answer' });
      });
      return;
    }
    units.push({ node: child, kind: 'block' });
  });
  return units;
}

function previewUnitHeight(element) {
  const style = window.getComputedStyle(element);
  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  return Math.max(1, element.offsetHeight + marginTop + marginBottom);
}

function paginatePreview(host, html, { isAnswer = false } = {}) {
  host.className = `preview-pages${isAnswer ? ' is-answer' : ''}`;
  applyPreviewTypography(host);

  const measure = getPreviewMeasureElement();
  measure.className = `preview-measure preview-pages${isAnswer ? ' is-answer' : ''}`;
  applyPreviewTypography(measure);
  measure.innerHTML = html;

  const units = extractPreviewUnits(measure);
  const pageBodyHeight = getPreviewPageBodyHeightPx();
  const fragment = document.createDocumentFragment();
  const pages = [];
  let currentBody = null;
  let currentContentHost = null;
  let currentAnswerHost = null;
  let usedHeight = 0;

  const startPage = () => {
    const page = document.createElement('div');
    page.className = 'preview-page';
    const body = document.createElement('div');
    body.className = 'preview-page-body';
    const footer = document.createElement('div');
    footer.className = 'preview-page-footer';
    page.appendChild(body);
    page.appendChild(footer);
    fragment.appendChild(page);
    pages.push({ page, body, footer });
    currentBody = body;
    currentContentHost = null;
    currentAnswerHost = null;
    usedHeight = 0;
    return body;
  };

  const appendUnit = (unit) => {
    const clone = unit.node.cloneNode(true);
    if (unit.kind === 'content') {
      if (!currentContentHost) {
        currentContentHost = document.createElement('div');
        currentContentHost.className = 'preview-content';
        currentBody.appendChild(currentContentHost);
      }
      currentContentHost.appendChild(clone);
      currentAnswerHost = null;
      return;
    }
    if (unit.kind === 'answer') {
      if (!currentAnswerHost) {
        currentAnswerHost = document.createElement('div');
        currentAnswerHost.className = 'preview-answer-block';
        currentBody.appendChild(currentAnswerHost);
      }
      currentAnswerHost.appendChild(clone);
      currentContentHost = null;
      return;
    }
    currentBody.appendChild(clone);
    currentContentHost = null;
    currentAnswerHost = null;
  };

  startPage();
  units.forEach((unit) => {
    const height = previewUnitHeight(unit.node);
    if (usedHeight > 0 && usedHeight + height > pageBodyHeight) {
      startPage();
    }
    appendUnit(unit);
    usedHeight += height;
  });

  const total = Math.max(1, pages.length);
  pages.forEach((entry, index) => {
    entry.footer.textContent = `第 ${index + 1} 页 / 共 ${total} 页`;
  });

  host.innerHTML = '';
  host.appendChild(fragment);
  measure.innerHTML = '';
  return total;
}

function buildPaperPreviewHtml() {
  let html = `<h1>${escapeHtml(state.exam.title)}</h1><div class="preview-meta"><span class="preview-meta-main">（满分：${escapeHtml(String(state.exam.totalScore))} 分　时间：${escapeHtml(state.exam.duration)}）</span>${state.exam.yearMonth ? `<span class="preview-exam-date">${escapeHtml(state.exam.yearMonth)}</span>` : ''}</div>`;
  let lastMajorKey = null;
  const prepared = getPreparedSections();
  const chromeList = resolvePaperSectionChrome(prepared.map(({ section }) => section));
  prepared.forEach(({ section, content, contentBlocks }, index) => {
    const chrome = chromeList[index];
    const majorKey = `${section.major}|${section.majorTitle}`;
    const majorMarkup = majorKey !== lastMajorKey
      ? `<div class="preview-major-title">${escapeHtml(section.major)}. ${escapeHtml(section.majorTitle)}</div>`
      : '';
    const sectionHeadingMarkup = chrome.showSectionHeading
      ? `<div class="preview-section-heading">${escapeHtml(chrome.sectionHeading)}</div>`
      : '';
    const instructionMarkup = chrome.showInstruction
      ? `<div class="preview-instruction">${formatInstructionMarkup(chrome.instruction)}</div>`
      : '';
    const readingPartMarkup = chrome.showReadingPartLabel
      ? `<div class="preview-reading-part-label">${escapeHtml(section.readingPartLabel)}</div>`
      : '';
    const partLabelMarkup = chrome.showPartLabel
      ? `<div class="preview-part-label">${escapeHtml(section.partLabel)}</div>`
      : '';
    const questionNumberMarkup = ['summary', 'writing'].includes(section.type) && section.start
      ? `<div class="preview-question-number">${escapeHtml(String(section.start))}.</div>`
      : '';
    const contentMarkup = section.type === 'vocabulary'
      ? formatVocabularyContent(content, section)
      : section.type === 'sectionC'
        ? formatSectionCContent(contentBlocks || [], section, content)
        : formatPreviewBlocks(contentBlocks || [], section);
    html += `${majorMarkup}<section class="preview-section" data-type="${escapeHtml(section.type || '')}">${sectionHeadingMarkup}${instructionMarkup}${readingPartMarkup}${partLabelMarkup}${questionNumberMarkup}<div class="preview-content">${contentMarkup}</div></section>`;
    lastMajorKey = majorKey;
  });
  return html;
}

function buildAnswerPreviewHtml() {
  let html = `<h1>${escapeHtml(`${state.exam.title || '试卷'} 答案`)}</h1>`;
  getAnswerBlocks().forEach((block) => {
    html += formatAnswerBlockMarkup(block);
  });
  html += formatListeningScriptsMarkup(getListeningScriptBlocks());
  return html;
}

function getListeningScriptBlocks() {
  const listening = getPreparedSections()
    .map(({ section }) => section)
    .filter((section) => section.type === 'listening');
  const ordered = [...listening].sort((a, b) => {
    const rank = (section) => (section.listeningPart === 'A' || section.sectionLabel === 'Section A' ? 0 : 1);
    return rank(a) - rank(b);
  });
  return ordered
    .map((section) => ({
      sectionLabel: section.sectionLabel || (section.listeningPart ? `Section ${section.listeningPart}` : ''),
      text: String(section.listeningScript || '').trim(),
    }))
    .filter((item) => item.text);
}

function formatListeningScriptsMarkup(blocks) {
  if (!blocks?.length) return '';
  let html = '<div class="preview-major-title">听力原文</div>';
  blocks.forEach((block) => {
    if (block.sectionLabel) {
      html += `<div class="preview-section-heading">${escapeHtml(block.sectionLabel)}</div>`;
    }
    html += `<div class="preview-answer-block preview-listening-script">${block.text.split('\n').map((line) => `<p>${formatRichTextMarkup(line)}</p>`).join('')}</div>`;
  });
  return html;
}

function renderPreviewChrome() {
  const isAnswer = state.previewMode === 'answer';
  $('previewPaperMode')?.classList.toggle('active', !isAnswer);
  $('previewAnswerMode')?.classList.toggle('active', isAnswer);
  if ($('previewHeading')) $('previewHeading').textContent = isAnswer ? '答案纸效果' : '试卷纸效果';
  if ($('previewBadge')) $('previewBadge').textContent = isAnswer ? '答案 · 可导出' : 'A4 · 可打印';
  if ($('wordButton')) $('wordButton').textContent = isAnswer ? '导出答案 Word' : '导出 Word';
  if ($('printButton')) $('printButton').textContent = isAnswer ? '打印答案 PDF' : '打印 / PDF';
}

function renderPreview() {
  const host = $('previewPaper');
  if (!host) return;
  const isAnswer = state.previewMode === 'answer';
  try {
    const html = isAnswer ? buildAnswerPreviewHtml() : buildPaperPreviewHtml();
    const pageCount = paginatePreview(host, html, { isAnswer });
    if ($('previewBadge')) {
      $('previewBadge').textContent = isAnswer ? `答案 · ${pageCount} 页` : `A4 · ${pageCount} 页`;
    }
  } catch (error) {
    console.error('Preview render failed', error);
    host.innerHTML = `<div class="preview-page"><div class="preview-page-body"><p style="color:#b42318">预览渲染出错：${escapeHtml(error.message || String(error))}</p></div></div>`;
  }
}

const ANSWER_GROUP_GAP = '     '; // 约 5 个空格，拉开答案组

function extractLetterAnswers(text) {
  return String(text || '').replace(/[^A-Za-z]/g, '').toUpperCase();
}

/** 解析「21. 答案」类条目（忽略原题号，按出现顺序） */
function extractNumberedTextAnswers(text) {
  const source = String(text || '').trim();
  if (!source) return [];
  const pattern = /(\d+)\s*[.．、)）]\s*/g;
  const matches = [...source.matchAll(pattern)];
  if (matches.length) {
    return matches.map((match, index) => {
      const start = match.index + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
      return source.slice(start, end).trim().replace(/\s+/g, ' ');
    }).filter(Boolean);
  }
  return source
    .split(/\n+|\t+|\s{2,}/)
    .map((part) => part.trim().replace(/^\d+\s*[.．、)）]\s*/, ''))
    .filter(Boolean);
}

function letterGroupSizesForSection(section, count) {
  const total = Math.max(0, Number(count) || 0);
  if (!total) return [];
  if (section?.type === 'listening' && section.listeningPart === 'B' && total === 10) {
    return [3, 3, 4];
  }
  if (section?.type === 'listening' && total === 10) {
    return [5, 5];
  }
  const sizes = [];
  let left = total;
  while (left > 0) {
    const size = Math.min(5, left);
    sizes.push(size);
    left -= size;
  }
  return sizes;
}

/** 字母答案：每组自带题号，如 41-45 CABDA     46-50 BCADA */
function formatNumberedLetterGroups(start, letters, groupSizes) {
  const compact = extractLetterAnswers(letters);
  if (!compact) return '';
  const chunks = [];
  let offset = 0;
  let question = Math.max(1, Number(start) || 1);
  const sizes = groupSizes?.length ? groupSizes : [compact.length];

  sizes.forEach((size) => {
    if (offset >= compact.length) return;
    const slice = compact.slice(offset, offset + size);
    if (!slice) return;
    const from = question;
    const to = question + slice.length - 1;
    const range = from === to ? `${from}` : `${from}-${to}`;
    chunks.push(`${range} ${slice}`);
    offset += slice.length;
    question += slice.length;
  });

  if (offset < compact.length) {
    const slice = compact.slice(offset);
    const from = question;
    const to = question + slice.length - 1;
    const range = from === to ? `${from}` : `${from}-${to}`;
    chunks.push(`${range} ${slice}`);
  }

  return chunks.join(ANSWER_GROUP_GAP);
}

/** 文字答案（语法等）：五个一行，项与项之间拉开 */
function formatNumberedTextAnswerLines(answers, start, perLine = 5) {
  const list = (answers || []).filter((item) => String(item || '').trim());
  if (!list.length) return '';
  const lines = [];
  let row = [];
  list.forEach((answer, index) => {
    const number = Math.max(1, Number(start) || 1) + index;
    row.push(`${number}. ${String(answer).trim()}`);
    if (row.length >= perLine) {
      lines.push(row.join(ANSWER_GROUP_GAP));
      row = [];
    }
  });
  if (row.length) lines.push(row.join(ANSWER_GROUP_GAP));
  return lines.join('\n');
}

function isLetterAnswerSection(section) {
  return [
    'listening',
    'vocabulary',
    'cloze',
    'readingA',
    'readingB',
    'readingC',
    'sectionC',
  ].includes(section?.type);
}

/**
 * 识别用户输入中的答案内容，按本大题题号重排，并格式化为标准答案样式。
 * 完形 / 选词 / 听力等：每 5 个（听力 B 为 3+3+4）一组且每组带题号。
 * 语法：文字答案，五个一行。
 */
function formatSectionAnswer(text, section) {
  const start = Math.max(1, Number(section?.start) || 1);
  const end = Math.max(start, Number(section?.end) || start);
  const count = end - start + 1;
  const trimmed = String(text || '').trim();

  if (!trimmed) {
    if (isLetterAnswerSection(section)) {
      return formatNumberedLetterGroups(start, '', letterGroupSizesForSection(section, count))
        || `${start === end ? start : `${start}-${end}`}`;
    }
    return `${start === end ? start : `${start}-${end}`}`;
  }

  if (isLetterAnswerSection(section)) {
    const letters = extractLetterAnswers(trimmed).slice(0, count);
    const sizes = letterGroupSizesForSection(section, count);
    return formatNumberedLetterGroups(start, letters, sizes);
  }

  if (section?.type === 'grammar') {
    const answers = extractNumberedTextAnswers(trimmed).slice(0, count);
    return formatNumberedTextAnswerLines(answers, start, 5);
  }

  if (section?.type === 'translation') {
    const answers = extractNumberedTextAnswers(trimmed);
    if (answers.length) return formatNumberedTextAnswerLines(answers, start, 1);
    return renumberAnswerText(trimmed, section);
  }

  // 作文 / 概要：整段范文，绝不按字母选择题抽取
  if (section?.type === 'writing' || section?.type === 'summary') {
    return renumberAnswerText(trimmed, section);
  }

  // custom：仅当答案明显是短字母串时才按选择题格式化
  const renumbered = renumberAnswerText(trimmed, section);
  if (looksLikeCompactLetterKey(renumbered, count)) {
    const letters = extractLetterAnswers(renumbered).slice(0, count);
    return formatNumberedLetterGroups(start, letters, letterGroupSizesForSection(section, count));
  }
  return renumbered;
}

/** 像 "ABCD" / "41-45 ABCDE" 的短答案键；长段落（作文）会排除 */
function looksLikeCompactLetterKey(text, count) {
  const source = String(text || '').trim();
  if (!source) return false;
  const letters = extractLetterAnswers(source);
  const need = Math.max(1, Number(count) || 1);
  if (letters.length < need || letters.length > need + 2) return false;
  if (/\d+\s*[.．、)）]\s*\S{2,}/.test(source)) return false;
  // 去掉题号区间后，剩余应基本是选项字母与少量分隔符
  const body = source
    .replace(/\d+\s*[-–—~～]\s*\d+/g, ' ')
    .replace(/\d+\s*[.．、)）]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!body || body.length > need * 2 + 6) return false;
  return /^[A-Ka-k\s,，;；、./]*$/.test(body);
}

function renumberAnswerText(text, section) {
  const value = String(text || '').trim();
  if (!value) return '';
  const start = Math.max(1, Number(section?.start) || 1);
  const end = Math.max(start, Number(section?.end) || start);
  const count = end - start + 1;

  let result = value.split('\n').map((line) => line.replace(
    /^(\s*)(\d+)\s*[-–—~～]\s*(\d+)(?=\s|[：:]|$)/,
    (match, pre, fromText, toText) => {
      if (String(fromText).length >= 4 || String(toText).length >= 4) return match;
      const from = Number(fromText);
      const to = Number(toText);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return match;
      const span = to - from + 1;
      if (from === start && to === end) return match;
      if (span === count || span >= Math.max(1, count - 2)) return `${pre}${start}-${end}`;
      return match;
    },
  )).join('\n');

  const mainQuestionPattern = /^(\s*)(\d+)\s*[.．、)）]\s*/;
  const lines = result.split('\n');
  if (lines.some((line) => mainQuestionPattern.test(line))) {
    let next = start;
    result = lines.map((line) => {
      const match = line.match(mainQuestionPattern);
      if (!match) return line;
      if (String(match[2]).length >= 4) return line;
      if (next > end) return line;
      const assigned = next++;
      return line.replace(mainQuestionPattern, `$1${assigned}. `);
    }).join('\n');
  }

  return result;
}

function ensureAnswerHasQuestionRange(text, section) {
  return formatSectionAnswer(text, section);
}

function readingAnswerMergeKey(section) {
  if (!isReadingSection(section)) return '';
  return `${section.major || ''}|${section.sectionLabel || 'Section B'}|reading`;
}

function getAnswerBlocks() {
  const prepared = getPreparedSections();
  const sections = prepared.map(({ section }) => section);
  const chromeList = resolvePaperSectionChrome(sections);
  let lastMajorKey = null;
  const blocks = [];

  prepared.forEach(({ section }, index) => {
    const chrome = chromeList[index];
    const majorKey = `${section.major || ''}|${section.majorTitle || ''}`;
    const showMajor = Boolean(section.major) && majorKey !== lastMajorKey;
    if (section.major) lastMajorKey = majorKey;

    let subLabel = '';
    let subLabelKind = '';
    if (chrome.showPartLabel && !isReadingSection(section)) {
      subLabel = section.partLabel;
      subLabelKind = 'part';
    }

    const text = formatSectionAnswer(String(section.answer || '').trim(), section);
    const readingKey = readingAnswerMergeKey(section);
    const prev = blocks[blocks.length - 1];

    if (readingKey && prev && prev.readingMergeKey === readingKey) {
      const lastPart = prev.parts[prev.parts.length - 1];
      lastPart.text = `${lastPart.text}${ANSWER_GROUP_GAP}${text}`;
      return;
    }

    const titleParts = [
      showMajor ? `${section.major}. ${section.majorTitle || ''}` : '',
      chrome.showSectionHeading ? chrome.sectionHeading : '',
      subLabel,
    ].filter(Boolean);

    blocks.push({
      major: section.major || '',
      majorTitle: section.majorTitle || '',
      showMajor,
      showSectionHeading: chrome.showSectionHeading,
      sectionHeading: chrome.sectionHeading || '',
      subLabel,
      subLabelKind,
      readingMergeKey: readingKey,
      title: titleParts.join(' ') || section.majorTitle || section.title || '答案',
      parts: [{ section, label: '', text }],
    });
  });

  return blocks.map(({ readingMergeKey, ...block }) => block);
}

function formatAnswerBlockMarkup(block) {
  let html = '';
  if (block.showMajor) {
    html += `<div class="preview-major-title">${escapeHtml(block.major)}. ${escapeHtml(block.majorTitle)}</div>`;
  }
  if (block.showSectionHeading) {
    html += `<div class="preview-section-heading">${escapeHtml(block.sectionHeading)}</div>`;
  }
  if (block.subLabel) {
    const cls = block.subLabelKind === 'reading'
      ? 'preview-reading-part-label'
      : 'preview-part-label';
    html += `<div class="${cls}">${escapeHtml(block.subLabel)}</div>`;
  }
  const chunks = (block.parts || []).map(({ text }) => {
    if (!text) return '<p class="preview-answer-empty">（尚未填写答案）</p>';
    return text.split('\n').map((line) => `<p>${formatRichTextMarkup(line)}</p>`).join('');
  }).join('');
  html += `<div class="preview-answer-block">${chunks}</div>`;
  return html;
}

function choiceOptionPlacement(index, layout) {
  if (layout === 'row4') return `grid-column:${index + 1};grid-row:1`;
  if (layout === 'grid2x2') {
    // 两列时：A/C 对齐四列布局的 A 列，B/D 对齐四列布局的 C 列
    const col = index % 2 === 0 ? 1 : 3;
    const row = Math.floor(index / 2) + 1;
    return `grid-column:${col};grid-row:${row}`;
  }
  return `grid-column:1 / -1;grid-row:${index + 1}`;
}

function formatChoiceBlockMarkup(block, richOptions = {}) {
  const options = (block.options || []).filter(Boolean);
  const layout = block.layout || choiceLayoutTier(options);
  const number = `${block.number}.`;
  const optCols = layout === 'grid2x2' ? 2 : layout === 'stack4' ? 1 : 4;
  const stemOpts = richOptions.stem || {};
  const optionOpts = richOptions.option || {};
  const stemHtml = block.stem
    ? `<tr><td class="choice-num">${escapeHtml(number)}</td><td class="choice-stem-cell" colspan="${optCols}">${formatInlineText(block.stem, stemOpts)}</td></tr>`
    : '';

  if (layout === 'row4' && options.length) {
    const optionCells = options.map((option) =>
      `<td class="choice-opt">${formatInlineText(`${option.label}. ${option.text || ''}`, optionOpts)}</td>`,
    ).join('');
    const optionRow = block.stem
      ? `<tr><td class="choice-num"></td>${optionCells}</tr>`
      : `<tr><td class="choice-num">${escapeHtml(number)}</td>${optionCells}</tr>`;
    return `<table class="choice-table choice-table-row4"><tbody>${stemHtml}${optionRow}</tbody></table>`;
  }

  if (layout === 'grid2x2' && options.length) {
    // AB 一行，CD 一行；题号列对齐
    const rows = [];
    for (let i = 0; i < options.length; i += 2) {
      const left = options[i];
      const right = options[i + 1];
      const numCell = i === 0 && !block.stem
        ? `<td class="choice-num">${escapeHtml(number)}</td>`
        : '<td class="choice-num"></td>';
      rows.push(
        `<tr>${numCell}`
        + `<td class="choice-opt">${formatInlineText(`${left.label}. ${left.text || ''}`, optionOpts)}</td>`
        + `<td class="choice-opt">${right ? formatInlineText(`${right.label}. ${right.text || ''}`, optionOpts) : ''}</td>`
        + `</tr>`,
      );
    }
    return `<table class="choice-table choice-table-grid2x2"><tbody>${stemHtml}${rows.join('')}</tbody></table>`;
  }

  // 每个选项整行占满（不要只占 1/4 宽）
  const stackRows = options.map((option, index) => {
    const numCell = index === 0 && !block.stem
      ? `<td class="choice-num">${escapeHtml(number)}</td>`
      : '<td class="choice-num"></td>';
    return `<tr>${numCell}<td class="choice-opt choice-opt-full">${formatInlineText(`${option.label}. ${option.text || ''}`, optionOpts)}</td></tr>`;
  }).join('');
  return `<table class="choice-table choice-table-stack4"><tbody>${stemHtml}${stackRows}</tbody></table>`;
}

function formatPreviewBlocks(blocks, section) {
  const reading = isReadingSection(section);
  const focusTargets = reading ? collectReadingFocusTargets(blocks) : [];
  const stemOpts = reading ? { emphasizeQuotes: true, boldUppercase: true } : {};
  let passageParagraphIndex = 0;

  return blocks.map((block) => {
    switch (block.type) {
      case 'blank':
        return '';
      case 'listening-heading':
        return `<p class="listening-group-heading">${formatInlineText(block.text)}</p>`;
      case 'content-title': {
        const plain = section?.type === 'writing' ? ' content-title-plain' : '';
        return `<p class="content-title${plain}">${formatInlineText(block.text)}</p>`;
      }
      case 'bullet':
        return `<p class="exam-bullet">${formatInlineText(block.text)}</p>`;
      case 'paragraph': {
        passageParagraphIndex += 1;
        const passageOpts = reading
          ? readingHighlightOptionsForParagraph(focusTargets, passageParagraphIndex)
          : {};
        return `<p class="article-paragraph">${formatInlineText(block.text, passageOpts)}</p>`;
      }
      case 'question-stem':
        return `<table class="choice-table choice-table-stem"><tbody><tr><td class="choice-num">${escapeHtml(String(block.number))}.</td><td class="choice-stem-cell">${formatInlineText(block.text, stemOpts)}</td></tr></tbody></table>`;
      case 'question-choices':
        return formatChoiceBlockMarkup(block, { stem: stemOpts });
      default:
        return '';
    }
  }).join('');
}

function formatPreviewContent(text, section) {
  const lines = text.split('\n');
  const firstContentLine = lines.findIndex((line) => line.trim());
  return lines.map((line, index) => {
    if (isListeningGroupHeading(line, section)) return `<p class="listening-group-heading">${formatInlineText(line)}</p>`;
    const choice = parseChoiceLine(line);
    if (choice) return formatChoiceMarkup(choice);
    const bulletText = parseBulletLine(line);
    if (bulletText) return `<p class="exam-bullet">${formatInlineText(bulletText)}</p>`;
    if (index === firstContentLine && isLikelyContentTitle(line)) {
      const plain = section?.type === 'writing' ? ' content-title-plain' : '';
      return `<p class="content-title${plain}">${formatInlineText(line)}</p>`;
    }
    return `<p class="article-paragraph">${formatInlineText(line)}</p>`;
  }).join('');
}

function parseChoiceLine(line) {
  const raw = String(line || '');
  const startsWithQuestion = /^\s*\d+\s*[.．、)）]\s*/.test(raw);
  const startsWithChoice = /^\s*[A-D]\s*[.．、)）]\s+/u.test(raw);
  if (!startsWithQuestion && !startsWithChoice) return null;
  const markerPattern = /(^|\s)([A-D])\s*[.．、)）]\s+/gu;
  const markers = [...raw.matchAll(markerPattern)];
  if (!markers.length) return null;
  const first = markers[0];
  const firstLabelIndex = first.index + first[1].length;
  const prefix = raw.slice(0, firstLabelIndex).trim();
  if (prefix && !/^\d+\s*[.．、)）]$/.test(prefix)) return null;
  const options = markers.map((marker, index) => {
    const textStart = marker.index + marker[0].length;
    const textEnd = index + 1 < markers.length ? markers[index + 1].index : raw.length;
    return { label: marker[2], text: raw.slice(textStart, textEnd).trim() };
  });
  return { prefix, options };
}

function choiceColumnCount(options) {
  const layout = choiceLayoutTier(options);
  if (layout === 'row4') return 4;
  if (layout === 'grid2x2') return 2;
  return 1;
}

function formatChoiceMarkup(choice) {
  const options = (choice.options || []).filter(Boolean);
  const layout = choiceLayoutTier(options);
  const number = choice.prefix
    ? `<span class="choice-number">${escapeHtml(choice.prefix)}</span>`
    : '<span class="choice-number" aria-hidden="true"></span>';
  const optionHtml = options.map((option, index) =>
    `<span class="choice-option" style="${choiceOptionPlacement(index, layout)}">${formatInlineText(`${option.label}. ${option.text || ''}`)}</span>`,
  ).join('');
  return `<div class="choice-row">${number}<span class="choice-grid choice-grid-${layout}">${optionHtml}</span></div>`;
}

function formatInlineText(line, options = {}) {
  const blankClass = `[${BLANK_LINE_CHARS}]`;
  return formatRichTextMarkup(line, options).replace(
    new RegExp(`\\((\\d+)\\)\\s*${blankClass}{3,}(\\.)?`, 'g'),
    (_, n, dot) => {
      const blank = `(${n}) ${'_'.repeat(Number(state.style.blankLength) || DEFAULT_BLANK_LENGTH)}${dot || ''}`;
      return `<span class="blank">${blank}</span>`;
    },
  );
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractQuotedFocusWords(text) {
  const words = [];
  const pattern = /["“]([^"”]+)["”]/g;
  let match;
  const source = String(text || '');
  while ((match = pattern.exec(source))) {
    const word = match[1].trim();
    if (word && word.length <= 48) words.push(word);
  }
  return words;
}

function parseParagraphNumberToken(raw) {
  const value = String(raw || '').trim();
  if (/^\d+$/.test(value)) return Number(value);
  const map = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
    十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15,
  };
  if (map[value]) return map[value];
  const tenMatch = value.match(/^十([一二三四五六七八九])$/);
  if (tenMatch) return 10 + map[tenMatch[1]];
  return null;
}

/** 从题干识别 Paragraph 2 / Para. 2 / 第2段 等 */
function extractParagraphReference(text) {
  const source = String(text || '');
  const patterns = [
    /paragraph\s*(\d+)/i,
    /\bpara\.?\s*(\d+)\b/i,
    /第\s*([一二三四五六七八九十百\d]+)\s*段/,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match) continue;
    const number = parseParagraphNumberToken(match[1]);
    if (Number.isFinite(number) && number >= 1) return number;
  }
  return null;
}

/**
 * 阅读划线词：带段落号时只高亮该段；无段落号则全文高亮（兼容旧题干）
 * @returns {{ word: string, paragraph: number|null }[]}
 */
function collectReadingFocusTargets(blocks) {
  const seen = new Set();
  const targets = [];
  (blocks || []).forEach((block) => {
    const texts = [];
    if (block?.type === 'question-stem') texts.push(block.text);
    if (block?.type === 'question-choices' && block.stem) texts.push(block.stem);
    texts.forEach((text) => {
      const paragraph = extractParagraphReference(text);
      extractQuotedFocusWords(text).forEach((word) => {
        const key = `${word.toLowerCase()}|${paragraph == null ? '*' : paragraph}`;
        if (seen.has(key)) return;
        seen.add(key);
        targets.push({ word, paragraph });
      });
    });
  });
  return targets;
}

function readingHighlightOptionsForParagraph(targets, paragraphIndex) {
  if (!targets?.length) return {};
  const list = [];
  const seen = new Set();
  targets.forEach((target) => {
    const word = String(target.word || '').trim();
    if (!word) return;
    if (target.paragraph == null) {
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ word, once: false });
      return;
    }
    if (target.paragraph !== paragraphIndex) return;
    const key = word.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ word, once: true });
  });
  return list.length ? { highlightTargets: list } : {};
}

function collectReadingFocusWords(blocks) {
  return collectReadingFocusTargets(blocks).map((target) => target.word);
}

function formatRichTextMarkup(text, options = {}) {
  let raw = String(text || '').replace(/[（）]/g, (char) => (char === '（' ? '(' : ')'));
  const slots = [];
  const stash = (html) => {
    const token = `\uE000${slots.length}\uE001`;
    slots.push(html);
    return token;
  };

  if (options.emphasizeQuotes) {
    raw = raw.replace(/["“]([^"”]+)["”]/g, (_, word) => (
      `"${stash(`<strong class="exam-emphasis"><u>${escapeHtml(word)}</u></strong>`)}"`
    ));
  }

  if (options.boldUppercase) {
    raw = raw.replace(/\b[A-Z]{2,}\b/g, (word) => stash(`<strong class="exam-caps">${escapeHtml(word)}</strong>`));
  }

  const highlightList = options.highlightTargets?.length
    ? options.highlightTargets
    : (options.highlightWords || []).map((word) => ({ word, once: false }));
  if (highlightList.length) {
    [...highlightList]
      .sort((a, b) => String(b.word || '').length - String(a.word || '').length)
      .forEach((target) => {
        const word = String(target.word || '');
        if (!word) return;
        const pattern = new RegExp(`\\b(${escapeRegExp(word)})\\b`, target.once ? 'i' : 'gi');
        raw = raw.replace(pattern, (matched) => (
          stash(`<strong class="exam-emphasis"><u>${escapeHtml(matched)}</u></strong>`)
        ));
      });
  }

  let result = escapeHtml(raw);
  const glossPattern = /([A-Za-z][A-Za-z'-]*)\s*\(\s*([^()]*[\u3400-\u9fff][^()]*)\s*\)|([\u3400-\u9fff]+)/g;
  result = result.replace(glossPattern, (match, word, gloss, chinese) => {
    if (word) {
      return `<em class="english-term">${word}</em><span class="chinese-gloss"> (${gloss.trim()})</span>`;
    }
    return `<span class="chinese-text">${chinese}</span>`;
  });

  slots.forEach((html, index) => {
    result = result.split(`\uE000${index}\uE001`).join(html);
  });
  return result;
}

/* ========== 布局与事件 ========== */

const LAYOUT_KEY = 'exam-paper-generator:layout:v1';
const LAYOUT_DEFAULTS = { sidebar: 260, preview: null };
const LAYOUT_LIMITS = { sidebarMin: 180, sidebarMax: 480, previewMin: 280, previewMaxRatio: 0.62, editorMin: 320 };

function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY));
    if (saved && typeof saved === 'object') return { ...LAYOUT_DEFAULTS, ...saved };
  } catch (error) {
    console.warn('Unable to restore layout', error);
  }
  return { ...LAYOUT_DEFAULTS };
}

function saveLayout(layout) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

function applyLayout(layout = loadLayout()) {
  const workspace = $('workspace');
  if (!workspace || workspace.hidden || window.matchMedia('(max-width: 1180px)').matches) return;
  const sidebarWidth = Math.round(Number(layout.sidebar) || LAYOUT_DEFAULTS.sidebar);
  workspace.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  if (layout.preview) {
    workspace.style.setProperty('--preview-width', `${Math.round(Number(layout.preview))}px`);
  } else {
    workspace.style.setProperty('--preview-width', '42vw');
  }
}

function bindColumnResize() {
  const workspace = $('workspace');
  const sidebarHandle = $('resizeSidebar');
  const previewHandle = $('resizePreview');
  if (!workspace || !sidebarHandle || !previewHandle) return;

  const startResize = (side, event) => {
    if (workspace.hidden || window.matchMedia('(max-width: 1180px)').matches) return;
    event.preventDefault();
    const layout = loadLayout();
    const bounds = workspace.getBoundingClientRect();
    const handle = side === 'sidebar' ? sidebarHandle : previewHandle;
    const startX = event.clientX;
    const startSidebar = $('sidebar').getBoundingClientRect().width;
    const startPreview = $('previewColumn').getBoundingClientRect().width;

    handle.classList.add('active');
    workspace.classList.add('is-resizing');

    const onMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const maxSidebar = Math.min(LAYOUT_LIMITS.sidebarMax, bounds.width * 0.4);
      const maxPreview = Math.min(bounds.width * LAYOUT_LIMITS.previewMaxRatio, bounds.width - LAYOUT_LIMITS.editorMin - LAYOUT_LIMITS.sidebarMin - 12);

      if (side === 'sidebar') {
        const next = Math.max(LAYOUT_LIMITS.sidebarMin, Math.min(maxSidebar, startSidebar + delta));
        const previewCap = Math.max(LAYOUT_LIMITS.previewMin, bounds.width - next - LAYOUT_LIMITS.editorMin - 12);
        const previewWidth = Math.min(startPreview, previewCap);
        layout.sidebar = Math.round(next);
        layout.preview = Math.round(previewWidth);
      } else {
        const next = Math.max(LAYOUT_LIMITS.previewMin, Math.min(maxPreview, startPreview - delta));
        const sidebarCap = Math.max(LAYOUT_LIMITS.sidebarMin, bounds.width - next - LAYOUT_LIMITS.editorMin - 12);
        const sidebarWidth = Math.min(startSidebar, sidebarCap);
        layout.preview = Math.round(next);
        layout.sidebar = Math.round(sidebarWidth);
      }
      applyLayout(layout);
    };

    const onUp = () => {
      handle.classList.remove('active');
      workspace.classList.remove('is-resizing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      saveLayout(layout);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  sidebarHandle.addEventListener('pointerdown', (event) => startResize('sidebar', event));
  previewHandle.addEventListener('pointerdown', (event) => startResize('preview', event));
  window.addEventListener('resize', () => applyLayout());
}

function setPreviewMode(mode) {
  state.previewMode = mode === 'answer' ? 'answer' : 'paper';
  renderPreviewChrome();
  renderPreview();
}

function renderStepChrome() {
  const isSelect = state.step === 'select';
  document.body.classList.toggle('page-select', isSelect);
  document.body.classList.toggle('page-edit', !isSelect);
  $('selectStep').hidden = !isSelect;
  $('workspace').hidden = isSelect;
  $('backToSelectButton').hidden = isSelect;
  $('printButton').hidden = isSelect;
  $('wordButton').hidden = isSelect;
  if ($('brandSubtitle')) {
    $('brandSubtitle').textContent = isSelect ? '第一步 · 确认题型' : '第二步 · 录入与排版';
  }
  if (!isSelect) applyLayout();
}

function renderAll() {
  renderStepChrome();
  if (state.step === 'select') {
    renderSelectMeta();
    renderTypeGrid();
    return;
  }
  renderMeta();
  renderStyles();
  renderSectionList();
  renderEditor();
  renderPreviewChrome();
  renderPreview();
}

function bindEvents() {
  $('confirmTypesButton')?.addEventListener('click', confirmTypeSelection);
  $('selectAllTypes')?.addEventListener('click', selectCommonTypes);
  $('clearAllTypes')?.addEventListener('click', clearAllTypes);
  $('addCustomTypeButton')?.addEventListener('click', addCustomTypeSelection);
  $('feedbackForm')?.addEventListener('submit', submitFeedback);
  $('feedbackPhotos')?.addEventListener('change', (event) => {
    addFeedbackPhotos(event.target.files || []);
    event.target.value = '';
  });
  $('addBuiltinTypeSelect')?.addEventListener('change', (event) => {
    const type = event.target.value;
    if (!type) return;
    addBuiltinTypeSelection(type);
    event.target.value = '';
  });
  $('backToSelectButton')?.addEventListener('click', backToSelect);

  const selectMeta = {
    selectExamTitle: 'title',
    selectExamYearMonth: 'yearMonth',
    selectExamDuration: 'duration',
  };
  Object.entries(selectMeta).forEach(([id, field]) => {
    $(id)?.addEventListener('input', (event) => {
      state.exam[field] = event.target.value;
      markDirty();
    });
  });

  const metaFields = {
    examTitle: 'title',
    examYearMonth: 'yearMonth',
    examDuration: 'duration',
    paperSize: 'paperSize',
  };
  Object.entries(metaFields).forEach(([id, field]) => {
    $(id)?.addEventListener('input', (event) => {
      state.exam[field] = event.target.value;
      markDirty();
      renderPreview();
    });
  });

  const styleFields = {
    fontFamily: 'fontFamily',
    cjkFontFamily: 'cjkFontFamily',
    fontSize: 'fontSize',
    lineSpacing: 'lineSpacing',
    fixedLineHeight: 'fixedLineHeight',
    paragraphAfter: 'paragraphAfter',
    firstLineIndent: 'firstLineIndent',
    blankLength: 'blankLength',
  };
  Object.entries(styleFields).forEach(([id, field]) => {
    $(id)?.addEventListener('input', (event) => {
      state.style[field] = ['fontSize', 'fixedLineHeight', 'paragraphAfter', 'firstLineIndent', 'blankLength'].includes(field)
        ? Number(event.target.value)
        : event.target.value;
      markDirty();
      renderStyles();
      renderPreview();
      if (activeSection()) renderEditor();
    });
  });

  $('newExamButton')?.addEventListener('click', () => {
    if (confirm('确定新建试卷并清除当前草稿吗？')) {
      clearTimeout(autosaveTimer);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('exam-paper-generator:draft:v5');
      state = defaultState();
      goToStep('select');
      if ($('saveStatus')) {
        $('saveStatus').textContent = '未保存';
        $('saveStatus').classList.remove('saved');
      }
      showToast('已新建试卷');
    }
  });
  $('saveExamButton')?.addEventListener('click', () => saveState());

  const flushDraft = () => {
    clearTimeout(autosaveTimer);
    try {
      saveState(false);
    } catch (error) {
      console.warn('Flush draft failed', error);
    }
  };
  window.addEventListener('beforeunload', flushDraft);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushDraft();
  });
  $('resetStyleButton')?.addEventListener('click', () => {
    state.style = defaultStyle();
    renderAll();
    showToast('版式已恢复默认');
  });
  $('printButton')?.addEventListener('click', () => {
    renderPreview();
    window.print();
  });
  $('wordButton')?.addEventListener('click', exportWordCompatible);
  $('previewPaperMode')?.addEventListener('click', () => setPreviewMode('paper'));
  $('previewAnswerMode')?.addEventListener('click', () => setPreviewMode('answer'));
}

async function exportWordCompatible() {
  const isAnswer = state.previewMode === 'answer';
  const preparedSections = getPreparedSections();
  const exportState = {
    ...state,
    documentType: isAnswer ? 'answer' : 'paper',
    sections: preparedSections.map(({ section, start, content, contentBlocks }) => ({
      ...section,
      start,
      title: sectionHeadingText(section),
      content,
      contentBlocks,
      answer: section.answer || '',
    })),
    answerBlocks: isAnswer
      ? getAnswerBlocks().map((block) => ({
        title: block.title,
        major: block.major,
        majorTitle: block.majorTitle,
        showMajor: block.showMajor,
        showSectionHeading: block.showSectionHeading,
        sectionHeading: block.sectionHeading,
        subLabel: block.subLabel,
        subLabelKind: block.subLabelKind,
        parts: block.parts.map(({ label, text, section }) => ({
          label,
          text,
          type: section?.type,
        })),
      }))
      : undefined,
    listeningScripts: isAnswer ? getListeningScriptBlocks() : undefined,
  };
  const baseName = `${state.exam.title || '试卷'}${isAnswer ? ' 答案' : ''}`;
  try {
    const response = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportState),
    });
    if (response.ok) {
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${baseName}.docx`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast(isAnswer ? '答案 DOCX 已导出' : 'DOCX 文件已导出');
      return;
    }
  } catch (error) {
    console.warn('DOCX export failed, falling back to Word-compatible HTML', error);
  }

  const pageBodies = [...$('previewPaper').querySelectorAll('.preview-page-body')];
  const exportBody = pageBodies.map((body, index) => (
    `<div class="export-page">${body.innerHTML}${index < pageBodies.length - 1 ? '<div style="page-break-after:always"></div>' : ''}</div>`
  )).join('');
  const lineHeight = state.style.lineSpacing === 'fixed' ? `${state.style.fixedLineHeight}pt` : state.style.lineSpacing;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:2.54cm}
body{margin:0;font-family:"${state.style.fontFamily}","${state.style.cjkFontFamily}",serif;font-size:${state.style.fontSize}pt;line-height:${lineHeight};color:#111}
.export-page{padding:2.54cm;box-sizing:border-box;min-height:297mm}
h1{text-align:center;font-size:19pt;line-height:1.2}
.preview-meta,.preview-major-title,.preview-section-title,.preview-instruction,.preview-content,.preview-answer-heading,.preview-answer-block{font-size:${state.style.fontSize}pt;line-height:${lineHeight}}
.preview-meta{position:relative;text-align:center;margin-bottom:10pt;min-height:1.2em}
.preview-exam-date{position:absolute;left:80%;top:0;width:20%;margin:0;text-align:center;font:inherit}
.preview-major-title,.preview-answer-heading{font-weight:bold;margin-top:6pt;margin-bottom:3pt}
.preview-section-title,.preview-part-label{font-weight:bold;margin-bottom:3pt}
.preview-question-number{margin:4px 0 2pt}
.preview-instruction{font-style:italic;font-weight:normal;margin-bottom:3pt;text-align:justify;text-justify:inter-word}
.preview-instruction em,.preview-instruction .direction-text{font-style:italic;font-weight:normal}
.preview-major-title,.preview-section-title,.preview-part-label,.preview-section-heading{font-weight:bold;font-style:normal}
.preview-content,.preview-answer-block{text-align:justify;text-justify:inter-word}
.preview-content p,.preview-answer-block p{margin:0 0 ${state.style.paragraphAfter}pt;text-align:justify;text-justify:inter-word}
.preview-content p.article-paragraph{text-indent:${Number(state.style.firstLineIndent) || 0}em}
.preview-section[data-type="translation"] .preview-content p.article-paragraph{text-indent:0}
.preview-content p.content-title{font-weight:bold;text-align:center}
.preview-content p.content-title-plain,.preview-section[data-type="writing"] p.content-title{font-weight:normal;text-align:left;text-indent:${Number(state.style.firstLineIndent) || 0}em}
.preview-content p.exam-bullet{text-indent:0;padding-left:1.35em;position:relative}
.preview-content p.exam-bullet::before{content:"•";position:absolute;left:0.35em}
.preview-content p.listening-group-heading{font-weight:bold;font-style:italic;text-indent:0;text-align:left}
.vocabulary-option-table{width:100%;table-layout:fixed;border-collapse:collapse;margin:0 0 8px;border:0.75px solid #111;line-height:1.15}
.vocabulary-option-cell{border:0;padding:3px 6px;vertical-align:middle;white-space:nowrap;overflow:hidden;line-height:1.15}
.sentence-option-table{width:100%;table-layout:fixed;border-collapse:collapse;margin:0 0 8px;border:0.75px solid #111;line-height:1.2}
.sentence-option-cell{border:0;padding:2px 8px;vertical-align:top;word-break:break-word}
.choice-block{display:grid;grid-template-columns:2.75em minmax(0,1fr);margin:0 0 ${state.style.paragraphAfter}pt;text-align:left}
.choice-table{width:100%;table-layout:fixed;border-collapse:collapse;margin:0 0 ${state.style.paragraphAfter}pt;line-height:1.2}
.choice-table td{border:0;padding:0 6px 0 0;vertical-align:top;text-align:left}
.choice-table .choice-num{width:2.75em;white-space:nowrap}
.choice-block .choice-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:16px}
.chinese-text{font-family:"${state.style.cjkFontFamily}",宋体,serif}
.english-term{font-family:"Times New Roman",Times,serif;font-style:italic}
.chinese-gloss{font-family:楷体,"Kaiti SC","STKaiti",KaiTi,serif;font-style:normal}
.exam-emphasis,.exam-emphasis u{font-weight:bold;text-decoration:underline}
.exam-not,.exam-caps{font-weight:bold}
</style></head><body>${exportBody}</body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${baseName}.doc`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(isAnswer ? '答案已导出为 Word 兼容文件' : 'DOCX 不可用，已导出 Word 兼容文件');
}

bindEvents();
bindColumnResize();
renderAll();
if (state.savedAt && $('saveStatus')) {
  $('saveStatus').textContent = '已恢复本机草稿';
  $('saveStatus').classList.add('saved');
}
