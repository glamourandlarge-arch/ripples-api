import { ApiResponse } from './api-response.js';

describe('ApiResponse', () => {
  it('builds a success envelope', () => {
    expect(ApiResponse.success({ id: 1 }, 'User fetched', 200)).toEqual({
      statusCode: 200,
      body: {
        status: true,
        message: 'User fetched',
        data: { id: 1 },
      },
    });
  });

  it('builds an error envelope with error_code for server failures', () => {
    expect(
      ApiResponse.error('Boom', null, null, 500),
    ).toEqual({
      statusCode: 500,
      body: {
        status: false,
        message: 'Boom',
        data: null,
        errors: null,
        error_code: 500,
      },
    });
  });

  it('detects envelopes and message/data payloads', () => {
    expect(
      ApiResponse.isEnvelope({ status: true, message: 'ok', data: null }),
    ).toBe(true);
    expect(ApiResponse.isEnvelope({ status: 'ok' })).toBe(false);
    expect(
      ApiResponse.isMessageData({ message: 'ok', data: { id: 1 } }),
    ).toBe(true);
    expect(
      ApiResponse.isMessageData({
        status: true,
        message: 'ok',
        data: { id: 1 },
      }),
    ).toBe(false);
  });
});
