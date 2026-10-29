import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePdfPages } from '../pdf-pages.js';

test('blank page selection imports every page', () => {
    assert.deepEqual(parsePdfPages('  ', 3), [1, 2, 3]);
});
test('mixed ranges are deduplicated and sorted in document order', () => {
    assert.deepEqual(parsePdfPages(' 5, 2 - 4, 2, 1 ', 5), [1, 2, 3, 4, 5]);
});
test('invalid syntax, reversed ranges, and out-of-bounds pages are rejected', () => {
    for (const value of ['0', '4', '3-1', '1-4', '-1', '1.5', '1,', 'all', '1--2', '9007199254740993']) {
        assert.throws(() => parsePdfPages(value, 3), undefined, value);
    }
});
