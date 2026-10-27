import en from './en.js';
import de from './de.js';
import fr from './fr.js';
import es from './es.js';
import it from './it.js';
import pl from './pl.js';
import cz from './cz.js';
import da from './da.js';
import ru from './ru.js';
import uk from './uk.js';

const LANGUAGES = {en, de, fr, es, it, pl, cz, cs: cz, da, ru, uk};

const merge = (base, override) => {
    const result = {...base};
    Object.keys(override || {}).forEach(key => {
        const value = override[key];
        result[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] || {}, value) : value;
    });
    return result;
};

const cache = new Map();

/** Language pack for a Home Assistant language code (e.g. "de", "pt-BR"), English as fallback. */
export function getLanguage(code) {
    const key = String(code || 'en').toLowerCase().split('-')[0];
    if (!cache.has(key)) cache.set(key, merge(en, LANGUAGES[key] || {}));
    return cache.get(key);
}

/** Translate a dotted key, e.g. t(lang, 'card.air'). Placeholders: {name}. */
export function translate(lang, path, params = {}) {
    let value = path.split('.').reduce((node, part) => (node ? node[part] : undefined), lang);
    if (typeof value !== 'string') value = path;
    return value.replace(/\{(\w+)\}/g, (_, name) => (params[name] !== undefined ? params[name] : `{${name}}`));
}
