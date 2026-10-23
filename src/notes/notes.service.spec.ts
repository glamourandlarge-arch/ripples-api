import type { NoteDocument } from './note.schema.js';
import { toNoteResponse } from './notes.service.js';

describe('toNoteResponse', () => {
  it('maps the document id to id', () => {
    const note = {
      _id: { toString: () => 'abc123' },
      title: 'Intro',
      detail: 'A starting note.',
    } as NoteDocument;

    expect(toNoteResponse(note)).toEqual({
      id: 'abc123',
      title: 'Intro',
      detail: 'A starting note.',
    });
  });
});
