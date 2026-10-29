import type { Note } from './note.entity.js';
import { toNoteResponse } from './notes.service.js';

describe('toNoteResponse', () => {
  it('maps the stored note to the response', () => {
    const note = {
      id: 'abc123',
      title: 'Intro',
      detail: 'A starting note.',
    } as Pick<Note, 'id' | 'title' | 'detail'>;

    expect(toNoteResponse(note)).toEqual({
      id: 'abc123',
      title: 'Intro',
      detail: 'A starting note.',
    });
  });
});
