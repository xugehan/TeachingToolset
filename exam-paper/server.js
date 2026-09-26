const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 4173);
const publicDir = path.join(__dirname, 'public');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const LISTENING_GROUP_PATTERN = /Questions?\s+\d+\s*(?:through|to|-|–|—)\s*\d+\s+are\s+based\s+on\b/i;
/** Word Normal 页边距：2.54 cm = 1 inch = 1440 twips */
const WORD_NORMAL_MARGIN_TWIPS = 1440;

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function safePath(requestPath) {
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const resolved = path.resolve(publicDir, relative);
  return resolved.startsWith(publicDir) ? resolved : null;
}

function readRequestBody(req, maxBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) reject(new Error('Request body too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const FEEDBACK_PHOTO_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function saveFeedbackPhotos(photos) {
  if (!Array.isArray(photos) || !photos.length) return [];
  const photoDir = path.join(__dirname, 'data', 'feedback-photos');
  fs.mkdirSync(photoDir, { recursive: true });
  const saved = [];
  photos.slice(0, 4).forEach((photo, index) => {
    const type = String(photo?.type || '');
    const ext = FEEDBACK_PHOTO_TYPES[type];
    const dataUrl = String(photo?.data || '');
    const match = dataUrl.match(/^data:image\/(?:jpeg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!ext || !match) return;
    const buffer = Buffer.from(match[1], 'base64');
    if (!buffer.length || buffer.length > 2 * 1024 * 1024) return;
    const safeName = String(photo.name || `photo${index + 1}`).replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
    const file = `${Date.now()}-${index}${ext}`;
    fs.writeFileSync(path.join(photoDir, file), buffer);
    saved.push({ name: safeName, file });
  });
  return saved;
}

function loadDocx() {
  const candidates = [
    path.join(__dirname, 'node_modules', 'docx'),
    process.env.DOCX_NODE_MODULES ? path.join(process.env.DOCX_NODE_MODULES, 'docx') : null,
    'docx',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch (error) { /* try next */ }
  }
  return null;
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

function isReadingSection(section) {
  return ['readingA', 'readingB', 'readingC'].includes(section?.type);
}

function applyExamEmphasisMarkers(text, options = {}) {
  let value = String(text || '');
  // Use lowercase markers so boldUppercase (A-Z{2,}) cannot corrupt <<eu>> / <<eb>> tags.
  if (options.emphasizeQuotes) {
    value = value.replace(/["“]([^"”]+)["”]/g, (_, word) => `"<<eu>>${word}<</eu>>"`);
  }
  if (options.boldUppercase) {
    value = value.replace(/\b[A-Z]{2,}\b/g, '<<eb>>$&<</eb>>');
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
        value = value.replace(pattern, '<<eu>>$1<</eu>>');
      });
  }
  return value;
}

function splitRuns(line, style, docx, options = {}) {
  const runs = [];
  const normalizedSource = String(line || '').replace(/[（）]/g, (char) => (char === '（' ? '(' : ')'));
  const normalizedLine = applyExamEmphasisMarkers(normalizedSource, options);
  const baseFont = style.font || { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '宋体' };
  const chineseFont = { ...baseFont, eastAsia: baseFont.eastAsia || '宋体' };
  const kaiFont = { ...baseFont, eastAsia: '楷体' };
  const makeRun = (text, extra = {}) => new docx.TextRun({
    text,
    font: extra.kai ? kaiFont : (extra.chinese ? chineseFont : baseFont),
    size: style.size,
    italics: Object.prototype.hasOwnProperty.call(extra, 'italics')
      ? Boolean(extra.italics)
      : Boolean(options.italics),
    bold: Boolean(options.bold || extra.bold),
    underline: (options.underline || extra.underline) ? {} : undefined,
  });

  const pushPlainRich = (chunk) => {
    if (!chunk) return;
    const pattern = /(\(\d+\)\s*_{3,})|([A-Za-z][A-Za-z'-]*)\s*\(\s*([^()]*[\u3400-\u9fff][^()]*)\s*\)|([\u3400-\u9fff]+)/gi;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(chunk))) {
      if (match.index > cursor) runs.push(makeRun(chunk.slice(cursor, match.index)));
      if (match[1]) runs.push(makeRun(match[1]));
      if (match[2]) {
        runs.push(makeRun(match[2], { italics: true }));
        runs.push(makeRun(` (${match[3].trim()})`, { kai: true, italics: false }));
      }
      if (match[4]) runs.push(makeRun(match[4], { chinese: true }));
      cursor = match.index + match[0].length;
    }
    if (cursor < chunk.length) runs.push(makeRun(chunk.slice(cursor)));
  };

  const markerPattern = /<<(eu|eb)>>([\s\S]*?)<<\/\1>>/g;
  let cursor = 0;
  let marker;
  while ((marker = markerPattern.exec(normalizedLine))) {
    if (marker.index > cursor) pushPlainRich(normalizedLine.slice(cursor, marker.index));
    const kind = marker[1];
    const inner = marker[2];
    if (kind === 'eu') runs.push(makeRun(inner, { bold: true, underline: true, italics: false }));
    else runs.push(makeRun(inner, { bold: true, italics: false }));
    cursor = marker.index + marker[0].length;
  }
  if (cursor < normalizedLine.length) pushPlainRich(normalizedLine.slice(cursor));
  if (!runs.length) runs.push(makeRun(normalizedLine || ' '));
  return runs;
}

function parseChoiceLine(line) {
  const raw = String(line || '');
  const startsWithQuestion = /^\s*\d+\s*[.．、)）]\s*/.test(raw);
  const startsWithChoice = /^\s*[A-D]\s*[.．、)）]\s*/.test(raw);
  if (!startsWithQuestion && !startsWithChoice) return null;
  const markerPattern = /(^|\s)([A-D])\s*[.．、)）]\s*/g;
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
  if (options.length <= 1) return 1;
  const longest = Math.max(...options.map((option) => option.text.length));
  const total = options.reduce((sum, option) => sum + option.text.length, 0);
  if (options.length === 4 && longest <= 18 && total <= 70) return 4;
  if (options.length === 3 && longest <= 20 && total <= 55) return 3;
  return 2;
}

function choiceTabStops(columns, docx) {
  // 两列时对齐到四列中的 A、C 列，保证同大题竖列一致
  const positions = { 1: [720], 2: [720, 4320], 3: [720, 2520, 4320], 4: [720, 2520, 4320, 6120] };
  return positions[columns].map((position) => ({ type: docx.TabStopType.LEFT, position }));
}

function choiceTabStopsForLayout(layout, docx) {
  if (layout === 'row4') return choiceTabStops(4, docx);
  if (layout === 'grid2x2') return choiceTabStops(2, docx);
  return choiceTabStops(1, docx);
}

function choiceParagraphs(choice, style, docx, spacing, indent) {
  const columns = choiceColumnCount(choice.options);
  const paragraphs = [];
  for (let start = 0; start < choice.options.length; start += columns) {
    const row = choice.options.slice(start, start + columns);
    const children = [];
    if (start === 0 && choice.prefix) children.push(...splitRuns(choice.prefix, style, docx));
    children.push(new docx.TextRun({ text: '\t', font: style.font, size: style.size }));
    row.forEach((option, index) => {
      children.push(...splitRuns(`${option.label}. ${option.text}`, style, docx));
      if (index < row.length - 1) children.push(new docx.TextRun({ text: '\t', font: style.font, size: style.size }));
    });
    paragraphs.push(new docx.Paragraph({ spacing, indent, tabStops: choiceTabStops(columns, docx), children }));
  }
  return paragraphs;
}

function choiceLayoutTier(options) {
  const list = (options || []).filter(Boolean);
  if (list.length <= 1) return 'stack4';
  const longest = Math.max(...list.map((option) => String(option.text || '').length));
  const total = list.reduce((sum, option) => sum + String(option.text || '').length, 0);
  if (list.length === 4) {
    if (longest <= 18 && total <= 60) return 'row4';
    if (longest <= 42 && total <= 150) return 'grid2x2';
    return 'stack4';
  }
  if (list.length === 3 && longest <= 22 && total <= 60) return 'row4';
  if (list.length === 2 && longest <= 36 && total <= 70) return 'grid2x2';
  return 'stack4';
}

function choiceBlockParagraphs(block, style, docx, spacing, indent, richOptions = {}) {
  const options = (block.options || []).filter(Boolean);
  const layout = block.layout || choiceLayoutTier(options);
  const columns = layout === 'row4' ? 4 : layout === 'grid2x2' ? 2 : 1;
  const stemOpts = richOptions.stem || {};
  const optionOpts = richOptions.option || {};
  const paragraphs = [];
  const hasStem = Boolean(String(block.stem || '').trim());

  // 题干单独成段，避免 A 选项跟在题干同一行
  if (hasStem) {
    paragraphs.push(new docx.Paragraph({
      spacing: { ...spacing, after: 0 },
      indent,
      children: [
        ...splitRuns(`${block.number}. `, style, docx),
        ...splitRuns(String(block.stem), style, docx, stemOpts),
      ],
    }));
  }

  for (let start = 0; start < options.length; start += columns) {
    const row = options.slice(start, start + columns);
    const children = [];
    if (!hasStem && start === 0) {
      children.push(...splitRuns(`${block.number}. `, style, docx));
    }
    children.push(new docx.TextRun({ text: '\t', font: style.font, size: style.size }));
    row.forEach((option, index) => {
      children.push(...splitRuns(`${option.label}. ${option.text || ''}`, style, docx, optionOpts));
      if (index < row.length - 1) {
        children.push(new docx.TextRun({ text: '\t', font: style.font, size: style.size }));
      }
    });
    paragraphs.push(new docx.Paragraph({
      spacing,
      indent: hasStem ? { firstLine: 0 } : indent,
      tabStops: choiceTabStopsForLayout(layout, docx),
      children,
    }));
  }
  return paragraphs;
}

function renderSectionContent(section, style, docx, styleConfig, lineSpacing, after, groupSpacingBefore) {
  const { Paragraph, AlignmentType, TextRun } = docx;
  const children = [];
  const useBlocks = section.type !== 'vocabulary'
    && Array.isArray(section.contentBlocks)
    && section.contentBlocks.length;

  if (section.type === 'sectionC') {
    const bank = resolveSentenceBank(section, String(section.content || ''));
    if (bank) children.push(createSentenceOptionsTable(bank, style, docx, lineSpacing));
  }

  if (useBlocks) {
    const reading = isReadingSection(section);
    const focusTargets = reading ? collectReadingFocusTargets(section.contentBlocks) : [];
    const stemOpts = reading ? { emphasizeQuotes: true, boldUppercase: true } : {};
    let passageParagraphIndex = 0;

    section.contentBlocks.forEach((block) => {
      if (block.type === 'blank') return;
      const spacing = { before: 0, after, line: lineSpacing };
      const indentTwips = section.type === 'translation'
        ? 0
        : Math.round(Number(styleConfig.firstLineIndent || 0) * 240);
      const indent = { firstLine: indentTwips };

      if (block.type === 'listening-heading') {
        children.push(new Paragraph({
          spacing: { after: 0, line: lineSpacing },
          children: [new TextRun({ text: ' ', size: style.size, font: style.font })],
        }));
        children.push(new Paragraph({
          spacing: { before: 0, after: 0, line: lineSpacing },
          indent: { firstLine: 0 },
          children: splitRuns(block.text, style, docx, { bold: true, italics: true }),
        }));
        return;
      }
      if (block.type === 'content-title') {
        const isWriting = section.type === 'writing';
        children.push(new Paragraph({
          alignment: isWriting ? AlignmentType.JUSTIFIED : AlignmentType.CENTER,
          spacing: { after: 0, line: lineSpacing },
          indent: isWriting ? { firstLine: Math.round(Number(styleConfig.firstLineIndent || 0) * 240) } : undefined,
          children: splitRuns(block.text, style, docx, isWriting ? {} : { bold: true }),
        }));
        return;
      }
      if (block.type === 'bullet') {
        children.push(new Paragraph({
          spacing: { ...spacing, after: 0 },
          numbering: { reference: 'exam-bullets', level: 0 },
          children: splitRuns(block.text, style, docx),
        }));
        return;
      }
      if (block.type === 'question-choices') {
        children.push(...choiceBlockParagraphs(block, style, docx, { ...spacing, after: 0 }, { firstLine: 0 }, { stem: stemOpts }));
        return;
      }
      if (block.type === 'question-stem') {
        children.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing,
          indent,
          children: splitRuns(`${block.number}. ${block.text}`, style, docx, stemOpts),
        }));
        return;
      }
      if (block.type === 'paragraph') {
        passageParagraphIndex += 1;
        const passageOpts = reading
          ? readingHighlightOptionsForParagraph(focusTargets, passageParagraphIndex)
          : {};
        children.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing,
          indent,
          children: splitRuns(block.text, style, docx, passageOpts),
        }));
        return;
      }
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing,
        indent,
        children: splitRuns(block.text, style, docx),
      }));
    });
    return children;
  }

  const preparedContent = prepareSectionContent(String(section.content || ''), section);
  const vocabulary = section.type === 'vocabulary'
    ? resolveVocabularyBank(section, preparedContent)
    : null;
  if (vocabulary) children.push(createVocabularyTable(vocabulary, style, docx, lineSpacing));

  let lineSource = preparedContent;
  if (section.type === 'sectionC') {
    const bank = resolveSentenceBank(section, preparedContent);
    if (bank) lineSource = bank.remainder;
  } else if (vocabulary) {
    lineSource = vocabulary.remainder;
  }

  let seenContent = false;
  lineSource.split('\n').forEach((line) => {
    const trimmed = line.trim();
    const bulletText = parseBulletLine(trimmed);
    const contentTitle = !seenContent && !bulletText && isLikelyContentTitle(line);
    if (trimmed) seenContent = true;
    if (contentTitle) {
      const isWriting = section.type === 'writing';
      children.push(new Paragraph({
        alignment: isWriting ? AlignmentType.JUSTIFIED : AlignmentType.CENTER,
        spacing: { after: 0, line: lineSpacing },
        indent: isWriting ? { firstLine: Math.round(Number(styleConfig.firstLineIndent || 0) * 240) } : undefined,
        children: splitRuns(trimmed, style, docx, isWriting ? {} : { bold: true }),
      }));
      return;
    }
    if (bulletText) {
      children.push(new Paragraph({
        spacing: { before: 0, after: 0, line: lineSpacing },
        numbering: { reference: 'exam-bullets', level: 0 },
        children: splitRuns(bulletText, style, docx),
      }));
      return;
    }
    const groupHeading = isListeningGroupHeading(line, section);
    const spacing = {
      before: groupHeading ? groupSpacingBefore : 0,
      after: groupHeading ? 0 : after,
      line: section.lineSpacing ? Math.round(Number(section.lineSpacing) * 240) : lineSpacing,
    };
    const indent = {
      firstLine: groupHeading || section.type === 'translation'
        ? 0
        : Math.round(Number(styleConfig.firstLineIndent || 0) * 240),
    };
    if (groupHeading) {
      children.push(new Paragraph({
        spacing: { after: 0, line: lineSpacing },
        children: [new TextRun({ text: ' ', size: style.size, font: style.font })],
      }));
      children.push(new Paragraph({ spacing: { ...spacing, before: 0 }, indent, children: splitRuns(line, style, docx, { bold: true, italics: true }) }));
      return;
    }
    const choice = parseChoiceLine(line);
    if (choice) children.push(...choiceParagraphs(choice, style, { ...docx, TabStopType: docx.TabStopType }, spacing, { firstLine: 0 }));
    else children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing, indent, children: splitRuns(line, style, docx) }));
  });
  return children;
}

function splitInstructionRuns(text, style, docx) {
  return splitRuns(String(text || ''), style, docx, { italics: true, bold: false });
}

function isListeningGroupHeading(line, section) {
  return section?.type === 'listening' && LISTENING_GROUP_PATTERN.test(String(line || ''));
}

function splitListeningGroupSegments(line) {
  const pattern = /Questions?\s+\d+\s*(?:through|to|-|–|—)\s*\d+\s+are\s+based\s+on\b/gi;
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

/** docx border size is in 1/8 pt; 4 ≈ 0.5pt hairline */
function tableOuterBorder(docx, size = 4) {
  return { style: docx.BorderStyle.SINGLE, size, color: '000000' };
}

function tableNoBorder(docx) {
  return { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
}

/** 仅外侧有框线的单元格边框（内部分隔线关闭） */
function outerBoxCellBorders(docx, { top = false, bottom = false, left = false, right = false } = {}) {
  const outer = tableOuterBorder(docx);
  const none = tableNoBorder(docx);
  return {
    top: top ? outer : none,
    bottom: bottom ? outer : none,
    left: left ? outer : none,
    right: right ? outer : none,
  };
}

function vocabularyOptionText(option) {
  if (!option?.word) return '';
  return `${option.label}. ${option.word}`;
}

function vocabularyColumnWidthsDxa(options, totalDxa = 10000) {
  const cells = [...(options || []), { label: '', word: '' }];
  while (cells.length < 12) cells.push({ label: '', word: '' });
  const weights = [];
  for (let col = 0; col < 6; col += 1) {
    const top = vocabularyOptionText(cells[col]).length;
    const bottom = vocabularyOptionText(cells[col + 6]).length;
    weights.push(Math.max(top, bottom, 3));
  }
  const sum = weights.reduce((total, w) => total + w, 0) || 1;
  const widths = weights.map((w) => Math.max(900, Math.round((w / sum) * totalDxa)));
  const drift = totalDxa - widths.reduce((total, w) => total + w, 0);
  widths[widths.length - 1] += drift;
  return widths;
}

function createVocabularyTable(parsed, style, docx, lineSpacing) {
  const { Table, TableRow, TableCell, WidthType, TableLayoutType, Paragraph, TextRun } = docx;
  const none = tableNoBorder(docx);
  const tightLine = Math.min(lineSpacing || 240, 240);
  const cells = [...parsed.options, { label: '', word: '' }];
  while (cells.length < 12) cells.push({ label: '', word: '' });
  const colCount = 6;
  const rowCount = 2;
  const colWidths = vocabularyColumnWidthsDxa(cells);
  const rows = [0, 1].map((rowIndex) => new TableRow({
    children: cells.slice(rowIndex * colCount, rowIndex * colCount + colCount).map((option, colIndex) => new TableCell({
      width: { size: colWidths[colIndex], type: WidthType.DXA },
      margins: { top: 20, bottom: 20, left: 60, right: 60 },
      borders: outerBoxCellBorders(docx, {
        top: rowIndex === 0,
        bottom: rowIndex === rowCount - 1,
        left: colIndex === 0,
        right: colIndex === colCount - 1,
      }),
      children: [new Paragraph({
        spacing: { before: 0, after: 0, line: tightLine },
        children: option.word
          ? splitRuns(vocabularyOptionText(option), style, docx)
          : [new TextRun({ text: ' ', size: style.size, font: style.font })],
      })],
    })),
  }));
  // Outer box comes from cell borders only — table borders would double the stroke.
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    layout: TableLayoutType.FIXED,
    borders: {
      top: none,
      bottom: none,
      left: none,
      right: none,
      insideHorizontal: none,
      insideVertical: none,
    },
    rows,
  });
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

function createSentenceOptionsTable(parsed, style, docx, lineSpacing) {
  const { Table, TableRow, TableCell, WidthType, TableLayoutType, Paragraph } = docx;
  const none = tableNoBorder(docx);
  const options = parsed.options || [];
  const rows = options.map((option, rowIndex) => new TableRow({
    children: [new TableCell({
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: { top: 20, bottom: 20, left: 80, right: 80 },
      borders: outerBoxCellBorders(docx, {
        top: rowIndex === 0,
        bottom: rowIndex === options.length - 1,
        left: true,
        right: true,
      }),
      children: [new Paragraph({
        spacing: { before: 0, after: 0, line: lineSpacing },
        children: splitRuns(`${option.label}. ${option.text || ''}`, style, docx),
      })],
    })],
  }));
  // Outer box comes from cell borders only — table borders would double the stroke.
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: none,
      bottom: none,
      left: none,
      right: none,
      insideHorizontal: none,
      insideVertical: none,
    },
    rows,
  });
}

function roman(number) {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][number - 1] || String(number);
}

function paperSectionGroupKey(section) {
  if (section?.sectionLabel) return `${section.major || ''}|${section.sectionLabel}`;
  return `${section.major || ''}|__id_${section.id || ''}`;
}

function sectionHeadingText(section) {
  if (section?.sectionLabel) return section.sectionLabel;
  return section?.sectionTitle || '';
}

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

function shouldLeadWithBlankLine(section, chrome) {
  if (!section) return false;
  if (section.type === 'listening' && (section.listeningPart === 'B' || section.sectionLabel === 'Section B')) {
    return Boolean(chrome?.showSectionHeading);
  }
  if (section.type === 'vocabulary') return Boolean(chrome?.showSectionHeading);
  if (section.type === 'readingA' || section.type === 'readingB' || section.type === 'readingC') return true;
  if (section.type === 'sectionC') return Boolean(chrome?.showSectionHeading);
  return false;
}

function buildPaperChildren(payload, docx, style, lineSpacing, after, groupSpacingBefore) {
  const { Paragraph, TextRun, AlignmentType } = docx;
  const exam = payload.exam || {};
  const styleConfig = payload.style || {};
  const { font, size } = style;
  const children = [];

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [new TextRun({ text: exam.title || '试卷', bold: true, size: 32, font })],
  }));
  const metaText = `（满分：${exam.totalScore || 0} 分   时间：${exam.duration || ''}）`;
  if (exam.yearMonth) {
    const { Table, TableRow, TableCell, WidthType, BorderStyle, TableLayoutType } = docx;
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: {
        top: none, bottom: none, left: none, right: none,
        insideHorizontal: none, insideVertical: none,
      },
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 8000, type: WidthType.DXA },
            borders: { top: none, bottom: none, left: none, right: none },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0, line: lineSpacing },
              children: [new TextRun({ text: metaText, size, font })],
            })],
          }),
          new TableCell({
            width: { size: 2000, type: WidthType.DXA },
            borders: { top: none, bottom: none, left: none, right: none },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0, line: lineSpacing },
              children: [new TextRun({ text: String(exam.yearMonth), size, font })],
            })],
          }),
        ],
      })],
    }));
    children.push(new Paragraph({
      spacing: { after: 300, line: lineSpacing },
      children: [new TextRun({ text: '', size, font })],
    }));
  } else {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: metaText, size, font })],
    }));
  }

  let lastMajorKey = null;
  const sections = payload.sections || [];
  const chromeList = resolvePaperSectionChrome(sections);
  sections.forEach((section, index) => {
    const chrome = chromeList[index];
    const majorKey = `${section.major || ''}|${section.majorTitle || section.title || ''}`;

    if (section.major && majorKey !== lastMajorKey) {
      children.push(new Paragraph({
        spacing: { before: 120, after: 60, line: lineSpacing },
        children: [new TextRun({
          text: `${section.major}. ${section.majorTitle || ''}`,
          bold: true,
          size,
          font,
        })],
      }));
    } else if (!section.major) {
      children.push(new Paragraph({
        spacing: { before: 120, after: 60, line: lineSpacing },
        children: [new TextRun({ text: section.title || '未命名大题', bold: true, size, font })],
      }));
    }

    if (shouldLeadWithBlankLine(section, chrome)) {
      children.push(new Paragraph({
        spacing: { after: 0, line: lineSpacing },
        children: [new TextRun({ text: ' ', size, font })],
      }));
    }

    if (chrome.showSectionHeading) {
      children.push(new Paragraph({
        spacing: { after: 60, line: lineSpacing },
        children: [new TextRun({ text: chrome.sectionHeading, bold: true, size, font })],
      }));
    }

    if (chrome.showInstruction) {
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 60, line: lineSpacing },
        children: splitInstructionRuns(chrome.instruction, style, docx),
      }));
    }

    if (['summary', 'writing'].includes(section.type) && section.start) {
      children.push(new Paragraph({
        spacing: { after: 40, line: lineSpacing },
        children: [new TextRun({ text: `${section.start}.`, size, font })],
      }));
    }

    if (chrome.showReadingPartLabel) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60, line: lineSpacing },
        children: [new TextRun({ text: section.readingPartLabel, bold: true, size, font })],
      }));
    }

    if (chrome.showPartLabel) {
      children.push(new Paragraph({
        spacing: { after: 60, line: lineSpacing },
        children: [new TextRun({ text: section.partLabel, bold: true, size, font })],
      }));
    }

    children.push(...renderSectionContent(section, style, docx, styleConfig, lineSpacing, after, groupSpacingBefore));

    lastMajorKey = majorKey;
  });

  return children;
}

function buildAnswerChildren(payload, docx, style, lineSpacing, after) {
  const { Paragraph, TextRun, AlignmentType } = docx;
  const exam = payload.exam || {};
  const { font, size } = style;
  const children = [];

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: `${exam.title || '试卷'} 答案`, bold: true, size: 32, font })],
  }));

  const blocks = payload.answerBlocks || [];
  blocks.forEach((block) => {
    if (block.showMajor && (block.major || block.majorTitle)) {
      children.push(new Paragraph({
        spacing: { before: 160, after: 60, line: lineSpacing },
        children: [new TextRun({
          text: `${block.major ? `${block.major}. ` : ''}${block.majorTitle || ''}`,
          bold: true,
          size,
          font,
        })],
      }));
    } else if (!block.showMajor && !block.showSectionHeading && !block.subLabel && block.title) {
      children.push(new Paragraph({
        spacing: { before: 120, after: 60, line: lineSpacing },
        children: [new TextRun({ text: block.title || '', bold: true, size, font })],
      }));
    }

    if (block.showSectionHeading && block.sectionHeading) {
      children.push(new Paragraph({
        spacing: { before: 80, after: 40, line: lineSpacing },
        children: [new TextRun({ text: block.sectionHeading, bold: true, size, font })],
      }));
    }

    if (block.subLabel) {
      children.push(new Paragraph({
        alignment: block.subLabelKind === 'reading' ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 60, after: 40, line: lineSpacing },
        children: [new TextRun({ text: block.subLabel, bold: true, size, font })],
      }));
    }

    (block.parts || []).forEach((part) => {
      const text = String(part.text || '').trim();
      if (!text) {
        children.push(new Paragraph({
          spacing: { after, line: lineSpacing },
          children: [new TextRun({ text: '（尚未填写答案）', italics: true, size, font })],
        }));
        return;
      }
      text.split('\n').forEach((line) => {
        children.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after, line: lineSpacing },
          children: splitRuns(line, style, docx),
        }));
      });
    });
  });

  const scripts = payload.listeningScripts || [];
  if (scripts.length) {
    children.push(new Paragraph({
      spacing: { before: 200, after: 80, line: lineSpacing },
      children: [new TextRun({ text: '听力原文', bold: true, size, font })],
    }));
    scripts.forEach((block) => {
      if (block.sectionLabel) {
        children.push(new Paragraph({
          spacing: { before: 100, after: 40, line: lineSpacing },
          children: [new TextRun({ text: block.sectionLabel, bold: true, size, font })],
        }));
      }
      String(block.text || '').split('\n').forEach((line) => {
        children.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after, line: lineSpacing },
          children: splitRuns(line, style, docx),
        }));
      });
    });
  }

  return children;
}

async function createDocxBuffer(payload) {
  const docx = loadDocx();
  if (!docx) throw new Error('docx runtime is not available — run npm install');
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, PageNumber, LevelFormat } = docx;
  const exam = payload.exam || {};
  const styleConfig = payload.style || {};
  const font = {
    ascii: styleConfig.fontFamily || 'Times New Roman',
    eastAsia: styleConfig.cjkFontFamily || '宋体',
    hAnsi: styleConfig.fontFamily || 'Times New Roman',
  };
  const size = Math.round(Number(styleConfig.fontSize || 10.5) * 2);
  const lineSpacing = styleConfig.lineSpacing === 'fixed'
    ? Math.round(Number(styleConfig.fixedLineHeight || 18) * 20)
    : Math.round(Number(styleConfig.lineSpacing || 1.2) * 240);
  const after = Math.round(Number(styleConfig.paragraphAfter ?? 0) * 20);
  const groupSpacingBefore = lineSpacing;
  const style = { font, size };

  const children = payload.documentType === 'answer'
    ? buildAnswerChildren(payload, docx, style, lineSpacing, after)
    : buildPaperChildren(payload, docx, style, lineSpacing, after, groupSpacingBefore);

  const page = exam.paperSize === 'Letter'
    ? { width: 12240, height: 15840 }
    : { width: 11906, height: 16838 };

  const document = new Document({
    numbering: {
      config: [{
        reference: 'exam-bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: 720, hanging: 360 },
            },
          },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: page,
          margin: {
            top: WORD_NORMAL_MARGIN_TWIPS,
            bottom: WORD_NORMAL_MARGIN_TWIPS,
            left: WORD_NORMAL_MARGIN_TWIPS,
            right: WORD_NORMAL_MARGIN_TWIPS,
          },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: lineSpacing },
            children: [
              new TextRun({ text: '第 ', size, font }),
              new TextRun({ children: [PageNumber.CURRENT], size, font }),
              new TextRun({ text: ' 页 / 共 ', size, font }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size, font }),
              new TextRun({ text: ' 页', size, font }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(document);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health') {
    return send(res, 200, JSON.stringify({ ok: true, name: 'exam-paper-generator', docx: Boolean(loadDocx()) }), mime['.json']);
  }

  if (req.method === 'POST' && url.pathname === '/api/feedback') {
    return readRequestBody(req, 16 * 1024 * 1024).then((body) => {
      const payload = JSON.parse(body || '{}');
      const message = String(payload.message || '').trim();
      if (!message) {
        return send(res, 400, JSON.stringify({ error: '请填写问题描述' }), mime['.json']);
      }
      if (message.length > 2000) {
        return send(res, 400, JSON.stringify({ error: '问题描述有点长，精简到 2000 字以内吧' }), mime['.json']);
      }
      const photos = saveFeedbackPhotos(payload.photos);
      const entry = {
        at: new Date().toISOString(),
        name: String(payload.name || '').trim().slice(0, 40),
        message: message.slice(0, 2000),
        photos,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
      };
      const feedbackDir = path.join(__dirname, 'data');
      const feedbackFile = path.join(feedbackDir, 'feedback.jsonl');
      fs.mkdirSync(feedbackDir, { recursive: true });
      fs.appendFileSync(feedbackFile, `${JSON.stringify(entry)}\n`, 'utf8');
      return send(res, 200, JSON.stringify({ ok: true, photos: photos.length }), mime['.json']);
    }).catch((error) => send(res, 500, JSON.stringify({ error: error.message }), mime['.json']));
  }

  if (req.method === 'POST' && url.pathname === '/api/export-docx') {
    return readRequestBody(req).then(async (body) => {
      const payload = JSON.parse(body);
      const buffer = await createDocxBuffer(payload);
      const suffix = payload.documentType === 'answer' ? ' 答案' : '';
      const filename = `${(payload.exam?.title || '试卷').replace(/[\\/:*?"<>|]/g, '_')}${suffix}.docx`;
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    }).catch((error) => send(res, 500, JSON.stringify({ error: error.message }), mime['.json']));
  }

  if (req.method !== 'GET') {
    return send(res, 405, 'Method Not Allowed');
  }

  const filePath = safePath(url.pathname);
  if (!filePath) return send(res, 403, 'Forbidden');

  fs.readFile(filePath, (error, data) => {
    if (error) return send(res, 404, 'Not Found');
    send(res, 200, data, mime[path.extname(filePath)] || 'application/octet-stream');
  });
});

server.listen(port, process.env.HOST || '0.0.0.0', () => {
  const host = process.env.HOST || '0.0.0.0';
  console.log(`Exam Paper Generator running at http://127.0.0.1:${port}`);
  if (host === '0.0.0.0') {
    console.log(`LAN: http://<this-computer-ip>:${port}`);
  }
});
