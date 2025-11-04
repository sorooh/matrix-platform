const os = require('os');

describe('smoke', () => {
  test('node environment sanity', () => {
    // Basic runtime check to reduce noisy CI failures
    expect(typeof os.arch()).toBe('string');
  });
});
