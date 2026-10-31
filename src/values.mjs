import { tokenize, TokenType as T } from '@csstools/css-tokenizer';

export function tokens(css) {
  const errors = [];
  const items = tokenize({ css }, { onParseError: error => errors.push(error) });
  return { items: items.filter(t => t[0] !== T.EOF), errors };
}

export function significant(css) {
  return tokens(css).items.filter(t => t[0] !== T.Comment && t[0] !== T.Whitespace);
}

export function identifier(css) {
  const items = significant(css);
  return items.length === 1 && items[0][0] === T.Ident ? items[0][4].value : null;
}

export function atName(css) {
  const items = significant(`@${css}`);
  return items.length === 1 && items[0][0] === T.AtKeyword ? items[0][4].value.toLowerCase() : null;
}

export function initialTokens(raw) {
  const output = [];
  let space = false;
  for (const t of tokens(raw).items) {
    if (t[0] === T.Comment) continue;
    if (t[0] === T.Whitespace) {
      space = output.length > 0;
      continue;
    }
    if (space) output.push(['space']);
    space = false;
    output.push([t[0], t[0] === T.String ? t[4].value : t[1]]);
  }
  return output;
}

export function descriptorValue(name, raw) {
  const items = significant(raw);
  if (name === 'initial-value') return { value: initialTokens(raw), readable: true };
  if (name === 'syntax') {
    return items.length === 1 && items[0][0] === T.String
      ? { value: items[0][4].value, readable: items[0][4].value.length > 0 }
      : { value: null, readable: false };
  }
  const word = items.length === 1 && items[0][0] === T.Ident ? items[0][4].value.toLowerCase() : null;
  return { value: word === 'true' ? true : word === 'false' ? false : null, readable: word === 'true' || word === 'false' };
}
