const DEFAULT_TARGET_NODE_ID = '61:6';
const DEFAULT_TEXT_LAYER_NAME = 'WORK_LOG';
const DEFAULT_BRIDGE_URL = 'http://localhost:3927';

figma.showUI(__html__, { width: 420, height: 520 });

figma.ui.postMessage({
  type: 'init',
  targetNodeId: DEFAULT_TARGET_NODE_ID,
  textLayerName: DEFAULT_TEXT_LAYER_NAME,
  bridgeUrl: DEFAULT_BRIDGE_URL,
});

async function getNodeById(nodeId) {
  if (typeof figma.getNodeByIdAsync === 'function') {
    return await figma.getNodeByIdAsync(nodeId);
  }

  return figma.getNodeById(nodeId);
}

function findTextNodeByName(node, name) {
  if (node.type === 'TEXT' && node.name === name) {
    return node;
  }

  if (!('children' in node)) {
    return null;
  }

  for (const child of node.children) {
    const found = findTextNodeByName(child, name);
    if (found) return found;
  }

  return null;
}

async function fallbackFontName() {
  const fonts = await figma.listAvailableFontsAsync();
  const interRegular = fonts.find((font) => font.fontName.family === 'Inter' && font.fontName.style === 'Regular');
  const selectedFont = interRegular || fonts[0];
  return selectedFont ? selectedFont.fontName : null;
}

async function loadTextNodeFont(textNode) {
  let fontName = textNode.fontName;

  if (textNode.characters.length > 0 && typeof textNode.getRangeFontName === 'function') {
    fontName = textNode.getRangeFontName(textNode.characters.length - 1, textNode.characters.length);
  }

  if (!fontName || fontName === figma.mixed) {
    fontName = await fallbackFontName();
  }

  if (!fontName) {
    throw new Error('No available font found.');
  }

  await figma.loadFontAsync(fontName);
  return fontName;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readDisplayDate(text) {
  const match = text.trimStart().match(/^(\d{1,2}\/\d{1,2})\b/);
  if (!match) {
    throw new Error('Append text must start with a display date like 5/12.');
  }

  return match[1];
}

function buildMergeOperation(existingText, incomingText) {
  const trimmedIncoming = incomingText.trimEnd();
  if (!trimmedIncoming) {
    throw new Error('Append text is empty.');
  }

  const displayDate = readDisplayDate(trimmedIncoming);
  const normalizedExisting = existingText.trimEnd();
  const sectionPattern = new RegExp(
    `(^|\\n\\n)${escapeRegExp(displayDate)}\\n\\n[\\s\\S]*?(?=\\n\\n\\d{1,2}\\/\\d{1,2}\\n\\n|$)`,
    'g',
  );
  const matches = [...normalizedExisting.matchAll(sectionPattern)];

  if (matches.length > 0) {
    const firstMatch = matches[0];
    const firstStart = firstMatch.index + firstMatch[1].length;
    const deleteRanges = matches.map((match, index) => ({
      start: index === 0 ? match.index + match[1].length : match.index,
      end: match.index + match[0].length,
    }));

    return {
      mode: 'replaced',
      insertAt: firstStart,
      deleteRanges,
      text: trimmedIncoming,
    };
  }

  const separator = normalizedExisting.length > 0 ? '\n\n' : '';
  return {
    mode: 'appended',
    insertAt: existingText.length,
    deleteRanges: [],
    text: `${separator}${trimmedIncoming}`,
  };
}

function preserveCurrentTextWidth(textNode, width) {
  if (typeof textNode.resize !== 'function') {
    return 'Text layer does not support resizing.';
  }

  try {
    const x = textNode.x;
    if ('textAutoResize' in textNode) {
      textNode.textAutoResize = 'HEIGHT';
    }
    textNode.resize(width, textNode.height);
    textNode.x = x;
    return null;
  } catch (error) {
    return error.message;
  }
}

function decorateAppendedText(_textNode, _startIndex, _endIndex) {
  return null;
}

async function appendWorkLog({ targetNodeId = DEFAULT_TARGET_NODE_ID, textLayerName = DEFAULT_TEXT_LAYER_NAME, text }) {
  const normalizedTargetNodeId = targetNodeId || DEFAULT_TARGET_NODE_ID;
  const normalizedTextLayerName = textLayerName || DEFAULT_TEXT_LAYER_NAME;
  const targetNode = await getNodeById(normalizedTargetNodeId);
  if (!targetNode) {
    throw new Error(`Target node not found: ${normalizedTargetNodeId}`);
  }

  const textNode =
    targetNode.type === 'TEXT' && targetNode.name === normalizedTextLayerName
      ? targetNode
      : findTextNodeByName(targetNode, normalizedTextLayerName);

  if (!textNode) {
    throw new Error(`Text layer "${normalizedTextLayerName}" was not found inside ${normalizedTargetNodeId}.`);
  }

  await loadTextNodeFont(textNode);

  const currentTextWidth = textNode.width;
  const mergeOperation = buildMergeOperation(textNode.characters, text);
  if (
    mergeOperation.deleteRanges.length === 1 &&
    textNode.characters.slice(mergeOperation.deleteRanges[0].start, mergeOperation.deleteRanges[0].end) ===
      mergeOperation.text
  ) {
    figma.notify('Work log already up to date. Nothing changed.');
    return { skipped: true, layerName: textNode.name };
  }

  const appendStartIndex = mergeOperation.insertAt;
  for (const range of [...mergeOperation.deleteRanges].sort((a, b) => b.start - a.start)) {
    if (range.start !== range.end) {
      textNode.deleteCharacters(range.start, range.end);
    }
  }
  textNode.insertCharacters(mergeOperation.insertAt, mergeOperation.text, 'AFTER');

  const decorationWarning = decorateAppendedText(textNode, appendStartIndex, textNode.characters.length);
  const widthWarning = preserveCurrentTextWidth(textNode, currentTextWidth);
  const layoutWarning = [decorationWarning, widthWarning].filter(Boolean).join(' ');
  figma.currentPage.selection = [textNode];
  figma.viewport.scrollAndZoomIntoView([textNode]);
  figma.notify(
    layoutWarning
      ? `Updated work log, but layout restore failed: ${layoutWarning}`
      : `Updated work log (${mergeOperation.mode}) in ${textNode.name}.`,
    layoutWarning ? { error: true } : undefined,
  );

  return { skipped: false, mode: mergeOperation.mode, layerName: textNode.name, layoutWarning };
}

figma.ui.onmessage = async (message) => {
  if (message.type === 'cancel') {
    figma.closePlugin();
    return;
  }

  if (message.type !== 'append-work-log') {
    return;
  }

  try {
    const result = await appendWorkLog(message);
    figma.ui.postMessage({ type: 'append-result', ok: true, jobId: message.jobId || message.id, result });
  } catch (error) {
    figma.notify(error.message, { error: true });
    figma.ui.postMessage({ type: 'append-result', ok: false, jobId: message.jobId || message.id, error: error.message });
  }
};
